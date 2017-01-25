from hsreplaynet.uploads.models import RedshiftETLTask


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


# @pytest.mark.django_db
# def test_active_track_initializes_successor(monkeypatch):
# 	def mock_get_redshift_engine():
# 		return True
# 	monkeypatch.setattr(models, "get_redshift_engine", mock_get_redshift_engine)
#
# 	# Need to mock create_staging_table on etl.models
# 	def mock_create_staging_table(table, prefix, *args, **kwargs):
# 		t = Table()
# 		t.name = MagicMock(return_value=prefix + table.name)
# 		return t
#
# 	monkeypatch.setattr(models, "create_staging_table", mock_create_staging_table)
#
# 	# Need to mock create_firehose_stream on aws.streams
# 	def mock_create_firehose_stream(*args, **kwargs):
# 		return True
# 	monkeypatch.setattr(streams, "create_firehose_stream", mock_create_firehose_stream)
#
# 	def mock_list_staging_eligible_tables(*args, **kwargs):
# 		result = []
# 		for n in ["game", "player", "block"]:
# 			mock = Table()
# 			mock.name = MagicMock(return_value=n)
# 			result.append(mock)
# 		return result
#
# 	monkeypatch.setattr(
# 		models,
# 		"list_staging_eligible_tables",
# 		mock_list_staging_eligible_tables
# 	)
#
# 	initial_track = RedshiftStagingTrack.objects.initialize_first_active_track()
# 	assert initial_track.tables().count() == 3, "Not all child tables created"
