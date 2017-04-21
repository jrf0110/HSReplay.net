from django.contrib.staticfiles.templatetags.staticfiles import static
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

		if self.content is not None:
			return "<%s>%s</%s>" % (tag, escape(self.content), self.tag_name)
		else:
			return "<%s/>" % (tag)

	def render_attributes(self):
		if not self.attrs:
			return ""
		return " ".join('%s="%s"' % (k, escape(str(v))) for k, v in self.attrs.items())


class HTMLHead:
	def __init__(self, request):
		self._meta_tags = []
		self._link_tags = []
		self.request = request
		self.charset = "utf-8"
		self.base_title = "HSReplay.net"
		self.title = ""
		self.canonical_url = ""
		self.opengraph = {}
		# self.favicon = ""

		self.favicon = "images/favicon.ico"
		self.add_stylesheets(
			"vendor/bootstrap/css/bootstrap.min.css",
			"styles/main.css",
			"https://fonts.googleapis.com/css?family=Noto+Sans:400,700",
		)

	def __str__(self):
		return "".join(str(tag) for tag in self.get_tags())

	def get_tags(self):
		tags = []

		if self.charset:
			tags.append(HTMLTag("meta", attrs={"charset": "utf-8"}))

		title = self.get_title()
		if title:
			tags.append(HTMLTag("title", content=title))
			self.opengraph["og:title"] = title

		tags += self._meta_tags

		if self.favicon:
			url = static(self.favicon)
			tags.append(HTMLTag("link", attrs={"rel": "icon", "type": "image/png", "href": url}))

		tags += self._link_tags

		if self.canonical_url:
			tags.append(HTMLTag("meta", attrs={"property": "og:url", "content": self.canonical_url}))
			tags.append(HTMLTag("link", attrs={"rel": "canonical", "href": self.canonical_url}))

		for k, v in self.opengraph.items():
			tags.append(HTMLTag("meta", attrs={"property": k, "content": v}))

		return tags

	def get_title(self):
		title_parts = []
		if self.title:
			title_parts.append(self.title)
		if self.base_title:
			title_parts.append(self.base_title)

		if title_parts:
			return " - ".join(title_parts)
		else:
			return ""

	def add_link(self, **attrs):
		self._link_tags.append(HTMLTag("link", attrs=attrs))

	def add_meta(self, *tags):
		for attrs in tags:
			self._meta_tags.append(HTMLTag("meta", attrs=attrs))

	def add_stylesheets(self, *stylesheets):
		for stylesheet in stylesheets:
			if isinstance(stylesheet, dict):
				attrs = dict(stylesheet)
				attrs.setdefault("rel", "stylesheet")
				attrs.setdefault("type", "text/css")
				if "integrity" in stylesheet:
					attrs.setdefault("crossorigin", "anonymous")
			else:
				attrs = {"rel": "stylesheet", "href": stylesheet, "type": "text/css"}

			if not attrs["href"].startswith(("http:", "https:")):
				attrs["href"] = static(attrs["href"])

			self.add_link(**attrs)

	def set_canonical_url(self, url):
		self.canonical_url = self.request.build_absolute_uri(url)


class RequestMetaMixin:
	def get(self, request, *args, **kwargs):
		if hasattr(self, "stylesheets"):
			self.request.head.add_stylesheets(*self.stylesheets)
		if hasattr(self, "title"):
			self.request.head.title = self.title
		if hasattr(self, "description"):
			self.request.head.add_meta(
				{"name": "description", "content": self.description},
				{"property": "og:description", "content": self.description},
			)
		return super().get(request, *args, **kwargs)
