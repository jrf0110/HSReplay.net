from allauth.socialaccount.providers import registry


def test_battlenet_auth_loaded():
	assert registry.loaded
	provider = registry.by_id("battlenet")
	assert provider.id == "battlenet"


def test_load_homepage(client):
	response = client.get("/")
	assert response.status_code == 200
