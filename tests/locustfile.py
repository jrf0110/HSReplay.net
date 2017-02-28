"""
A locust file for load testing the premium signup process

This file is written for Python 2.7 and requires additional dependencies.
See the locust installation instructions:

http://docs.locust.io/en/latest/installation.html

To run on OS X:
https://github.com/kennethreitz/requests/issues/2022

To Start The Locust Web Server Run:

$ PYTHONPATH=$PYTHONPATH:. LOADTEST=1 locust -f tests/locustfile.py --host=<HOST>

The host can be localhost, dev, or https://hsreplay.net, etc.
We set the PYTHONPATH because locust uses /tests as the current working directory
We set LOADTEST=1 to only load the necessary Django machinery we need for the test

Then open the web console to start the test: http://127.0.0.1:8089
"""
import os
from uuid import uuid4
from locust import HttpLocust, TaskSet, task
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from pages import DeckDatabase
from locators import AdminLoginLocators
from selenium.webdriver.support import expected_conditions as EC

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hsreplaynet.settings")
os.environ.setdefault("PROD", "1")

import django  # noqa
django.setup()

from django.contrib.auth import get_user_model  # noqa
from django.contrib.auth.models import Group  # noqa


class PremiumSignupBehavior(TaskSet):
	def on_start(self):
		"""
		Called when a Locust start before any task is scheduled
		"""
		self.browser = webdriver.Chrome('/usr/local/bin/chromedriver')
		self.browser.implicitly_wait(3)

		def wait_until(locator):
			return WebDriverWait(self.browser, 10).until(
				EC.presence_of_element_located(locator)
			)

		self.browser.wait_until = wait_until

	def create_test_user(self):
		self._username = "locust_%s" % str(uuid4())[:8]
		self._password = self._username
		self.user = get_user_model().objects.create(username=self._username)
		self.user.set_password(self._password)
		self.user.is_staff = True
		self.user.groups.add(Group.objects.get(name="feature:billing:preview"))
		self.user.groups.add(Group.objects.get(name="feature:carddb:preview"))
		self.user.groups.add(Group.objects.get(name="feature:topcards:preview"))
		self.user.save()  # Save needed to record password

	def login(self):
		self.browser.get(self.client.base_url + "/admin/login/")

		username = self.browser.wait_until(AdminLoginLocators.USERNAME_INPUT)
		password = self.browser.wait_until(AdminLoginLocators.PASSWORD_INPUT)
		username.clear()
		password.clear()
		username.send_keys(self._username)
		password.send_keys(self._password)
		password.submit()
		# We use this to make sure we've finished logging in before passing control back
		self.browser.wait_until(AdminLoginLocators.ADMIN_SITE_NAME)

	def purchase_premium(self):
		self.browser.get(self.client.base_url + '/decks/')
		deck_database = DeckDatabase(self.browser)

		assert deck_database.premium_features_are_locked()

		deck_database.click_premium_more_info()
		deck_database.click_premium_signup()
		deck_database.enter_payment_details()

		assert deck_database.premium_features_are_locked() is False

	def delete_test_user(self):
		self.user.delete()

	def signout(self):
		deck_database = DeckDatabase(self.browser)
		deck_database.logout()

	@task(1)
	def signup_for_premium(self):
		self.create_test_user()
		self.login()
		self.purchase_premium()
		# Once fixed start deleting test users to keep DB clean
		# self.delete_test_user()
		self.signout()


class PremiumPurchasingUser(HttpLocust):
	task_set = PremiumSignupBehavior
	# The amount of millis each locust waits between
	# each run through the premium signup flow
	min_wait = 3000
	max_wait = 5000
