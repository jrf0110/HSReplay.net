import json
import pytest
from hearthstone.enums import PlayState
from oauth2_provider.models import AccessToken, Grant
from hearthsim_identity.accounts.models import AccountClaim, AuthToken, User
from hsreplaynet.oauth2.models import Application
from hsreplaynet.webhooks.models import Webhook


CLAIM_ACCOUNT_API = "/api/v1/claim_account/"


def test_valid_webhook_serialization():
	# Check that Webhooks can reserialize themselves.
	# Python 2 issue. Get rid of this in Py3

	payload = {"final_state": PlayState.WON}
	d = Webhook()._serialize_payload(payload)
	decoded = json.loads(d)
	assert decoded["final_state"] == PlayState.WON


@pytest.mark.django_db
def test_auth_token_request(client, settings):
	data = {
		"full_name": "Test Client",
		"email": "test@example.org",
		"website": "https://example.org",
	}
	response = client.post("/api/v1/agents/", data)

	assert response.status_code == 201
	out = response.json()

	api_key = out["api_key"]
	assert api_key
	assert out["full_name"] == data["full_name"]
	assert out["email"] == data["email"]
	assert out["website"] == data["website"]

	url = "/api/v1/tokens/"
	response = client.post(url, content_type="application/json", HTTP_X_API_KEY=api_key)
	assert response.status_code == 201
	out = response.json()

	token = out["key"]
	assert token
	assert out["user"] is None  # user should be empty for fake users
	user = User.objects.get(username=token)
	assert user.auth_tokens.count() == 1
	assert str(user.auth_tokens.first().key) == token

	# GET (listing tokens) should error
	response = client.get(url, HTTP_X_API_KEY=api_key)
	assert response.status_code == 405

	# POST without API key should error
	response = client.post(url)
	assert response.status_code == 401

	# Attempt creating an account claim without an API key
	response = client.post(
		CLAIM_ACCOUNT_API,
		content_type="application/json",
		HTTP_AUTHORIZATION="Token %s" % (token),
	)
	assert response.status_code == 403

	# Attempt creating an account claim with a non-existant API key
	response = client.post(
		CLAIM_ACCOUNT_API,
		content_type="application/json",
		HTTP_AUTHORIZATION="Token %s" % (token),
		HTTP_X_API_KEY="nope",
	)
	assert response.status_code == 403

	# Now create a claim for the account
	response = client.post(
		CLAIM_ACCOUNT_API,
		content_type="application/json",
		HTTP_AUTHORIZATION="Token %s" % (token),
		HTTP_X_API_KEY=api_key,
	)
	assert response.status_code == 201
	json = response.json()
	url = json["url"]
	assert url.startswith("/account/claim/")

	# Check the claim was created correctly
	claim = AccountClaim.objects.get(token=token)
	assert str(claim.api_key.api_key) == api_key

	# verify that the url works and requires a login
	response = client.get(url)
	assert response.status_code == 302
	assert response.url == "/account/login/?next=%s" % (url)

	# Mock a user from the Battle.net API
	real_user = User.objects.create_user("Test#1234", "", "")
	client.force_login(real_user, backend=settings.AUTHENTICATION_BACKENDS[0])
	response = client.get(url)
	assert response.status_code == 302
	assert response.url == "/games/mine/"

	# Double check that the AuthToken still exists
	token = AuthToken.objects.get(key=token)
	assert token
	assert str(token.creation_apikey.api_key) == api_key
	assert token.user == real_user

	# Check that it's no longer possible to create a claim for the token
	response = client.post(
		CLAIM_ACCOUNT_API,
		content_type="application/json",
		HTTP_AUTHORIZATION="Token %s" % (token),
		HTTP_X_API_KEY=api_key,
	)
	assert response.status_code == 400


@pytest.mark.django_db
def test_oauth_api(admin_user, client, settings):
	redirect_uri = "https://localhost:8443/"
	client_id = "client-id"
	client_secret = "secret"

	app = Application.objects.create(
		name="Test OAuth2 Application",
		user=admin_user,
		client_id=client_id,
		client_secret=client_secret,
		client_type="confidential",
		authorization_grant_type="authorization-code",
		redirect_uris=redirect_uri,
	)

	response_type = "code"
	state = "random_state_string"
	authorize_url = "/oauth2/authorize/"
	get_data = {
		"client_id": client_id,
		"response_type": response_type,
		"state": state,
		"scopes": "webhooks:read webhooks:write",
	}
	response = client.get(authorize_url, data=get_data)
	assert response.status_code == 302
	assert response.url.startswith("/oauth2/login/")
	assert "client_id=%s" % (client_id) in response.url

	client.force_login(admin_user, backend=settings.AUTHENTICATION_BACKENDS[0])
	response = client.get(authorize_url, data=get_data)
	assert response.status_code == 200

	app.skip_authorization = True
	app.save()
	response = client.get(authorize_url, data=get_data)
	assert response.status_code == 302
	assert response.url.startswith(redirect_uri)

	code = Grant.objects.first().code
	token_url = "/oauth2/token/"
	post_data = {
		"grant_type": "authorization_code",
		"code": code,
		"client_id": client_id,
		"client_secret": client_secret,
		"redirect_uri": redirect_uri,
	}
	response = client.post(token_url, post_data)
	assert response.status_code == 200

	data = response.json()
	token = data["access_token"]
	token_obj = AccessToken.objects.get(token=token)
	assert token
	bearer_auth = "Bearer %s" % (token)

	##
	# Webhook API tests

	webhooks_list_url = "/api/v1/webhooks/"
	# Call the webhook API without a token is a 401
	response = client.get(webhooks_list_url)
	assert response.status_code == 401

	# Call the webhook API with a token but without an API key is a 401
	response = client.get(webhooks_list_url, HTTP_AUTHORIZATION=bearer_auth)
	assert response.status_code == 200
	data = response.json()
	assert "results" in data
	assert data["results"] == []

	webhook_callback_url = "https://example.com/webhook/callback/"
	post_data = {
		"url": webhook_callback_url,
		"max_triggers": 1,
		"user": 123,  # will be ignored
		"secret": "seekrit",
	}
	response = client.post(
		webhooks_list_url,
		HTTP_AUTHORIZATION=bearer_auth,
		content_type="application/json",
		data=json.dumps(post_data),
	)
	assert response.status_code == 201
	data = response.json()
	assert data["user"]["username"] == "admin"
	assert data["max_triggers"] == 1
	assert data["url"] == webhook_callback_url
	assert "secret" not in data
	obj = Webhook.objects.get(uuid=data["uuid"])
	assert obj.secret == "seekrit"

	# Change scope to read-only, check that we can't create webhooks
	token_obj.scope = "webhooks:read"
	token_obj.save()
	response = client.post(
		webhooks_list_url,
		HTTP_AUTHORIZATION=bearer_auth,
		content_type="application/json",
		data=json.dumps(post_data),
	)
	assert response.status_code == 403
	# ... but can still read
	response = client.get(webhooks_list_url, HTTP_AUTHORIZATION=bearer_auth)
	assert response.status_code == 200

	# Blank scope cannot access token api at all
	token_obj.scope = ""
	token_obj.save()
	response = client.post(
		webhooks_list_url,
		HTTP_AUTHORIZATION=bearer_auth,
		content_type="application/json",
		data=json.dumps(post_data),
	)
	assert response.status_code == 403
	response = client.get(webhooks_list_url, HTTP_AUTHORIZATION=bearer_auth)
	assert response.status_code == 403


@pytest.mark.django_db
def test_deck_exchange(client):
	from hearthstone.enums import FormatType
	from hsreplaynet.decks.models import Deck

	decks_by_list_url = "/api/v1/decks/"

	response = client.post(decks_by_list_url, data={})
	assert response.status_code == 400

	decklist = [1074, 1074]  # Slam
	decklist += [179] * 28  # Wisps

	data = {
		"cards": decklist,
		"heroes": [7],  # Garrosh
		"format": int(FormatType.FT_STANDARD),
	}

	response = client.post(decks_by_list_url, data=data)
	obj = response.json()
	print(obj)
	assert obj["cards"] == sorted(decklist)
	assert obj["shortid"] == "If2f3dQc0qnIqvulN18KId"
	assert response.status_code == 201
	assert Deck.objects.all().count() == 1

	# Replay the request, should be 200 now
	response = client.post(decks_by_list_url, data=data)
	assert response.status_code == 200
	assert Deck.objects.all().count() == 1
