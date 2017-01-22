import time
from django.conf import settings
from hsreplaynet.utils import log
from hsreplaynet.uploads.models import RedshiftStagingTrack


def do_all_redshift_etl_maintenance():
	did_work = True
	log.info("Beginning Full Maintenance Cycle")
	count = 0
	while did_work:
		count += 1
		log.info("Starting Maintence Run: %s" % (str(count),))
		did_work = do_redshift_etl_maintenance()
	log.info("Full Maintenance Complete. Exiting.")


def do_redshift_etl_maintenance():
	""" This method can be invoked repeatedly by a cron'd management commmand
	or a cron'd lambda. If there is any maintenance work to do it will take the next
	action and then exit.

	If any maintenance actions were taken it will return True, otherwise it will return False.
	Orchestration code invoking this method should keep calling it until it returns False.
	"""
	log.info("Starting Maintenance run.")
	active_track = RedshiftStagingTrack.objects.get_active_track()
	if not active_track:
		# This is the initial bootstrap run of ETL
		# So we initialize our first active_track
		log.info("No active track. The initial track will be initialized.")
		RedshiftStagingTrack.objects.initialize_first_active_track()
		return True

	log.info("Checking for tracks waiting for cleanup.")
	cleanup_ready_track = RedshiftStagingTrack.objects.get_cleanup_ready_track()
	if cleanup_ready_track:
		log.info("Found track waiting for cleanup. Will cleanup now.")
		cleanup_ready_track.do_cleanup()
		log.info("Cleanup complete.")
		log.info("Current maintenance run complete")
		return True
	else:
		log.info("No tracks found waiting for cleanup.")

	current_duration = active_track.activate_duration_minutes
	log.info("The active track has been open for %s minutes" % current_duration)
	target_duration = settings.REDSHIFT_ETL_TRACK_TARGET_ACTIVE_DURATION_MINUTES
	log.info("Target active duration minutes is: %s" % target_duration)

	if active_track.track_should_close:
		# This active track has been in use for longer than
		# The target amount of time we want to accumulate staged records for
		# We should initiate the process of closing it
		# and starting a new active track
		log.info("The active track should close.")
		# If we do not have a successor track setup, then we must do that first
		if not active_track.successor:
			# We haven't begun setting up the next track so kick off that process
			log.info("No successor yet. One will be initialized.")
			active_track.initialize_successor()
			log.info("Current maintenance run complete")
			return True
		else:
			# We have previously kicked off initializing the successor
			# So now we will spin wait for 30 seconds to allow it to finish setting up
			wait_for_condition(lambda: active_track.successor.is_ready_to_become_active, 30)

			log.info("The successor track is ready. Will activate.")
			# If we've reached here than the successor is ready to become active
			active_track.successor.make_active()
			log.info("The successor is now active.")
			log.info("Current maintenance run complete")
			return True

	log.info("Checking for tracks ready for insert.")
	# If there are no tracks that need to close, then we proceed to check
	# If any recently closed tracks are ready to be transferred into the prod tables
	insert_ready_track = RedshiftStagingTrack.objects.get_insert_ready_track()
	if insert_ready_track:
		log.info("Insert ready track discovered. Will insert records now.")
		insert_ready_track.do_insert_staged_records()
		log.info("Insert complete.")
		log.info("Current maintenance run complete")
		return True
	else:
		log.info("No insert ready tracks found.")

	log.info("Checking for tracks ready for analyze.")
	analyze_ready_track = RedshiftStagingTrack.objects.get_analyze_ready_track()
	if analyze_ready_track:
		log.info("Found track waiting for analyze. Will analyze now.")
		analyze_ready_track.do_analyze()
		log.info("Analyze complete")
		log.info("Current maintenance run complete")
		return True
	else:
		log.info("No tracks found waiting for analyze.")

	log.info("Checking for tracks waiting for vacuum.")
	vacuum_ready_track = RedshiftStagingTrack.objects.get_vacuum_ready_track()
	if vacuum_ready_track:
		log.info("Found track waiting for vacuum. Will vacuum now.")
		vacuum_ready_track.do_vacuum()
		log.info("Vacuum complete")
		log.info("Current maintenance run complete")
		return True
	else:
		log.info("No tracks found waiting for vacuum.")

	log.info("Checking for tracks waiting for cleanup.")
	cleanup_ready_track = RedshiftStagingTrack.objects.get_cleanup_ready_track()
	if cleanup_ready_track:
		log.info("Found track waiting for cleanup. Will cleanup now.")
		cleanup_ready_track.do_cleanup()
		log.info("Cleanup complete.")
		log.info("Current maintenance run complete")
		return True
	else:
		log.info("No tracks found waiting for cleanup.")

	log.info("No more maintenance work to do")
	# So we return False
	return False


def wait_for_condition(cond, timeout=30):
	start_time = time.time()
	while not cond():
		wait_so_far = time.time() - start_time
		if wait_so_far >= timeout:
			raise RuntimeError(
				"Condition not met before %s second timeout" % timeout
			)
		time.sleep(1)
