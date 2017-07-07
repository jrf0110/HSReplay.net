from django.conf import settings
from django.core.cache import caches
from sqlalchemy import create_engine
from sqlalchemy.engine.url import URL
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from hsredshift.analytics.queries import RedshiftCatalogue


def get_redshift_cache():
	return caches["redshift"]


def get_redshift_cache_redis_client():
	return get_redshift_cache().client.get_client()


def get_redshift_engine():
	db = settings.REDSHIFT_DATABASE
	url = URL(
		db["ENGINE"],
		username=db["USER"], password=db["PASSWORD"],
		host=db["HOST"], port=db["PORT"],
		database=db["NAME"]
	)
	return create_engine(
		url, poolclass=NullPool,
		connect_args=settings.REDSHIFT_DATABASE["OPTIONS"]
	)


def get_new_redshift_connection(autocommit=True):
	conn = get_redshift_engine().connect()
	if autocommit:
		conn.execution_options(isolation_level="AUTOCOMMIT")
	return conn


def get_new_redshift_session(autoflush=False):
	Session = sessionmaker()
	session = Session(bind=get_new_redshift_connection(autocommit=False), autoflush=autoflush)
	return session


def get_redshift_catalogue():
	cache = get_redshift_cache_redis_client()
	engine = get_redshift_engine()
	return RedshiftCatalogue.instance(cache, engine)


def get_redshift_query(query):
	return get_redshift_catalogue().get_query(query)


def inflight_query_count(handle):
	query = "SELECT count(*) FROM STV_INFLIGHT WHERE label = '%s';" % handle
	return get_new_redshift_connection().execute(query).scalar()


def has_inflight_queries(handle):
	return inflight_query_count(handle) > 0


def is_analyze_skipped(handle):
	query_template = """
		SELECT count(*)
		FROM STL_UTILITYTEXT u
		JOIN stl_analyze a ON a.xid = u.xid
		WHERE label = '{handle}'
		AND text like 'Analyze%%'
		AND status = 'Skipped';
	"""
	query = query_template.format(handle=handle)
	count = get_new_redshift_connection().execute(query).scalar()
	return count >= 1
