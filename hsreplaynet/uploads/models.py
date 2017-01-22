import base64
import json
import os
import re
import time
from uuid import uuid4
from botocore.vendored.requests.packages.urllib3.exceptions import ReadTimeoutError
from django.utils import timezone
from datetime import datetime, timedelta
from enum import IntEnum
from django.conf import settings
from django.db import models
from django.dispatch.dispatcher import receiver
from django.urls import reverse
from django_intenum import IntEnumField
from hsreplaynet.utils.fields import ShortUUIDField
from hsreplaynet.utils import aws, log
from hsreplaynet.utils.aws import streams
from sqlalchemy import create_engine, MetaData
from sqlalchemy.sql import func, select, not_
from sqlalchemy.orm import sessionmaker
from hsredshift.etl.models import list_staging_eligible_tables, create_staging_table


def get_redshift_engine():
	return create_engine(settings.REDSHIFT_CONNECTION)


_md_cache = {}


def get_redshift_metadata():
	if "md" not in _md_cache:
		md = MetaData()
		md.reflect(get_redshift_engine())
		_md_cache["md"] = md
	return _md_cache["md"]


class UploadEventStatus(IntEnum):
	UNKNOWN = 0
	PROCESSING = 1
	SERVER_ERROR = 2
	PARSING_ERROR = 3
	SUCCESS = 4
	UNSUPPORTED = 5
	VALIDATION_ERROR = 6
	VALIDATING = 7
	UNSUPPORTED_CLIENT = 8
	PENDING = 9

	@classmethod
	def processing_statuses(cls):
		return [
			cls.PENDING,
			cls.PROCESSING,
			cls.VALIDATING,
		]


class RawUploadState(IntEnum):
	NEW = 0
	HAS_UPLOAD_EVENT = 1


class RawUpload(object):
	"""
	Represents a raw upload in S3.
	"""
	DESCRIPTOR_KEY_PATTERN = r"raw/(?P<ts>[\d/]{16})/(?P<shortid>\w{22})\.descriptor.json"
	RAW_LOG_KEY_PATTERN = r"raw/(?P<ts>[\d/]{16})/(?P<shortid>\w{22})\.\w{5,6}.log"
	HAS_UPLOAD_KEY_PATTERN = r"uploads/(?P<ts>[\d/]{16})/(?P<shortid>\w{22})\.power.log"
	TIMESTAMP_FORMAT = "%Y/%m/%d/%H/%M"

	def __init__(self, bucket, key):
		self.bucket = bucket
		self._log_key = key
		self._upload_event = None

		if key.startswith("raw"):
			self._state = RawUploadState.NEW

			match = re.match(RawUpload.RAW_LOG_KEY_PATTERN, key)
			if not match:
				raise ValueError("Failed to extract shortid and timestamp from key.")

			fields = match.groupdict()
			self._shortid = fields["shortid"]
			self._timestamp = datetime.strptime(fields["ts"], RawUpload.TIMESTAMP_FORMAT)

			self._descriptor_key = self._create_raw_descriptor_key(fields["ts"], fields["shortid"])

		elif key.startswith("uploads"):
			self._state = RawUploadState.HAS_UPLOAD_EVENT

			match = re.match(RawUpload.HAS_UPLOAD_KEY_PATTERN, key)
			if not match:
				raise ValueError("Failed to extract shortid and timestamp from key.")

			fields = match.groupdict()
			self._shortid = fields["shortid"]
			self._timestamp = datetime.strptime(fields["ts"], RawUpload.TIMESTAMP_FORMAT)

			self._upload_event = UploadEvent.objects.get(shortid=self._shortid)
			self._descriptor_key = str(self._upload_event.descriptor)

		else:
			raise NotImplementedError("__init__ is not supported for key pattern: %s" % key)

		self._upload_event_log_bucket = None
		self._upload_event_log_key = None
		self._upload_event_descriptor_key = None
		self._upload_event_location_populated = False

		# These are loaded lazily from S3
		self._descriptor = None

		# If this is changed to True before this RawUpload is sent to a kinesis stream
		# Then the kinesis lambda will attempt to reprocess instead of exiting early
		self.attempt_reprocessing = False

	def __repr__(self):
		return "<RawUpload %s:%s:%s>" % (self.shortid, self.bucket, self.log_key)

	def _create_raw_descriptor_key(self, ts_string, shortid):
		return "raw/%s/%s.descriptor.json" % (ts_string, shortid)

	def prepare_upload_event_log_location(self, bucket, key):
		self._upload_event_log_bucket = bucket
		self._upload_event_log_key = key

		if key != self.log_key:
			copy_source = "%s/%s" % (self.bucket, self.log_key)
			log.debug("Copying power.log %r to %r:%r" % (copy_source, bucket, key))
			aws.S3.copy_object(Bucket=bucket, Key=key, CopySource=copy_source)

		self._upload_event_location_populated = True

	def delete(self):
		# We only perform delete on NEW raw uploads because when we get to this point we have
		# a copy of the log and descriptor attached to the UploadEvent
		if self.state == RawUploadState.NEW:
			log.debug("Deleting files from S3")
			aws.S3.delete_object(Bucket=self.bucket, Key=self.log_key)
			aws.S3.delete_object(Bucket=self.bucket, Key=self.descriptor_key)

	@staticmethod
	def from_s3_event(event):
		bucket = event["bucket"]["name"]
		key = event["object"]["key"]

		return RawUpload(bucket, key)

	@staticmethod
	def from_upload_event(event):
		bucket = settings.AWS_STORAGE_BUCKET_NAME
		log_key = str(event.file)

		return RawUpload(bucket, log_key)

	@staticmethod
	def from_kinesis_event(kinesis_event):
		# Kinesis returns the record bytes data base64 encoded
		payload = base64.b64decode(kinesis_event["data"])
		json_str = payload.decode("utf8")
		data = json.loads(json_str)

		result = RawUpload(data["bucket"], data["log_key"])

		if "attempt_reprocessing" in data:
			result.attempt_reprocessing = data["attempt_reprocessing"]

		return result

	@property
	def kinesis_data(self):
		data = {
			"bucket": self.bucket,
			"log_key": self.log_key,
			"attempt_reprocessing": self.attempt_reprocessing
		}
		json_str = json.dumps(data)
		payload = json_str.encode("utf8")
		# Kinesis will base64 encode the payload bytes for us.
		# However, when we read the record back we will have to decode from base64 ourselves
		return payload

	@property
	def kinesis_partition_key(self):
		# The partition key is also used as the tracing ID
		return self.shortid

	@property
	def state(self):
		return self._state

	@property
	def log_key(self):
		return self._log_key

	@property
	def log_url(self):
		return self._signed_url_for(self._log_key)

	@property
	def descriptor_key(self):
		return self._descriptor_key

	@property
	def descriptor_url(self):
		return self._signed_url_for(self._descriptor_key)

	@property
	def descriptor(self):
		if self._descriptor is None:
			self._descriptor = self._get_object(self._descriptor_key)

		return self._descriptor

	def _get_object(self, key):
		obj = aws.S3.get_object(Bucket=self.bucket, Key=key)
		return json.loads(obj["Body"].read().decode("utf8"))

	def _signed_url_for(self, key):
		return aws.S3.generate_presigned_url(
			"get_object",
			Params={
				"Bucket": self.bucket,
				"Key": key
			},
			ExpiresIn=60 * 60 * 24,
			HttpMethod="GET"
		)

	@property
	def shortid(self):
		return self._shortid

	@property
	def timestamp(self):
		return self._timestamp


def _generate_upload_path(instance, filename):
	return _generate_upload_key(instance.created, instance.shortid, "power.log")


def _generate_descriptor_path(instance, filename):
	return _generate_upload_key(instance.created, instance.shortid, "descriptor.json")


def _generate_upload_key(ts, shortid, suffix="power.log"):
	# This timestamp in the key path is where we are capturing when
	# the log was uploaded to S3
	timestamp = ts.strftime("%Y/%m/%d/%H/%M")
	return "uploads/%s/%s.%s" % (timestamp, shortid, suffix)


class UploadEvent(models.Model):
	"""
	Represents a game upload, before the creation of the game itself.

	The metadata captured is what was provided by the uploader.
	The raw logs have not yet been parsed for validity.
	"""
	id = models.BigAutoField(primary_key=True)
	shortid = ShortUUIDField("Short ID")
	token_uuid = models.UUIDField(null=True, blank=True, db_column="token_id")
	api_key_id = models.IntegerField(null=True, blank=True, db_column="api_key_id")
	game_id = models.BigIntegerField(null=True, blank=True, db_column="game_id")
	created = models.DateTimeField(auto_now_add=True, db_index=True)
	upload_ip = models.GenericIPAddressField(null=True)
	status = IntEnumField(enum=UploadEventStatus, default=UploadEventStatus.UNKNOWN)
	tainted = models.BooleanField(default=False)
	error = models.TextField(blank=True)
	traceback = models.TextField(blank=True)
	test_data = models.BooleanField(default=False)
	canary = models.BooleanField(default=False)

	metadata = models.TextField(blank=True)
	file = models.FileField(upload_to=_generate_upload_path, null=True)
	descriptor = models.FileField(upload_to=_generate_descriptor_path, blank=True, null=True)
	descriptor_data = models.TextField(blank=True)
	user_agent = models.CharField(max_length=100, blank=True)
	log_stream_name = models.CharField(max_length=64, blank=True)
	log_group_name = models.CharField(max_length=64, blank=True)
	updated = models.DateTimeField(auto_now=True)

	@property
	def log_upload_date(self):
		raw_upload = RawUpload.from_upload_event(self)
		return raw_upload.timestamp

	@property
	def token(self):
		if not hasattr(self, "_token"):
			from hsreplaynet.api.models import AuthToken
			if self.token_uuid:
				self._token = AuthToken.objects.get(key=self.token_uuid)
			else:
				self._token = None

		return self._token

	@token.setter
	def token(self, auth_token):
		if auth_token:
			self._token = auth_token
			self.token_uuid = auth_token.key

	@property
	def api_key(self):
		if not hasattr(self, "_api_key"):
			from hsreplaynet.api.models import APIKey
			if self.api_key_id:
				self._api_key = APIKey.objects.get(id=self.api_key_id)
			else:
				self._api_key = None

		return self._api_key

	@api_key.setter
	def api_key(self, key):
		if key:
			self._api_key = key
			self.api_key_id = key.id

	@property
	def game(self):
		if not hasattr(self, "_game"):
			from hsreplaynet.games.models import GameReplay
			if self.game_id:
				self._game = GameReplay.objects.get(id=self.game_id)
			else:
				self._game = None

		return self._game

	@game.setter
	def game(self, g):
		if g:
			self._game = g
			self.game_id = g.id

	def __str__(self):
		return self.shortid

	@property
	def cloudwatch_url(self):
		baseurl = "https://console.aws.amazon.com/cloudwatch/home"
		tpl = "?region=%s#logEventViewer:group=%s;stream=%s;start=%s;end=%s;tz=UTC"
		start = self.updated
		end = start + timedelta(minutes=3)
		return baseurl + tpl % (
			os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
			self.log_group_name,
			self.log_stream_name,
			start.strftime("%Y-%m-%dT%H:%M:%SZ"),
			end.strftime("%Y-%m-%dT%H:%M:%SZ")
		)

	@property
	def is_processing(self):
		return self.status in UploadEventStatus.processing_statuses()

	def get_absolute_url(self):
		return reverse("upload_detail", kwargs={"shortid": self.shortid})

	def log_bytes(self):
		try:
			self.file.open(mode="rb")
			return self.file.read()
		except ReadTimeoutError:
			# We wait one second and then give it a second attempt before we fail
			time.sleep(1)
			self.file.open(mode="rb")
			return self.file.read()

	def process(self):
		from hsreplaynet.games.processing import process_upload_event

		process_upload_event(self)


@receiver(models.signals.post_delete, sender=UploadEvent)
def cleanup_uploaded_log_file(sender, instance, **kwargs):
	from hsreplaynet.utils import delete_file_async

	file = instance.file
	if file.name:
		delete_file_async(file.name)

	descriptor = instance.descriptor
	if descriptor.name:
		delete_file_async(descriptor.name)


class RedshiftStagingTrackManager(models.Manager):

	def get_active_track_prefix(self):
		# This will be called by each lambda
		# And provided when initializing the RedshiftExporter
		active_track = self.get_active_track()
		if active_track:
			return active_track.track_prefix
		else:
			return ""

	def get_active_track(self):
		return RedshiftStagingTrack.objects.filter(
			closed_at__isnull=True,
			active_at__isnull=False
		).order_by("-active_at").first()

	def initialize_first_active_track(self):
		# This should only get called when we are bootstrapping
		# And setting up our first active track.
		# At all other times, there should always be an active track
		track = RedshiftStagingTrack.objects.create(
			track_prefix=self.generate_track_prefix(),
			# This is ONLY immediately set on record create for the initial root track
			active_at=timezone.now()
		)
		track.initialize_tables()
		return track

	def create_successor_for(self, existing_track):
		successor = RedshiftStagingTrack.objects.create(
			predecessor=existing_track,
			track_prefix=self.generate_track_prefix()
		)
		existing_track.successor = successor
		existing_track.save()

		successor.initialize_tables()

		return successor

	def generate_track_prefix(self):
		staging_prefix = "stage"
		track_uuid = str(uuid4())[:2]
		ts = timezone.now().strftime("%d%H%M")
		# prefix = 5 chars
		# ts = 6 chars
		# uuid = 2 chars
		# 3 underscores
		# total_length = 5 + 12 + 4 + 3 = 24 chars
		return "%s_%s_%s_" % (staging_prefix, ts, track_uuid)

	def get_insert_ready_track(self):
		# If a track has been recently closed but the records have not been
		# Transferred to the production tables yet AND it is outside
		# The minimum quiescence period, then it is considered insert_ready

		# There should only ever bet at most 1 of these, or something has
		# broken down with the system.
		candidates = RedshiftStagingTrack.objects.filter(
			closed_at__isnull=False,
			insert_started_at__isnull=True
		).all()

		if len(candidates) > 1:
			raise RuntimeError("More than one fully staged track exists.")
		elif len(candidates) == 1:
			candidate = candidates[0]
			# The candidate could still be in it's quiescence period
			if candidate.is_able_to_insert:
				return candidate
			else:
				return None
		else:
			return None

	def get_analyze_ready_track(self):
		candidates = RedshiftStagingTrack.objects.filter(
			insert_ended_at__isnull=False,
			analyze_started_at__isnull=True
		).all()

		if len(candidates) > 1:
			raise RuntimeError("More than one analyze ready track exists.")
		elif len(candidates) == 1:
			return candidates[0]
		else:
			return None

	def get_vacuum_ready_track(self):
		candidates = RedshiftStagingTrack.objects.filter(
			analyze_ended_at__isnull=False,
			vacuum_ended_at__isnull=True
		).all()

		if len(candidates) > 1:
			raise RuntimeError("More than one vacuum ready track exists.")
		elif len(candidates) == 1:
			return candidates[0]
		else:
			return None

	def get_cleanup_ready_track(self):
		candidates = RedshiftStagingTrack.objects.filter(
			vacuum_ended_at__isnull=False,
			track_cleanup_at__isnull=True
		).all()

		if len(candidates) > 1:
			raise RuntimeError("More than one cleanup ready track exists.")
		elif len(candidates) == 1:
			return candidates[0]
		else:
			return None


class RedshiftStagingTrack(models.Model):
	"""
	Represents a collection of staging tables intended for micro-batch loading into Redshift.
	"""
	id = models.BigAutoField(primary_key=True)
	objects = RedshiftStagingTrackManager()
	predecessor = models.ForeignKey(
		"self",
		null=True,
		on_delete=models.SET_NULL,
		related_name="+"
	)
	successor = models.ForeignKey(
		"self",
		null=True,
		on_delete=models.SET_NULL,
		related_name="+"
	)
	track_prefix = models.CharField("Track Prefix", max_length=100)
	created = models.DateTimeField(auto_now_add=True)
	# firehose_streams_are_ready = models.BooleanField(default=False)
	active_at = models.DateTimeField(null=True, db_index=True)
	closed_at = models.DateTimeField(null=True, db_index=True)
	insert_started_at = models.DateTimeField(null=True)
	insert_ended_at = models.DateTimeField(null=True)
	analyze_started_at = models.DateTimeField(null=True)
	analyze_ended_at = models.DateTimeField(null=True)
	vacuum_started_at = models.DateTimeField(null=True)
	vacuum_ended_at = models.DateTimeField(null=True)
	track_cleanup_at = models.DateTimeField(null=True)

	@property
	def activate_duration_minutes(self):
		current_timestamp = timezone.now()
		duration = current_timestamp - self.active_at
		return duration.seconds / 60

	@property
	def track_should_close(self):
		target_active_duration = settings.REDSHIFT_ETL_TRACK_TARGET_ACTIVE_DURATION_MINUTES
		return self.activate_duration_minutes >= target_active_duration

	@property
	def successor_is_ready(self):
		if self.successor and self.successor.firehose_streams_are_active:
			return True

		return False

	@property
	def is_ready_to_become_active(self):
		has_child_tables = self.tables.count() > 0
		child_streams_are_active = self.firehose_streams_are_active
		predecessor_can_close = self.predecessor.is_able_to_close
		return has_child_tables and child_streams_are_active and predecessor_can_close

	@property
	def is_active(self):
		return self.closed_at is None

	@property
	def firehose_streams_are_active(self):
		return all(map(lambda t: t.firehose_stream_is_active, self.tables.all()))

	@property
	def is_able_to_close(self):
		# We cannot close an active track
		# If that track's predecessor's records have still not been transfered
		# We must finish transfering a previously closed track's records
		# Before we attempt to close another track.

		if not self.predecessor:
			# The initial active_track will not have a predecessor
			return True

		return self.predecessor.is_complete

	@property
	def is_able_to_insert(self):
		is_closed = self.closed_at is not None
		is_not_inserted = self.insert_started_at is None
		is_not_in_quiescence = not self.is_in_quiescence

		return is_closed and is_not_inserted and is_not_in_quiescence

	@property
	def is_in_quiescence(self):
		# We require that a track wait a minimum amount of time before inserting the records
		# To insure that any straggling records in Firehose have been flushed to the table
		time_since_close = timezone.now() - self.closed_at
		min_wait = settings.REDSHIFT_ETL_CLOSED_TRACK_MINIMUM_QUIESCENCE_SECONDS
		return time_since_close.seconds <= min_wait

	@property
	def is_able_to_analyze(self):
		return self.insert_ended_at is not None

	@property
	def is_able_to_vacuum(self):
		return self.analyze_ended_at is not None

	@property
	def is_able_to_cleanup(self):
		return self.vacuum_ended_at is not None

	@property
	def is_complete(self):
		# This should return True once all records have been transfered
		# To the production tables, and the firehose streams have been destroyed
		return self.track_cleanup_at is not None

	@property
	def is_able_to_initialize_successor(self):
		# We can only have so many tracks at the same time do to
		# Firehose limits so check to make sure we aren't exceeding that.
		initialized_tracks = RedshiftStagingTrack.objects.filter(
			track_cleanup_at__isnull=True
		).count()
		concurrent_limit = settings.REDSHIFT_ETL_CONCURRENT_TRACK_LIMIT
		return initialized_tracks < concurrent_limit

	def initialize_successor(self):
		if not self.is_able_to_initialize_successor:
			raise RuntimeError("At Concurrent Track Limit. Cannot initialize another track.")

		if self.successor:
			raise RuntimeError("Successor already exists")

		return RedshiftStagingTrack.objects.create_successor_for(self)

	def initialize_tables(self):
		if self.tables.count() > 0:
			raise RuntimeError("Tables already initialized.")

		for table in list_staging_eligible_tables():
			RedshiftStagingTrackTable.objects.create_table_for_track(
				table,
				self
			)

	def make_active(self):
		if self.active_at is not None:
			raise RuntimeError("This track is already active")

		if not self.firehose_streams_are_active:
			raise RuntimeError("Firehose streams are not active")

		current_timestamp = timezone.now()
		self.active_at = current_timestamp
		self.save()

		self.predecessor.closed_at = current_timestamp
		self.predecessor.save()

		return current_timestamp

	def do_insert_staged_records(self):
		if not self.is_able_to_insert:
			raise RuntimeError(
				"Cannot insert records for a track that is not ready"
			)

		self.insert_started_at = timezone.now()
		self.save()

		for table in self.tables.all():
			table.do_insert_staged_records()

		self.insert_ended_at = timezone.now()
		self.save()

	def do_analyze(self):
		self.analyze_started_at = timezone.now()
		self.save()

		for table in self.tables.all():
			table.do_analyze()

		self.analyze_ended_at = timezone.now()
		self.save()

	def do_vacuum(self):
		self.vacuum_started_at = timezone.now()
		self.save()

		for table in self.tables.all():
			table.do_vacuum()

		self.vacuum_ended_at = timezone.now()
		self.save()

	def do_cleanup(self):

		for table in self.tables.all():
			table.do_cleanup()

		self.track_cleanup_at = timezone.now()
		self.save()


class RedshiftStagingTrackTableManager(models.Manager):

	def create_table_for_track(self, table, track):

		# Create the staging table in redshift
		staging_table = create_staging_table(
			table,
			track.track_prefix,
			get_redshift_engine()
		)

		# Create the firehose stream
		streams.create_firehose_stream(
			staging_table.name,
			staging_table.name
		)

		# Create the record once we know the table and stream creation didn't error
		track_table = RedshiftStagingTrackTable.objects.create(
			track=track,
			target_table=table.name,
			staging_table=staging_table.name,
			firehose_stream=staging_table.name,
		)

		return track_table


class RedshiftStagingTrackTable(models.Model):
	"""
	Represents a single staging table that is part of a micro-batch loading track.
	"""
	id = models.BigAutoField(primary_key=True)
	objects = RedshiftStagingTrackTableManager()
	track = models.ForeignKey(
		RedshiftStagingTrack,
		on_delete=models.CASCADE,
		related_name="tables"
	)
	staging_table = models.CharField("Staging Table", max_length=100)
	target_table = models.CharField("Target Table", max_length=100)
	firehose_stream = models.CharField("Firehose Stream", max_length=100)
	final_staging_table_size = models.IntegerField(null=True)
	insert_count = models.IntegerField(null=True)
	insert_duration_seconds = models.IntegerField(null=True)

	class Meta:
		unique_together = ("track", "target_table")

	@property
	def firehose_stream_is_active(self):
		description = streams.get_delivery_stream_description(self.firehose_stream)
		return description['DeliveryStreamStatus'] == 'ACTIVE'

	def _get_table_obj(self):
		return get_redshift_metadata().tables[self.staging_table]

	def _get_target_table_obj(self):
		return get_redshift_metadata().tables[self.target_table]

	def _get_insert_stmt(self, min_date, max_date):
		target_table_obj = self._get_target_table_obj()
		staging_table_obj = self._get_table_obj()

		pre_existing_records = select(
			[target_table_obj.c.id]
		).select_from(target_table_obj).where(
			target_table_obj.c.game_date.between(min_date, max_date)
		)

		record_select = staging_table_obj.select().where(
			not_(staging_table_obj.c.id.in_(pre_existing_records))
		)

		stmt = target_table_obj.insert().from_select(
			target_table_obj.columns,
			record_select
		)

		return stmt

	def do_analyze(self):
		self._do_analyze_on_target(self.target_table)

	def _do_analyze_on_target(self, target):
		session = sessionmaker(bind=get_redshift_engine())()
		# We cannot be within a transaction when we ANALYZE
		session.connection().connection.set_isolation_level(0)
		sql = "ANALYZE %s;" % target
		session.execute(sql)

	def do_vacuum(self):
		session = sessionmaker(bind=get_redshift_engine())()
		# We cannot be within a transaction when we VACUUUM
		session.connection().connection.set_isolation_level(0)
		sql = "VACUUM FULL %s TO 100 PERCENT;" % self.target_table
		session.execute(sql)

	def do_insert_staged_records(self):
		"""
		The basic de-duplicating insert pattern is as follows:

		SELECT
			MIN(game_date) AS min_game_date,
			MAX(game_date) AS max_game_date
		FROM stagingTableForLoad;

		INSERT INTO productionTable
		SELECT * FROM stagingTableForLoad
		WHERE id NOT IN (
			SELECT id
			FROM productionTable
			WHERE game_date BETWEEN min_game_date AND max_game_date
		)

		For additional details, please see:
		http://engineering.curalate.com/2016/08/04/tips-for-starting-with-redshift.html
		"""
		self.record_final_staging_table_size()

		min_game_date, max_game_date = self.get_min_max_game_dates_from_staging_table()
		insert_stmt = self._get_insert_stmt(min_game_date, max_game_date)

		self._do_analyze_on_target(self.staging_table)

		start_time = time.time()
		result = get_redshift_engine().execute(insert_stmt)
		end_time = time.time()

		self.insert_count = result.rowcount
		self.insert_duration_seconds = round(end_time - start_time)
		self.save()

	def _get_staging_table_size_stmt(self):
		return select([func.count()]).select_from(self._get_table_obj())

	def _get_final_staging_table_size(self):
		stmt = self._get_staging_table_size_stmt()
		compiled_statement = stmt.compile(bind=get_redshift_engine())

		rp = compiled_statement.execute()
		first_row = rp.first()
		return first_row[0]

	def record_final_staging_table_size(self):
		self.final_staging_table_size = self._get_final_staging_table_size()
		self.save()
		return self.final_staging_table_size

	def _get_min_max_game_dates_stmt(self):
		tbl = self._get_table_obj()
		cols = [func.min(tbl.c.game_date), func.max(tbl.c.game_date)]
		return select(cols).select_from(tbl)

	def get_min_max_game_dates_from_staging_table(self):
		stmt = self._get_min_max_game_dates_stmt()
		compiled_statement = stmt.compile(bind=get_redshift_engine())

		rp = compiled_statement.execute()
		first_row = rp.first()
		if first_row:
			return first_row[0], first_row[1]
		else:
			raise RuntimeError("Could not get min and max game_date from staging table")

	def do_cleanup(self):
		from hsreplaynet.utils.instrumentation import error_handler
		try:
			streams.delete_firehose_stream(self.firehose_stream)
		except Exception as e:
			error_handler(e)

		try:
			self._get_table_obj().drop(bind=get_redshift_engine())
		except Exception as e:
			error_handler(e)
