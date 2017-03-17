from django.core.paginator import Paginator
from django.db import connections
from django.utils.functional import cached_property


class EstimatedCountPaginator(Paginator):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.object_list.count = self.count

	@cached_property
	def count(self):
		if self.object_list.query.where:
			return self.object_list.count()

		db_table = self.object_list.model._meta.db_table
		cursor = connections[self.object_list.db].cursor()
		cursor.execute("SELECT reltuples FROM pg_class WHERE relname = %s", (db_table, ))
		estimated_count = int(cursor.fetchone()[0])

		return estimated_count
