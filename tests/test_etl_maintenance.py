from datetime import timedelta
from unittest.mock import MagicMock
from django.utils import timezone
from django.conf import settings
from hsreplaynet.uploads.models import RedshiftETLTask
from hsreplaynet.games.processing import replay_meets_recency_requirements


def test_etl_task():
	callable_invoked = False
	task_name = "Test Task"

	def task_callable():
		nonlocal callable_invoked
		callable_invoked = True

	task = RedshiftETLTask(task_name, task_callable)
	assert str(task) == task_name, "Task str not correct"

	task()

	assert callable_invoked, "task did not invoke callable"


def assert_recency_requirements_for(log_upload_date, match_start):
	mock_upload_event = MagicMock()
	mock_upload_event.log_upload_date = log_upload_date

	mock_global_game = MagicMock()
	mock_global_game.match_start = match_start

	return replay_meets_recency_requirements(mock_upload_event, mock_global_game)


def test_replay_meets_recency_requirements():
	threshold_hours = settings.REDSHIFT_ETL_UPLOAD_DELAY_LIMIT_HOURS

	log_upload_date = timezone.now()
	earlier_match_start_within_threshold = log_upload_date - timedelta(
		hours=(threshold_hours - 2)
	)
	assert assert_recency_requirements_for(
		log_upload_date,
		earlier_match_start_within_threshold
	), "A match start within the threshold incorrectly failed the recency test"

	earlier_match_start_outside_threshold = log_upload_date - timedelta(
		hours=(threshold_hours + 10)
	)
	assert not assert_recency_requirements_for(
		log_upload_date,
		earlier_match_start_outside_threshold
	), "A match start outside the threshold was not rejected"

	later_match_start_within_threshold = log_upload_date + timedelta(
		hours=(threshold_hours - 2)
	)
	assert assert_recency_requirements_for(
		log_upload_date,
		later_match_start_within_threshold
	), "A match start within the threshold incorrectly failed the recency test"

	later_match_start_outside_threshold = log_upload_date + timedelta(
		hours=(threshold_hours + 10)
	)
	assert not assert_recency_requirements_for(
		log_upload_date,
		later_match_start_outside_threshold
	), "A match start outside the threshold was not rejected"
