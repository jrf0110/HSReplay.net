import datetime

import pytest
from django.utils import timezone
from django_reflinks.models import ReferralHit, ReferralLink

from hsreplaynet.billing.utils import user_referred_by


@pytest.mark.django_db
def test_user_referred_by(admin_user, admin_client):
	user = admin_user
	assert not user_referred_by(user)

	link = ReferralLink.objects.create(identifier="foo", user=user)

	assert ReferralHit.objects.count() == 0
	resp = admin_client.get(link.get_absolute_url())
	assert resp.status_code == 302
	assert ReferralHit.objects.count() == 1

	assert user_referred_by(user) == ReferralLink.objects.get(pk=link.pk)

	user.date_joined = timezone.now() - datetime.timedelta(days=3)
	user.save()
	assert user_referred_by(user) == ReferralLink.objects.get(pk=link.pk)

	user.date_joined = timezone.now() - datetime.timedelta(days=30)
	user.save()
	assert not user_referred_by(user)
