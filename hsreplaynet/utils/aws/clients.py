import boto3
from django.conf import settings


if settings.CONNECT_TO_AWS:
	IAM = boto3.client("iam")
	LAMBDA = boto3.client("lambda")
	KINESIS = boto3.client("kinesis")
	S3 = boto3.client("s3")
	FIREHOSE = boto3.client("firehose")
	SQS = boto3.client("sqs")
else:
	# Stubbed to prevent ImportErrors
	IAM, LAMBDA, KINESIS, S3, FIREHOSE, SQS = None, None, None, None, None, None
