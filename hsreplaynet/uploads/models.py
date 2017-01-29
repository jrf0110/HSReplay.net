import base64
import json
import os
import re
import time
from threading import Thread
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
from hsreplaynet.utils.influx import influx_timer
from sqlalchemy import create_engine, MetaData
from sqlalchemy.sql import func, select
from hsredshift.etl.models import list_staging_eligible_tables, create_staging_table
from hsredshift.etl.views import (
	get_materialized_view_list, get_materialized_view_update_statement
)
from psycopg2 import DatabaseError


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
		return timezone.make_aware(raw_upload.timestamp)

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

	def get_admin_url(self):
		return reverse(
			'admin:%s_%s_change' % (self._meta.app_label, self._meta.model_name),
			args=[self.id]
		)

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


class RedshiftETLStage(IntEnum):
	ERROR = 0
	CREATED = 1
	INITIALIZING = 2
	INITIALIZED = 3
	ACTIVE = 4
	# Recently closed tracks go into quiescence until Firehose is fully flushed
	IN_QUIESCENCE = 5
	READY_TO_LOAD = 6
	GATHERING_STATS = 7
	GATHERING_STATS_COMPLETE = 8
	DEDUPLICATING = 9
	DEDUPLICATION_COMPLETE = 10
	INSERTING = 11
	INSERT_COMPLETE = 12
	REFRESHING_MATERIALIZED_VIEWS = 13
	REFRESHING_MATERIALIZED_VIEWS_COMPLETE = 14
	VACUUMING = 15
	VACUUM_COMPLETE = 16
	ANALYZING = 17
	ANALYZE_COMPLETE = 18
	CLEANING_UP = 19
	FINISHED = 20


class RedshiftStagingTrackManager(models.Manager):

	def do_maintenance(self):
		log.info("Starting Redshift ETL Maintenance Cycle")

		with influx_timer("redshift_etl_task_generation_duration"):
			tasks = RedshiftStagingTrack.objects.get_ready_maintenance_tasks()

		if tasks:
			for task in tasks:
				log.info("Next Task: %s" % str(task))
				with influx_timer("redshift_etl_task_invocation", task=str(task)):
					task()
				log.info("Complete.")

		log.info("Maintenance Cycle Complete")

	def get_ready_maintenance_tasks(self):
		"""
		Return a list of callables that will each be invoked in sequence by the lambda.
		Each one must return within several several seconds
		to ensure the lambda finishes within 5 min.

		We attempt to generate tasks in reverse of the tracks normal lifecycle in order
		to advance any in flight tracks to completion before initializing new tracks
		"""
		# The state of tracks in the uploads-db might be stale
		# Since long running queries kicked off against the cluster may have completed.
		operation_in_progress, operation_name, prefix = self.refresh_track_states()

		if operation_in_progress:
			log.info("%s is still %s" % (prefix, str(operation_name)))
			log.info("Will check for additional unstarted tasks")
			if operation_name == RedshiftETLStage.GATHERING_STATS:
				return self.attempt_continue_gathering_stats_tasks()
			elif operation_name == RedshiftETLStage.VACUUMING:
				return self.attempt_continue_vacuum_tasks()
			elif operation_name == RedshiftETLStage.ANALYZING:
				return self.attempt_continue_analyzing_tasks()
			elif operation_name == RedshiftETLStage.INSERTING:
				return self.attempt_continue_inserting_tasks()
			elif operation_name == RedshiftETLStage.DEDUPLICATING:
				return self.attempt_continue_deduplicating_tasks()
			elif operation_name == RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS:
				return self.attempt_continue_refreshing_views_tasks()
			else:
				log.info("Will wait until it has completed to initiate new tasks")
				return []

		# If we reach here then we know that we don't have any long running
		# operations in flight on the cluster.

		cleanup_tasks = self.get_cleanup_tasks()
		if cleanup_tasks:
			log.info("Found %s cleanup tasks" % str(len(cleanup_tasks)))
			return cleanup_tasks

		analyze_tasks = self.get_analyze_tasks()
		if analyze_tasks:
			log.info("Found %s analyze tasks" % str(len(analyze_tasks)))
			return analyze_tasks

		vacuum_tasks = self.get_vacuum_tasks()
		if vacuum_tasks:
			log.info("Found %s vacuum tasks" % str(len(vacuum_tasks)))
			return vacuum_tasks

		refresh_view_tasks = self.get_refresh_view_tasks()
		if refresh_view_tasks:
			log.info("Found %s refresh view tasks" % str(len(refresh_view_tasks)))
			return refresh_view_tasks

		insert_tasks = self.get_insert_tasks()
		if insert_tasks:
			log.info("Found %s insert tasks" % str(len(insert_tasks)))
			return insert_tasks

		deduplication_tasks = self.get_deduplication_tasks()
		if deduplication_tasks:
			log.info("Found %s deduplication tasks" % str(len(deduplication_tasks)))
			return deduplication_tasks

		gathering_stats_tasks = self.get_gathering_stats_tasks()
		if gathering_stats_tasks:
			log.info("Found %s gathering stats tasks" % str(len(gathering_stats_tasks)))
			return gathering_stats_tasks

		# Tack lifecycle tasks include initializing new tracks
		# And closing active tracks
		track_lifecycle_tasks = self.get_track_lifecycle_tasks()
		if track_lifecycle_tasks:
			log.info("Found %s track lifecycle tasks" % str(len(track_lifecycle_tasks)))
			return track_lifecycle_tasks

		# Nothing to do, so return empty list
		return []

	def refresh_track_states(self):
		unfinished_tracks = RedshiftStagingTrack.objects.exclude(
			stage__in=(RedshiftETLStage.ERROR, RedshiftETLStage.FINISHED)
		).all()

		if unfinished_tracks:
			for unfinished_track in unfinished_tracks:
				in_progress, name = unfinished_track.refresh_track_state()
				if in_progress:
					return in_progress, name, unfinished_track.track_prefix

		return False, None, None

	def get_cleanup_tasks(self):

		track_for_cleanup = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.ANALYZE_COMPLETE,
		).first()

		if track_for_cleanup:
			track_for_cleanup.stage = RedshiftETLStage.CLEANING_UP
			track_for_cleanup.track_cleanup_start_at = timezone.now()
			track_for_cleanup.save()
			return track_for_cleanup.get_cleanup_tasks()

	def get_analyze_tasks(self):
		track_for_analyze = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.VACUUM_COMPLETE,
		).first()

		if track_for_analyze:
			track_for_analyze.stage = RedshiftETLStage.ANALYZING
			track_for_analyze.analyze_started_at = timezone.now()
			track_for_analyze.save()
			return track_for_analyze.get_analyze_tasks()

	def get_refresh_view_tasks(self):
		track_for_refresh = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.INSERT_COMPLETE,
		).first()

		if track_for_refresh:
			track_for_refresh.stage = RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS
			track_for_refresh.refreshing_view_start_at = timezone.now()
			track_for_refresh.save()
			return track_for_refresh.get_refresh_view_tasks()

	def get_vacuum_tasks(self):
		track_for_vacuum = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE,
		).first()

		if track_for_vacuum:
			track_for_vacuum.stage = RedshiftETLStage.VACUUMING
			track_for_vacuum.vacuum_started_at = timezone.now()
			track_for_vacuum.save()
			return track_for_vacuum.get_vacuum_tasks()

	def attempt_continue_refreshing_views_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS
		).first()

		if track_for_continue:
			return track_for_continue.get_refresh_view_tasks()

	def attempt_continue_deduplicating_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.DEDUPLICATING
		).first()

		if track_for_continue:
			return track_for_continue.get_deduplication_tasks()

	def attempt_continue_inserting_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.INSERTING
		).first()

		if track_for_continue:
			return track_for_continue.get_insert_tasks()

	def attempt_continue_analyzing_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.ANALYZING
		).first()

		if track_for_continue:
			return track_for_continue.get_analyze_tasks()

	def attempt_continue_gathering_stats_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.GATHERING_STATS,
		).first()

		if track_for_continue:
			return track_for_continue.get_gathering_stats_tasks()

	def attempt_continue_vacuum_tasks(self):
		track_for_continue = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.VACUUMING,
		).first()

		if track_for_continue:
			return track_for_continue.attempt_get_next_vacuum_task()

	def get_insert_tasks(self):
		track = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.DEDUPLICATION_COMPLETE,
		).first()

		if track:
			track.stage = RedshiftETLStage.INSERTING
			track.insert_started_at = timezone.now()
			track.save()
			return track.get_insert_tasks()

	def get_deduplication_tasks(self):
		track = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.GATHERING_STATS_COMPLETE,
		).first()

		if track:
			track.stage = RedshiftETLStage.DEDUPLICATING
			track.deduplicating_started_at = timezone.now()
			track.save()
			return track.get_deduplication_tasks()

	def get_gathering_stats_tasks(self):
		track = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.READY_TO_LOAD,
		).first()

		if track:
			track.stage = RedshiftETLStage.GATHERING_STATS
			track.gathering_stats_started_at = timezone.now()
			track.save()
			return track.get_gathering_stats_tasks()

	def get_track_lifecycle_tasks(self):
		track = RedshiftStagingTrack.objects.filter(
			stage=RedshiftETLStage.ACTIVE,
		).first()

		if track:
			current_duration = track.activate_duration_minutes
			log.info("The active track has been open for %s minutes" % current_duration)
			target_duration = settings.REDSHIFT_ETL_TRACK_TARGET_ACTIVE_DURATION_MINUTES
			log.info("Target active duration minutes is: %s" % target_duration)

			if track.track_should_close:
				log.info("The active track should close.")
				if track.is_able_to_close:
					if not track.successor:
						log.info("No successor yet. One will be initialized.")
						return [track.get_initialize_successor_tasks()]
					else:
						if track.successor.is_ready_to_become_active:
							log.info("The successor is ready to become active.")
							log.info("Will generate a make active task")
							return [track.get_make_active_task()]
						else:
							log.info("The successor is not ready to become active yet.")
							log.info("Will wait until successor is ready.")
				else:
					log.info("The predecessor track is not finished.")
					log.info("Active track will not close until predecessor completes")
			else:
				log.info("The active track is okay. No lifecycle work required")

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

		for table in track.tables.all():
			table.stage = RedshiftETLStage.ACTIVE
		track.stage = RedshiftETLStage.ACTIVE
		track.save()

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
		track_uuid = str(uuid4())[:4]
		return "%s_%s_" % (staging_prefix, track_uuid)

	def get_insert_candidate_track(self):
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
			return candidates[0]
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

		RedshiftStagingTrackTable.objects.filter(

		)

		candidates = RedshiftStagingTrack.objects.filter(
			vacuum_ended_at__isnull=False,
			track_cleanup_start_at__isnull=True
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
	close_requested = models.BooleanField(default=False)
	stage = IntEnumField(enum=RedshiftETLStage, default=RedshiftETLStage.CREATED)

	active_at = models.DateTimeField(null=True, db_index=True)
	closed_at = models.DateTimeField(null=True, db_index=True)
	gathering_stats_started_at = models.DateTimeField(null=True)
	gathering_stats_ended_at = models.DateTimeField(null=True)
	deduplicating_started_at = models.DateTimeField(null=True)
	deduplicating_ended_at = models.DateTimeField(null=True)
	insert_started_at = models.DateTimeField(null=True)
	insert_ended_at = models.DateTimeField(null=True)
	refreshing_view_start_at = models.DateTimeField(null=True)
	refreshing_view_end_at = models.DateTimeField(null=True)
	vacuum_started_at = models.DateTimeField(null=True)
	vacuum_ended_at = models.DateTimeField(null=True)
	analyze_started_at = models.DateTimeField(null=True)
	analyze_ended_at = models.DateTimeField(null=True)
	track_cleanup_start_at = models.DateTimeField(null=True)
	track_cleanup_end_at = models.DateTimeField(null=True)

	@property
	def activate_duration_minutes(self):
		current_timestamp = timezone.now()
		duration = current_timestamp - self.active_at
		return duration.seconds / 60

	@property
	def min_game_date(self):
		min_date = None
		for t in self.tables.all():
			if t.min_game_date and not min_date:
				min_date = t.min_game_date
			if t.min_game_date and min_date and t.min_game_date < min_date:
				min_date = t.min_game_date
		return min_date

	@property
	def max_game_date(self):
		max_date = None
		for t in self.tables.all():
			if t.max_game_date and not max_date:
				max_date = t.max_game_date
			if t.max_game_date and max_date and t.max_game_date > max_date:
				max_date = t.max_game_date
		return max_date

	@property
	def is_in_quiescence(self):
		# We require that a track wait a minimum amount of time before inserting the records
		# To insure that any straggling records in Firehose have been flushed to the table
		min_wait = self.quiescence_duration_minimum
		return self.quiescence_duration_seconds <= min_wait

	@property
	def quiescence_duration_minimum(self):
		return settings.REDSHIFT_ETL_CLOSED_TRACK_MINIMUM_QUIESCENCE_SECONDS

	@property
	def quiescence_duration_seconds(self):
		time_since_close = timezone.now() - self.closed_at
		return time_since_close.seconds

	@property
	def track_should_close(self):
		target_active_duration = settings.REDSHIFT_ETL_TRACK_TARGET_ACTIVE_DURATION_MINUTES
		target_duration_exceeded = self.activate_duration_minutes >= target_active_duration
		return target_duration_exceeded or self.close_requested

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
		return all(
			map(
				lambda t: t.firehose_stream_is_active,
				self.tables.filter(is_materialized_view=False).all()
			)
		)

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
		return self.stage == RedshiftETLStage.FINISHED

	@property
	def is_able_to_initialize_successor(self):
		# We can only have so many tracks at the same time do to
		# Firehose limits so check to make sure we aren't exceeding that.
		initialized_tracks = RedshiftStagingTrack.objects.filter(
			track_cleanup_end_at__isnull=True
		).count()
		concurrent_limit = settings.REDSHIFT_ETL_CONCURRENT_TRACK_LIMIT
		return initialized_tracks < concurrent_limit

	def reset_to_stage(self, stage):
		for table in self.tables.all():
			table.reset_to_stage(stage)

		self.stage = stage

		if int(stage) < int(RedshiftETLStage.CLEANING_UP):
			self.track_cleanup_end_at = None
			self.track_cleanup_start_at = None

		if int(stage) < int(RedshiftETLStage.ANALYZE_COMPLETE):
			self.analyze_started_at = None
			self.analyze_ended_at = None

		if int(stage) < int(RedshiftETLStage.VACUUM_COMPLETE):
			self.vacuum_started_at = None
			self.vacuum_ended_at = None

		if int(stage) < int(RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE):
			self.refreshing_view_start_at = None
			self.refreshing_view_end_at = None

		if int(stage) < int(RedshiftETLStage.INSERT_COMPLETE):
			self.insert_started_at = None
			self.insert_ended_at = None

		if int(stage) < int(RedshiftETLStage.DEDUPLICATION_COMPLETE):
			self.deduplicating_started_at = None
			self.deduplicating_ended_at = None

		if int(stage) < int(RedshiftETLStage.GATHERING_STATS_COMPLETE):
			self.gathering_stats_started_at = None
			self.gathering_stats_ended_at = None

		self.save()

	def refresh_track_state(self):
		if self.stage == RedshiftETLStage.ERROR:
			# We never automatically move a track out of error once it has
			# entered an error stage. This must be done manually.
			raise RuntimeError("Refresh should never get called on errored tracks")

		for table in self.tables.all():
			# If the table previously launched a long running operation
			# This is where we check to see if completed.
			table.refresh_table_state()

		if self._all_tables_are_in_stage(RedshiftETLStage.FINISHED):
			# If all the child tables are finished, then the track is always finished.
			self.stage = RedshiftETLStage.FINISHED
			self.track_cleanup_end_at = timezone.now()
			self.save()
			return False, None

		if self._any_tables_are_in_stage(RedshiftETLStage.CLEANING_UP):
			# Cleaning up is a synchronous operation.
			# Tables progress through CLEANING_UP to FINISHED within the same task
			# Thus any table discovered stuck in CLEANING_UP has actually errored.
			self.stage = RedshiftETLStage.ERROR
			self.save()
			raise RuntimeError(
				"Track %s has a child table stuck in cleanup" % self.track_prefix
			)

		if self._all_tables_are_in_stage(RedshiftETLStage.ANALYZE_COMPLETE):
			self.stage = RedshiftETLStage.ANALYZE_COMPLETE
			self.analyze_ended_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.ANALYZING:
			return True, RedshiftETLStage.ANALYZING

		if self._all_tables_are_in_stage(RedshiftETLStage.VACUUM_COMPLETE):
			self.stage = RedshiftETLStage.VACUUM_COMPLETE
			self.vacuum_ended_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.VACUUMING:
			return True, RedshiftETLStage.VACUUMING

		views_complete = RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE
		if self._all_tables_are_in_stage(views_complete):
			self.stage = RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE
			self.refreshing_view_end_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS:
			return True, RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS

		if self._all_tables_are_in_stage(RedshiftETLStage.INSERT_COMPLETE):
			self.stage = RedshiftETLStage.INSERT_COMPLETE
			self.insert_ended_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.INSERTING:
			return True, RedshiftETLStage.INSERTING

		if self._all_tables_are_in_stage(RedshiftETLStage.DEDUPLICATION_COMPLETE):
			self.stage = RedshiftETLStage.DEDUPLICATION_COMPLETE
			self.deduplicating_ended_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.DEDUPLICATING:
			return True, RedshiftETLStage.DEDUPLICATING

		if self._all_tables_are_in_stage(RedshiftETLStage.GATHERING_STATS_COMPLETE):
			self.stage = RedshiftETLStage.GATHERING_STATS_COMPLETE
			self.gathering_stats_ended_at = timezone.now()
			self.save()

		if self.stage == RedshiftETLStage.GATHERING_STATS:
			return True, RedshiftETLStage.GATHERING_STATS

		if self.stage == RedshiftETLStage.IN_QUIESCENCE and not self.is_in_quiescence:
			self.stage = RedshiftETLStage.READY_TO_LOAD
			for t in self.tables.all():
				t.stage = RedshiftETLStage.READY_TO_LOAD
				t.save()
			self.save()

		if self.stage == RedshiftETLStage.IN_QUIESCENCE:
			return True, RedshiftETLStage.IN_QUIESCENCE

		return False, None

	def _any_tables_are_in_stage(self, stage):
		return any(map(lambda t: t.stage == stage, self.tables.all()))

	def _all_tables_are_in_stage(self, stage):
		return all(map(lambda t: t.stage == stage, self.tables.all()))

	def initialize_successor(self):
		if not self.is_able_to_initialize_successor:
			raise RuntimeError("At Concurrent Track Limit. Cannot initialize another track.")

		if self.successor:
			raise RuntimeError("Successor already exists")

		return RedshiftStagingTrack.objects.create_successor_for(self)

	def initialize_tables(self):
		if self.tables.count() > 0:
			raise RuntimeError("Tables already initialized.")

		self.stage = RedshiftETLStage.INITIALIZING
		self.save()

		for table in list_staging_eligible_tables():
			RedshiftStagingTrackTable.objects.create_table_for_track(
				table,
				self
			)

		for view in get_materialized_view_list():
			RedshiftStagingTrackTable.objects.create_view_table_for_track(
				view,
				self
			)

		self.stage = RedshiftETLStage.INITIALIZED
		self.save()

	def make_active(self):
		if self.active_at is not None:
			raise RuntimeError("This track is already active")

		if not self.firehose_streams_are_active:
			raise RuntimeError("Firehose streams are not active")

		current_timestamp = timezone.now()
		self.active_at = current_timestamp
		self.stage = RedshiftETLStage.ACTIVE
		for table in self.tables.all():
			table.stage = RedshiftETLStage.ACTIVE
			table.save()
		self.save()

		self.predecessor.closed_at = current_timestamp
		self.predecessor.stage = RedshiftETLStage.IN_QUIESCENCE
		for table in self.predecessor.tables.all():
			table.stage = RedshiftETLStage.IN_QUIESCENCE
			table.save()

		self.predecessor.save()

		return current_timestamp

	def get_tables_for_insert(self, num=None):
		# num is none, all tables will be returned
		uninserted_tables = list(self.tables.filter(
			insert_started_at__isnull=True,
			is_materialized_view=False
		).all())
		target_result_count = max(len(uninserted_tables), num)
		return uninserted_tables[:target_result_count]

	def attempt_get_next_vacuum_task(self):
		if self._any_tables_are_in_stage(RedshiftETLStage.VACUUMING):
			# Don't start any additional vacuums while one is still in flight
			return []
		# If none are in flight then get the next task
		return self.get_vacuum_tasks()

	def get_cleanup_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.ANALYZE_COMPLETE:
				if t.is_materialized_view:
					t.stage = RedshiftETLStage.FINISHED
					t.track_cleanup_start_at = timezone.now()
					t.track_cleanup_end_at = t.track_cleanup_start_at
					t.save()
				else:
					results.append(t.get_cleanup_task())
		return results

	def get_analyze_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.VACUUM_COMPLETE:
				results.append(t.get_analyze_task())
		return results

	def get_vacuum_tasks(self):
		# Vacuuming can only proceed one table at a time.
		for table in self.tables.all():
			if table.stage == RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE:
				return [table.get_vacuum_task()]
		return []

	def get_refresh_view_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.INSERT_COMPLETE:
				if t.is_materialized_view:
					results.append(t.get_refresh_view_task())
				else:
					t.stage = RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE
					t.refreshing_view_start_at = timezone.now()
					t.refreshing_view_end_at = t.refreshing_view_start_at
					t.save()
		return results

	def get_insert_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.DEDUPLICATION_COMPLETE:
				if t.is_materialized_view:
					t.stage = RedshiftETLStage.INSERT_COMPLETE
					t.insert_started_at = timezone.now()
					t.insert_ended_at = t.insert_started_at
					t.save()
				else:
					results.append(t.get_insert_task())
		return results

	def get_deduplication_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.GATHERING_STATS_COMPLETE:
				if t.is_materialized_view:
					t.stage = RedshiftETLStage.DEDUPLICATION_COMPLETE
					t.deduplication_started_at = timezone.now()
					t.deduplication_ended_at = t.deduplication_started_at
					t.save()
				else:
					results.append(t.get_deduplication_task())
		return results

	def get_gathering_stats_tasks(self):
		results = []
		for t in self.tables.all():
			if t.stage == RedshiftETLStage.READY_TO_LOAD:
				if t.is_materialized_view:
					t.stage = RedshiftETLStage.GATHERING_STATS_COMPLETE
					t.gathering_stats_started_at = timezone.now()
					t.gathering_stats_ended_at = t.gathering_stats_started_at
					t.save()
				else:
					results.append(t.get_gathering_stats_task())
		return results

	def get_initialize_successor_tasks(self):
		tmpl = "Initializing successor for track_prefix: %s"
		task_name = tmpl % (self.track_prefix,)
		return RedshiftETLTask(task_name, self.initialize_successor)

	def get_make_active_task(self):
		tmpl = "Making successor %s active and closing track: %s"
		task_name = tmpl % (self.successor.track_prefix, self.track_prefix)
		return RedshiftETLTask(task_name, self.successor.make_active)


class RedshiftStagingTrackTableManager(models.Manager):

	def create_view_table_for_track(self, view, track):

		# Create the record once we know the table and stream creation didn't error
		track_table = RedshiftStagingTrackTable.objects.create(
			track=track,
			target_table=view,
			is_materialized_view=True,
			stage=RedshiftETLStage.INITIALIZED,
		)

		return track_table

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
			stage=RedshiftETLStage.INITIALIZED,
		)

		return track_table


class RedshiftETLTask(object):

	def __init__(self, name, callable):
		self._name = name
		self._callable = callable

	def __str__(self):
		return self._name

	def __call__(self, *args, **kwargs):
		return self._callable(*args, **kwargs)


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
	stage = IntEnumField(enum=RedshiftETLStage, default=RedshiftETLStage.CREATED)
	staging_table = models.CharField("Staging Table", max_length=100)
	target_table = models.CharField("Target Table", max_length=100)
	# Materialized Views don't have staging tables, they just have an update task
	# that gets run after the stage tables are all inserted
	is_materialized_view = models.BooleanField(default=False)
	analyze_query_handle = models.CharField(max_length=15, blank=True)
	vacuum_query_handle = models.CharField(max_length=15, blank=True)
	insert_query_handle = models.CharField(max_length=15, blank=True)
	dedupe_query_handle = models.CharField(max_length=15, blank=True)
	gathering_stats_handle = models.CharField(max_length=15, blank=True)
	refreshing_view_handle = models.CharField(max_length=15, blank=True)
	firehose_stream = models.CharField("Firehose Stream", max_length=100)

	gathering_stats_started_at = models.DateTimeField(null=True)
	gathering_stats_ended_at = models.DateTimeField(null=True)

	final_staging_table_size = models.IntegerField(null=True)
	min_game_date = models.DateField(null=True)
	max_game_date = models.DateField(null=True)

	deduplication_started_at = models.DateTimeField(null=True)
	deduplication_ended_at = models.DateTimeField(null=True)

	insert_started_at = models.DateTimeField(null=True)
	insert_ended_at = models.DateTimeField(null=True)

	vacuum_started_at = models.DateTimeField(null=True)
	vacuum_ended_at = models.DateTimeField(null=True)

	analyze_started_at = models.DateTimeField(null=True)
	analyze_ended_at = models.DateTimeField(null=True)

	refreshing_view_start_at = models.DateTimeField(null=True)
	refreshing_view_end_at = models.DateTimeField(null=True)

	track_cleanup_start_at = models.DateTimeField(null=True)
	track_cleanup_end_at = models.DateTimeField(null=True)

	class Meta:
		unique_together = ("track", "target_table")

	def reset_to_stage(self, stage):
		self.stage = stage

		if int(stage) < int(RedshiftETLStage.CLEANING_UP):
			self.track_cleanup_end_at = None
			self.track_cleanup_start_at = None

		if int(stage) < int(RedshiftETLStage.ANALYZE_COMPLETE):
			self.analyze_started_at = None
			self.analyze_ended_at = None

		if int(stage) < int(RedshiftETLStage.VACUUM_COMPLETE):
			self.vacuum_started_at = None
			self.vacuum_ended_at = None

		if int(stage) < int(RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE):
			self.refreshing_view_start_at = None
			self.refreshing_view_end_at = None

		if int(stage) < int(RedshiftETLStage.INSERT_COMPLETE):
			self.insert_started_at = None
			self.insert_ended_at = None

		if int(stage) < int(RedshiftETLStage.DEDUPLICATION_COMPLETE):
			self.deduplicating_started_at = None
			self.deduplicating_ended_at = None

		if int(stage) < int(RedshiftETLStage.GATHERING_STATS_COMPLETE):
			self.gathering_stats_started_at = None
			self.gathering_stats_ended_at = None

		self.save()

	@property
	def firehose_stream_is_active(self):
		description = streams.get_delivery_stream_description(self.firehose_stream)
		return description['DeliveryStreamStatus'] == 'ACTIVE'

	def _make_async_query_handle(self):
		return str(uuid4())[:15]

	def refresh_table_state(self):
		# If the table previously launched a long running operation
		# Check whether it finished here.
		if self.stage == RedshiftETLStage.ANALYZING:
			self._attempt_update_status_to_stage(
				RedshiftETLStage.ANALYZE_COMPLETE,
				"analyze_ended_at",
				self.analyze_query_handle,
				2
			)

		if self.stage == RedshiftETLStage.VACUUMING:
			# Requires special handling
			self._attempt_update_vacuum_state()

		if self.stage == RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS:
			self._attempt_update_status_to_stage(
				RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS_COMPLETE,
				"refreshing_view_end_at",
				self.refreshing_view_handle
			)

		if self.stage == RedshiftETLStage.INSERTING:
			self._attempt_update_status_to_stage(
				RedshiftETLStage.INSERT_COMPLETE,
				"insert_ended_at",
				self.insert_query_handle
			)

		if self.stage == RedshiftETLStage.DEDUPLICATING:
			self._attempt_update_status_to_stage(
				RedshiftETLStage.DEDUPLICATION_COMPLETE,
				"deduplication_ended_at",
				self.dedupe_query_handle,
				expected_count=3
			)

		if self.stage == RedshiftETLStage.GATHERING_STATS:
			self._attempt_update_status_to_stage(
				RedshiftETLStage.GATHERING_STATS_COMPLETE,
				"gathering_stats_ended_at",
				self.gathering_stats_handle,
				expected_count=3
			)

	def _attempt_update_status_to_stage(self, stage, field, handle, expected_count=1):
		# Use the handle to check the status of the query
		# If the query completed then return the endtime
		# If it's still in flight, then don't do anything.
		finished, ending_timestamp = self._get_query_status_for_handle(
			handle,
			expected_count
		)

		if finished:
			tz_aware_ending_timestamp = timezone.make_aware(ending_timestamp)
			self.stage = stage
			setattr(self, field, tz_aware_ending_timestamp)
			self.save()

	def _attempt_update_vacuum_state(self):
		template = """
			SELECT endtime
			FROM SVL_QLOG q
			JOIN stl_Vacuum v ON v.xid = q.xid
			WHERE q.label = '{handle}'
			AND status = 'Finished'
			ORDER BY endtime DESC
			LIMIT 1;
		"""

		sql = template.format(
			handle=self.vacuum_query_handle,
		)

		engine = get_redshift_engine()
		conn = engine.connect()
		rp1 = conn.execute(sql)

		rows = list(rp1)
		if len(rows) == 1:
			latest_end_date = rows[0][0]
			tz_aware_ending_timestamp = timezone.make_aware(latest_end_date)
			self.stage = RedshiftETLStage.VACUUM_COMPLETE
			self.vacuum_ended_at = tz_aware_ending_timestamp
			self.save()

	def _get_query_status_for_handle(self, handle, expected_count):
		template = """
			SELECT
				endtime
			FROM SVL_QLOG
			WHERE label = '{handle}';
		"""

		sql = template.format(
			handle=handle,
		)

		engine = get_redshift_engine()
		conn = engine.connect()
		rp1 = conn.execute(sql)

		rows = list(rp1)
		if len(rows) > expected_count:
			msg = "Got more than the %s expected results for handle: %s"
			raise RuntimeError(msg % (expected_count, handle))
		elif len(rows) == expected_count:
			latest_end_date = max(r[0] for r in rows)
			return True, latest_end_date
		else:
			return False, None

	def get_refresh_view_task(self):
		task_name = "Refreshing View %s" % self.target_table
		return RedshiftETLTask(task_name, self.do_refresh_view)

	def get_cleanup_task(self):
		task_name = "Cleanup %s" % self.staging_table
		return RedshiftETLTask(task_name, self.do_cleanup)

	def get_analyze_task(self):
		tmpl = "Analyzing %s for track_prefix: %s"
		task_name = tmpl % (self.target_table, self.track.track_prefix)
		return RedshiftETLTask(task_name, self.do_analyze)

	def get_vacuum_task(self):
		tmpl = "Vacuuming %s for track_prefix: %s"
		task_name = tmpl % (self.target_table, self.track.track_prefix)
		return RedshiftETLTask(task_name, self.do_vacuum)

	def get_insert_task(self):
		tmpl = "Inserting %s for track_prefix: %s"
		task_name = tmpl % (self.target_table, self.track.track_prefix)
		return RedshiftETLTask(task_name, self.do_insert_staged_records)

	def get_deduplication_task(self):
		tmpl = "Deduplicating %s for track_prefix: %s"
		task_name = tmpl % (self.target_table, self.track.track_prefix)
		return RedshiftETLTask(task_name, self.do_deduplicate_records)

	def get_gathering_stats_task(self):
		tmpl = "Gathering stats for %s for track_prefix: %s"
		task_name = tmpl % (self.target_table, self.track.track_prefix)
		return RedshiftETLTask(task_name, self.do_gathering_stats)

	def _get_table_obj(self):
		return get_redshift_metadata().tables[self.staging_table]

	def _get_target_table_obj(self):
		return get_redshift_metadata().tables[self.target_table]

	def do_refresh_view(self):
		self.refreshing_view_start_at = timezone.now()
		self.stage = RedshiftETLStage.REFRESHING_MATERIALIZED_VIEWS
		self.refreshing_view_handle = self._make_async_query_handle()
		self.save()

		background_execute = Thread(
			target=self._do_refresh_view_query,
			args=(
				self.target_table,
				self.refreshing_view_handle
			)
		)
		background_execute.daemon = True
		background_execute.start()

		time.sleep(5)

	def do_analyze(self):
		self.analyze_started_at = timezone.now()
		self.stage = RedshiftETLStage.ANALYZING
		self.analyze_query_handle = self._make_async_query_handle()
		self.save()

		# If analyze finishes immediately
		# We can update the stage table immediately as well
		def mark_complete():
			self.analyze_ended_at = timezone.now()
			self.stage = RedshiftETLStage.ANALYZE_COMPLETE
			self.save()

		background_execute = Thread(
			target=self._do_analyze_on_target,
			args=(
				self.target_table,
				self.analyze_query_handle,
				mark_complete
			)
		)
		background_execute.daemon = True
		background_execute.start()

		time.sleep(5)

	def _do_refresh_view_query(self, target, handle):
		try:
			min_date = self.track.min_game_date
			max_date = self.track.max_game_date
			if min_date and max_date:
				sql = get_materialized_view_update_statement(
					target,
					min_date,
					max_date
				)
				engine = get_redshift_engine()
				conn = engine.connect()
				conn.execution_options(isolation_level="AUTOCOMMIT")
				conn.execute("SET QUERY_GROUP TO '%s'" % handle)
				conn.execute(sql)
		except DatabaseError as e:
			if "select() failed" in str(e):
				# This exception is thrown when a background thread
				# that was frozen when the lambda shutdown
				# is restarted and no longer has a connection to the Redshift
				pass
			else:
				raise

	def _do_analyze_on_target(self, target, query_handle, mark_complete):
		try:
			engine = get_redshift_engine()
			conn = engine.connect()
			conn.execution_options(isolation_level="AUTOCOMMIT")
			conn.execute("SET QUERY_GROUP TO '%s'" % query_handle)
			conn.execute("ANALYZE %s;" % target)
			mark_complete()
		except DatabaseError as e:
			if "select() failed" in str(e):
				# This exception is thrown when a background thread
				# that was frozen when the lambda shutdown
				# is restarted and no longer has a connection to the Redshift
				pass
			else:
				raise

	def do_vacuum(self):
		self.vacuum_started_at = timezone.now()
		self.stage = RedshiftETLStage.VACUUMING
		self.vacuum_query_handle = self._make_async_query_handle()
		self.save()

		background_execute = Thread(
			target=self._do_vacuum_on_target,
			args=(
				self.target_table,
				self.vacuum_query_handle
			)
		)
		background_execute.daemon = True

		background_execute.start()

		time.sleep(5)

	def _do_vacuum_on_target(self, target, query_handle):
		try:
			engine = get_redshift_engine()
			conn = engine.connect()
			conn.execution_options(isolation_level="AUTOCOMMIT")
			conn.execute("SET QUERY_GROUP TO '%s';" % query_handle)
			conn.execute("VACUUM FULL %s;" % target)

			self.vacuum_ended_at = timezone.now()
			self.stage = RedshiftETLStage.VACUUM_COMPLETE
			self.save()
		except DatabaseError as e:
			if "select() failed" in str(e):
				# This exception is thrown when a background thread
				# that was frozen when the lambda shutdown
				# is restarted and no longer has a connection to the Redshift
				pass
			else:
				raise

	def do_deduplicate_records(self):
		self.deduplication_started_at = timezone.now()
		self.stage = RedshiftETLStage.DEDUPLICATING
		self.dedupe_query_handle = self._make_async_query_handle()
		self.save()

		table_obj = self._get_table_obj()

		background_execute = Thread(
			target=self._deduplicate_staging_table,
			args=(table_obj,)
		)
		background_execute.daemon = True

		background_execute.start()

		time.sleep(5)

	def do_gathering_stats(self):
		self.gathering_stats_started_at = timezone.now()
		self.stage = RedshiftETLStage.GATHERING_STATS
		self.gathering_stats_handle = self._make_async_query_handle()
		self.save()

		self.get_min_max_game_dates_from_staging_table()
		self.record_final_staging_table_size()

		def mark_complete():
			self.gathering_stats_ended_at = timezone.now()
			self.stage = RedshiftETLStage.GATHERING_STATS_COMPLETE
			self.save()

		background_execute = Thread(
			target=self._do_analyze_on_target,
			args=(
				self.staging_table,
				self.gathering_stats_handle,
				mark_complete
			)
		)
		background_execute.daemon = True

		background_execute.start()

		time.sleep(5)

	def do_insert_staged_records(self):
		"""
		The basic de-duplicating insert pattern is as follows:

		SELECT
			MIN(game_date) AS min_game_date,
			MAX(game_date) AS max_game_date
		FROM stagingTableForLoad;

		DELETE FROM stagingTableForLoad
		USING productionTable
		WHERE productionTable.game_id = stagingTableForLoad.game_id
		AND productionTable.id = stagingTableForLoad.id
		AND productionTable.game_date BETWEEN min_game_date AND max_game_date;

		INSERT INTO productionTable
		SELECT * FROM stagingTableForLoad;

		For additional details, please see:
		http://engineering.curalate.com/2016/08/04/tips-for-starting-with-redshift.html
		AND
		http://docs.aws.amazon.com/redshift/latest/dg/merge-replacing-existing-rows.html
		"""
		self.insert_started_at = timezone.now()
		self.stage = RedshiftETLStage.INSERTING
		self.insert_query_handle = self._make_async_query_handle()
		self.save()

		background_execute = Thread(
			target=self._do_insert_on_target,
		)
		background_execute.daemon = True

		background_execute.start()

		time.sleep(10)

	def _do_insert_on_target(self):
		try:
			template = """
				INSERT INTO {target_table}
				SELECT s.*
				FROM {pre_staging_table} s
				LEFT JOIN {target_table} t ON t.{game_id} = s.{game_id}
					AND t.id = s.id AND t.game_date BETWEEN '{min_date}' AND '{max_date}'
				WHERE t.id IS NULL;
			"""

			if self.final_staging_table_size:
				# Don't attempt to insert if there is nothing in the staging table
				game_id_val = "id" if self.target_table == 'game' else "game_id"
				pre_staging_table_name = "pre_%s" % self.staging_table

				sql = template.format(
					pre_staging_table=pre_staging_table_name,
					target_table=self.target_table,
					min_date=self.min_game_date.isoformat(),
					max_date=self.max_game_date.isoformat(),
					game_id=game_id_val
				)

				log.info("STATEMENT: %s" % sql)
				engine = get_redshift_engine()
				conn = engine.connect()
				conn.execution_options(isolation_level="AUTOCOMMIT")
				conn.execute("SET QUERY_GROUP TO '%s'" % self.insert_query_handle)
				conn.execute(sql)

			self.insert_ended_at = timezone.now()
			self.stage = RedshiftETLStage.INSERT_COMPLETE
			self.save()
		except DatabaseError as e:
			if "select() failed" in str(e):
				# This exception is thrown when a background thread
				# that was frozen when the lambda shutdown
				# is restarted and no longer has a connection to the Redshift
				pass
			else:
				raise

	def _deduplicate_staging_table(self, table_obj):
		"""

		DELETE FROM stagingTableForLoad
		USING productionTable
		WHERE productionTable.game_id = stagingTableForLoad.game_id
		AND productionTable.id = stagingTableForLoad.id
		AND productionTable.game_date BETWEEN min_game_date AND max_game_date;

		:return:
		"""
		try:
			if self.final_staging_table_size:
				# Don't attempt deduplication if there is nothing in the staging table

				pre_table_name = "pre_%s" % self.staging_table
				game_id_val = "id" if self.target_table == 'game' else "game_id"
				column_names = ", ".join([c.name for c in table_obj.columns])

				template1 = """
				DROP TABLE IF EXISTS {pre_table};
				"""

				template2 = """
				CREATE TABLE {pre_table} AS
				SELECT {column_names} FROM (
				SELECT
				ROW_NUMBER() OVER (PARTITION BY s.{game_id}, s.id ORDER BY s.id) AS rn,
				s.*
				FROM {staging_table} s
				) t WHERE rn = 1;
				"""

				sql1 = template1.format(
					pre_table=pre_table_name
				)

				sql2 = template2.format(
					pre_table=pre_table_name,
					column_names=column_names,
					game_id=game_id_val,
					staging_table=self.staging_table
				)

				engine = get_redshift_engine()
				conn = engine.connect()
				conn.execution_options(isolation_level="AUTOCOMMIT")
				conn.execute(sql1)
				conn.execute("SET QUERY_GROUP TO '%s'" % self.dedupe_query_handle)
				conn.execute(sql2)

			self.deduplication_ended_at = timezone.now()
			self.stage = RedshiftETLStage.DEDUPLICATION_COMPLETE
			self.save()
		except DatabaseError as e:
			if "select() failed" in str(e):
				# This exception is thrown when a background thread
				# that was frozen when the lambda shutdown
				# is restarted and no longer has a connection to the Redshift
				pass
			else:
				raise

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
			self.min_game_date = first_row[0]
			self.max_game_date = first_row[1]
			self.save()
			return self.min_game_date, self.max_game_date
		else:
			raise RuntimeError("Could not get min and max game_date from staging table")

	def do_cleanup(self):
		from hsreplaynet.utils.instrumentation import error_handler
		self.stage = RedshiftETLStage.CLEANING_UP
		self.track_cleanup_start_at = timezone.now()
		self.save()

		try:
			streams.delete_firehose_stream(self.firehose_stream)
		except Exception as e:
			error_handler(e)

		# Temporarily keep all staged data while finalizing ETL pipeline
		# try:
		# 	self._get_table_obj().drop(bind=get_redshift_engine())
		# except Exception as e:
		# 	error_handler(e)

		self.track_cleanup_end_at = timezone.now()
		self.stage = RedshiftETLStage.FINISHED
		self.save()
