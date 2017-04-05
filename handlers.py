"""
A module providing entry points for AWS Lambda.

This module and all its dependencies will be interpreted under Python 2.7
and must be compatible.
They should provide mediation between the AWS Lambda interface and
standard Django requests.
"""
# flake8: noqa

import logging
import os; os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hsreplaynet.settings")
import django; django.setup()
from django.conf import settings


lambdas_logger = logging.getLogger("hsreplaynet")
lambdas_logger.setLevel(logging.DEBUG)

hsredshift_logger = logging.getLogger("hsredshift")
hsredshift_logger.setLevel(logging.INFO)

# Make sure django.setup() has already been invoked to import handlers
from hsreplaynet.lambdas.uploads import *
from hsreplaynet.lambdas.crons import *
# TODO: Need to resolve getting redis dependencies packaged into Lambdas
from hsreplaynet.lambdas.analytics import *
