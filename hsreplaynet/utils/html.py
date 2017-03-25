from django.utils.html import escape


class HTMLTagList:
	def __init__(self, tag_name, obj=None):
		self.tag_name = tag_name
		if obj is None:
			obj = []
		self._tags = obj

	def __str__(self):
		ret = [self.render_tag(tag) for tag in self._tags]
		return "".join(ret)

	def render_tag(self, tag):
		attrs = ('%s="%s"' % (k, escape(str(v))) for k, v in tag.items())
		return "<%s %s/>" % (self.tag_name, " ".join(attrs))

	def append(self, *tags):
		for tag in tags:
			self._tags.append(tag)
