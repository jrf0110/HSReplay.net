SECRET_KEY = "hunter2"

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

DEBUG = True
ALLOWED_HOSTS = ["*"]
INTERNAL_IPS = ["127.0.0.1", "::1", "10.0.2.2"]

ACCOUNT_DEFAULT_HTTP_PROTOCOL = "http"


DATABASES = {
	"default": {
		"ENGINE": "django.db.backends.postgresql",
		"NAME": "hsreplaynet",
		"USER": "postgres",
		"PASSWORD": "",
		"HOST": "",
		"PORT": "",
	}
}


STRIPE_LIVE_MODE = False
STRIPE_TEST_SECRET_KEY = "sk_test_"

MONTHLY_PLAN_ID = "hearthsim-pro-monthly"
SEMIANNUAL_PLAN_ID = "hearthsim-pro-semiannual"


INFLUX_DATABASES = {
	"hsreplaynet": {
		"NAME": "hsreplaynet",
		"HOST": "localhost",
		"PORT": 8086,
		"USER": "",
		"PASSWORD": "",
		"SSL": False,
	},
	"joust": {
		"NAME": "joust",
		"HOST": "localhost",
		"PORT": 8086,
		"USER": "",
		"PASSWORD": "",
		"SSL": False,
	}
}
