from django.conf import settings
from django.conf.urls import include, url
from .billing.views import PremiumDetailView
from .games.views import ReplayDetailView, ReplayEmbedView
from .views import DownloadsView, HomeView


urlpatterns = [
	url(r"^$", HomeView.as_view(), name="home"),
	url(r"^api/", include("hsreplaynet.api.urls")),
	url(r"^analytics/", include("hsreplaynet.analytics.urls")),
	url(r"^games/", include("hsreplaynet.games.urls")),
	url(r"^uploads/", include("hsreplaynet.uploads.urls")),

	# Direct link to replays
	url(r"^replay/(?P<id>\w+)$", ReplayDetailView.as_view(), name="games_replay_view"),
	url(r"^replay/(?P<id>\w+)/embed$", ReplayEmbedView.as_view(), name="games_replay_embed"),
]

if not settings.ENV_LAMBDA:
	from django.contrib.flatpages.views import flatpage
	# These pages are not registered on Lambda as they are not needed there
	urlpatterns += [
		url(r"^admin/", include("hsreplaynet.admin.urls")),
		url(r"^articles/", include("hsreplaynet.articles.urls")),
		url(r"^account/", include("hsreplaynet.accounts.urls")),
		url(r"^account/billing/", include("hsreplaynet.billing.urls")),
		url(r"^comments/", include("hsreplaynet.comments.urls")),
		url(r"^premium/$", PremiumDetailView.as_view(), name="premium"),
		url(r"^contact/$", flatpage, {"url": "/contact/"}, name="contact_us"),
		url(r"^about/privacy/$", flatpage, {"url": "/about/privacy/"}, name="privacy_policy"),
		url(r"^about/tos/$", flatpage, {"url": "/about/tos/"}, name="terms_of_service"),
		url(r"^downloads/", DownloadsView.as_view(), name="downloads"),
		url(r"^features/", include("hsreplaynet.features.urls")),
		url(r"^profile/", include("hsreplaynet.profiles.urls")),
		url(r"^pages/", include("django.contrib.flatpages.urls")),
		url(r"^oauth2/", include("hsreplaynet.oauth2.urls")),
		# decks and cards
		url(r"^", include("hsreplaynet.decks.urls")),
	]

if settings.DEBUG:
	import debug_toolbar
	from django.conf.urls.static import static

	urlpatterns += [
		url(r"^__debug__/", include(debug_toolbar.urls)),
		# url(r"^admin/_/explorer/", include("explorer.urls")),
	]
	urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
