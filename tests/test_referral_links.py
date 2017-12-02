import pytest
from django_reflinks.models import ReferralLink

from hsreplaynet.billing.utils import user_referred_by


@pytest.mark.django_db
def test_user_referred_by(admin_user, user, admin_client):
	assert not user_referred_by(admin_user)

	link = ReferralLink.objects.create(identifier="foo", user=user)

	admin_client.get(link.get_absolute_url())

	assert user_referred_by(admin_user) == ReferralLink.objects.filter(pk=link.pk)
