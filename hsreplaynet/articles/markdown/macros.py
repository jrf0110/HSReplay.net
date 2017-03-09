"""
Jinja/Django template function calls for Markdown

Syntax example: `{% sum(1, 2, 3) %}` -> `6`
"""
import ast
import logging
import re
import markdown


MACRO = r"{%\s*(?P<name>[A-Za-z0-9_]+)\((?P<args>.*?)\)\s*%}"
MACRO_RE = re.compile(MACRO)


def render_macro(name, arguments, config):
	"""
	Converts a macro found within a Markdown document into HTML.
	If the macro fails, the original data is printed.
	"""
	func = config.get("macros", {}).get(name)
	if not func:
		return

	args, kwargs = [], {}
	for arg in arguments.split(","):
		if "=" in arg:
			k, v = arg.strip().split("=", 1)

			try:
				kwargs[k] = ast.literal_eval(v)
			except SyntaxError:
				# Fail on syntax error, return original data
				return
		else:
			try:
				arg = ast.literal_eval(arg.strip())
			except SyntaxError:
				# Fail on syntax error, return original data
				return
			args.append(arg)
	return func(*args, **kwargs)


class MacroExtension(markdown.Extension):
	"""
	Macro Extension for Python-Markdown.
	"""
	def __init__(self, config):
		self.config = {"macros": config}

	def extendMarkdown(self, md, md_globals):
		pattern = MacroPattern(MACRO, self.config)
		md.inlinePatterns.add("macro", pattern, "<not_strong")


class MacroPattern(markdown.inlinepatterns.Pattern):
	"""
	Matches inline macros.
	"""
	def __init__(self, pattern, config):
		super().__init__(pattern)
		self.config = config

	def handleMatch(self, m):
		match = MACRO_RE.search(m.string)
		d = match.groupdict()
		name, args = d["name"], d["args"]
		begin, end = match.span()
		s = match.string[begin:end]
		try:
			rendered = render_macro(name, args, self.config)
		except Exception as e:
			logging.exception("Exception while rendering markdown %r: %s", s, e)
			rendered = None
		if rendered:
			html = '<span class="md-macro">%s</span>' % (rendered)
		else:
			html = '<span class="md-macro md-error">%s</span>' % (s)
		return markdown.util.etree.fromstring(html)


def makeExtension(config=None):
	# XXX
	from webpack_loader.templatetags.webpack_loader import render_bundle

	config = {
		"sum": lambda *args, **kwargs: sum(args),
		"render_bundle": render_bundle,
	}
	return MacroExtension(config)
