# flake8: noqa, isort:skip_file
"""
A Lambda Handler Entry Point For Using Keras

See: https://ryan-cranfill.github.io/keras-aws-lambda/
"""
import ctypes
import os
import json


os.environ["THEANO_FLAGS"] = "base_compiledir=/tmp/.theano,cxx="
os.environ["KERAS_BACKEND"] = "theano"


for d, _, files in os.walk("lib"):
	for f in files:
		if f.endswith(".a") or f.endswith(".settings"):
			continue
		ctypes.cdll.LoadLibrary(os.path.join(d, f))


import boto3
import numpy
from keras.models import load_model


_CACHE = {}
S3 = boto3.client("s3")


def load_keras_model(bucket, key):
	if bucket not in _CACHE:
		_CACHE[bucket] = {}

	if key not in _CACHE[bucket]:
		model_path = "/tmp/%s" % key.replace("/", "-")
		with open(model_path, "wb") as out:
			out.write(S3.get_object(Bucket=bucket, Key=key)["Body"].read())
		_CACHE[bucket][key] = load_model(model_path)

	return _CACHE[bucket][key]


def handler(event, context):
	model_bucket = event["model_bucket"]
	model_key = event["model_key"]
	deck_vector = json.loads(event["deck_vector"])[0]
	model = load_keras_model(model_bucket, model_key)
	data = numpy.zeros((1, len(deck_vector)))
	for i, c in enumerate(deck_vector):
		data[0][i] = c

	prediction = model.predict_classes(data)[0]
	return {"predicted_class": int(prediction)}
