from django.core import checks


@checks.register()
def check_redis(app_configs=None, **kwargs):
	return []
