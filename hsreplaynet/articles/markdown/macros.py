"""
Jinja/Django template function calls for Markdown

Syntax example: `{% sum(1, 2, 3) %}` -> `6`
"""
import ast
import logging
import re

import markdown
from django.utils.html import escape


MACRO = r"{%\s*(?P<name>[A-Za-z0-9_]+)\((?P<args>.*?)\)\s*%}"
MACRO_RE = re.compile(MACRO)


DECK_DIV = """<div
class='article-card-list'
data-cards='{cards}'
data-hero='{hero}'
data-deck-class='{deck_class}'
></div>"""


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


def do_card(
	dbf_id=None, card_id=None, id=None, name=None, render=False, link=True, tooltip=None
):

	from django_hearthstone.cards.models import Card

	# TODO: rename `id` argument to `card_id`

	if dbf_id is not None:
		card = Card.objects.get(dbf_id=dbf_id)
	elif card_id is not None:
		card = Card.objects.get(card_id=card_id)
	elif id is not None:
		card = Card.objects.get(card_id=id)
	elif name:
		card = Card.objects.get(name=name)
	else:
		raise ValueError("Argument id or name is required.")

	name = escape(name or card.name)

	if render:
		card_render_url = escape(card.get_card_render_url())
		inner = '<img src="%s" alt="%s"/>' % (card_render_url, name)
	else:
		inner = name

	if tooltip is None:
		tooltip = link and not render

	if link:
		if tooltip:
			outer = (
				'<a href="{url}" data-card-id="{id}" data-dbf-id="{dbf_id}" data-toggle="card-tooltip">'
				"{inner}</a>"
			)
		else:
			outer = '<a href="{url}" data-card-id="{id}" data-dbf-id="{dbf_id}">{inner}</a>'
		outer = outer.format(
			url=card.get_absolute_url(), id=card.card_id, dbf_id=card.dbf_id, inner=inner
		)
	else:
		outer = inner

	return outer


def do_deck(shortid):
	from hsreplaynet.decks.models import Deck

	deck = Deck.objects.get_by_shortid(shortid)
	cards = ",".join(str(dbf_id) for dbf_id in deck.card_dbf_id_list())

	return DECK_DIV.format(
		cards=cards, hero=deck.hero_dbf_id, deck_class=deck.deck_class.name
	)


def makeExtension(config=None):
	# XXX
	from webpack_loader.templatetags.webpack_loader import render_bundle

	config = {
		"sum": lambda *args, **kwargs: sum(args),
		"render_bundle": render_bundle,
		"card": do_card,
		"deck": do_deck,
	}
	return MacroExtension(config)
