import os

from django.template import Template


def test_compile_templates(settings):
	for template_dir in settings.TEMPLATES[0]["DIRS"]:
		for basepath, dirs, filenames in os.walk(template_dir):
			for filename in filenames:
				path = os.path.join(basepath, filename)
				with open(path, "r") as f:
					# This will fail if the template cannot compile
					t = Template(f.read())
					assert t
