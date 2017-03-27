from django.utils.html import escape


class HTMLTag:
	def __init__(self, tag_name, content=None, attrs=None):
		self.tag_name = tag_name
		self.content = content
		self.attrs = attrs or {}

	def __str__(self):
		return self.render()

	def render(self):
		tag = self.tag_name
		attrs = self.render_attributes()
		if attrs:
			tag += " " + attrs
		return "<%s/>" % (tag)

	def render_attributes(self):
		if not self.attrs:
			return ""
		return " ".join('%s="%s"' % (k, escape(str(v))) for k, v in self.attrs.items())


class HTMLHead:
	def __init__(self, request):
		self._meta_tags = []
		self.request = request

	def __str__(self):
		return "".join(str(tag) for tag in self.get_tags())

	def get_tags(self):
		return self._meta_tags

	def add_meta(self, *tags):
		for attrs in tags:
			self._meta_tags.append(HTMLTag("meta", attrs=attrs))
