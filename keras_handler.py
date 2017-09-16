"""
A Lambda Handler Entry Point For Using Keras

See: https://ryan-cranfill.github.io/keras-aws-lambda/
"""
# flake8: noqa
import ctypes
import os


os.environ["THEANO_FLAGS"] = "base_compiledir=/tmp/.theano,cxx="
os.environ["KERAS_BACKEND"] = "theano"


for d, _, files in os.walk('lib'):
	for f in files:
		if f.endswith('.a') or f.endswith('.settings'):
			continue
		ctypes.cdll.LoadLibrary(os.path.join(d, f))


import boto3
import json
from keras.models import load_model
import numpy


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
	model = load_keras_model(model_bucket, model_key)

	if "deck_vector" in event:
		deck_vector = json.loads(event["deck_vector"])[0]
		data = numpy.zeros((1, len(deck_vector)))
		for i, c in enumerate(deck_vector):
			data[0][i] = c
	else:
		deck_vectors = json.loads(event["deck_vectors"])
		data = numpy.zeros((len(deck_vectors), len(deck_vectors[0])))
		for row_id, deck_vector in enumerate(deck_vectors):
			for i, c in enumerate(deck_vector):
				data[row_id][i] = c

	predictions = model.predict_classes(data)
	result = {
		"predicted_class": int(predictions[0]),
		"predicted_classes": [int(p) for p in predictions]
	}
	return result
