#!/usr/bin/env python

import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string


ERRORS = {
	404: {
		"error_name": "Not found",
		"error_desc": "That's a lot more than 200.",
	},
	500: {
		"error_name": "Internal server error",
		"error_desc": "You broke it! It's fine, we'll fix it.",
	}
}


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--template", default="error.html")
		parser.add_argument("--outdir", default=settings.TEMPLATES[0]["DIRS"][0])
		parser.add_argument("--strip-whitespace", action="store_true")

	def handle(self, *args, **options):
		for error_code, context in ERRORS.items():
			filename = "%i.html" % (error_code)
			context["error_code"] = error_code
			out = render_to_string(options["template"], context)

			if options["strip_whitespace"]:
				out = out.replace("\t", "").replace("\n", "")

			path = os.path.join(options["outdir"], filename)
			self.stdout.write("Compiling %r" % (path))
			with open(path, "w") as f:
				f.write(out)
