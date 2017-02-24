"""
Miscellaneous middleware objects
https://docs.djangoproject.com/en/1.10/topics/http/middleware/
"""


class DoNotTrackMiddleware:
	HEADER = "HTTP_DNT"

	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		if self.HEADER in request.META:
			request.dnt = request.META[self.HEADER] == "1"
		else:
			request.dnt = None

		response = self.get_response(request)

		if self.HEADER in request.META:
			response["DNT"] = request.META[self.HEADER]

		return response


class SetRemoteAddrFromForwardedFor:
	"""
	Middleware that sets REMOTE_ADDR based on HTTP_X_FORWARDED_FOR, if the
	latter is set and the IP is in a set of internal IPs.

	Note that this does NOT validate HTTP_X_FORWARDED_FOR. If you're not behind
	a reverse proxy that sets HTTP_X_FORWARDED_FOR automatically, do not use
	this middleware. Anybody can spoof the value of HTTP_X_FORWARDED_FOR, and
	because this sets REMOTE_ADDR based on HTTP_X_FORWARDED_FOR, that means
	anybody can "fake" their IP address. Only use this when you can absolutely
	trust the value of HTTP_X_FORWARDED_FOR.

	The code is from Django 1.0, but removed as unfit for general use.
	"""

	HEADER = "HTTP_X_FORWARDED_FOR"
	# A set of IPs for which the Middleware will trigger.
	# Other IPs will not be replaced.
	INTERNAL_IPS = ("0.0.0.0", "127.0.0.1")

	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		# Check the original IP; only proceed if it's not a "real" IP
		ip = request.META.get("REMOTE_ADDR", "127.0.0.1")
		if ip in self.INTERNAL_IPS and self.HEADER in request.META:
			value = request.META[self.HEADER]
			# HTTP_X_FORWARDED_FOR can be a comma-separated list of IPs. The
			# client's IP will be the first one.
			real_ip = value.split(",")[0].strip()
			request.META["REMOTE_ADDR"] = real_ip

		response = self.get_response(request)
		return response
