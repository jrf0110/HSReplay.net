import re
from hashlib import sha256
from hmac import HMAC
from hsreplaynet.webhooks.models import generate_signature


def test_signature_generation():
	message = b"Hello world"
	key = b"hunter2"

	signature = generate_signature(key, message)
	ts, sha = signature.split(", ")

	sre = re.match(r"t=(\d+)", ts)
	assert sre
	t = int(sre.group(1))

	sre = re.match(r"sha256=([a-f0-9]{64})", sha)
	assert sre
	sha = sre.group(1)

	# check the signature
	expected_msg = "{t}.{message}".format(t=t, message=message).encode("utf-8")
	expected_sig = HMAC(key, expected_msg, digestmod=sha256)

	assert sha == expected_sig.hexdigest()
