"""
A module providing entry points for AWS Lambda.

This module and all its dependencies will be interpreted under Python 2.7
and must be compatible.
They should provide mediation between the AWS Lambda interface and
standard Django requests.
"""
import logging
from logging.handlers import SysLogHandler
import os
import django

logging.getLogger("boto").setLevel(logging.WARN)

# This block properly bootstraps Django for running inside the AWS Lambda Runtime.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hsreplaynet.settings")
os.environ.setdefault("IS_RUNNING_AS_LAMBDA", "True")
django.setup()
from django.conf import settings


class ContextFilter(logging.Filter):

  def filter(self, record):
    record.aws_request_id = os.environ.get("AWS_REQUEST_ID", "Unknown")
    return True


# Add papertrail logger
paper_trail_handler = SysLogHandler(address=(settings.PAPERTRAIL_HOSTNAME, settings.PAPERTRAIL_PORT))
formatter = logging.Formatter('%(asctime)s %(aws_request_id)s - %(funcName)s: %(message)s', datefmt='%b %d %H:%M:%S')
paper_trail_handler.setFormatter(formatter)

lambdas_logger = logging.getLogger('hsreplaynet')
lambdas_logger.addFilter(ContextFilter())
lambdas_logger.addHandler(paper_trail_handler)
lambdas_logger.setLevel(logging.DEBUG)


# Make sure django.setup() has already been invoked to import handlers
from hsreplaynet.lambdas.authorizer import api_gateway_authorizer as token_authorizer
from hsreplaynet.lambdas.uploads import create_power_log_upload_event_handler
from hsreplaynet.lambdas.uploads import process_upload_event_handler

