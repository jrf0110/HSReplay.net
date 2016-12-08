from django.conf.urls import url
from oauth2_provider import views as oauth2_views
from .views import ApplicationUpdateView, ApplicationListView


app_list_view = ApplicationListView.as_view()
app_update_view = ApplicationUpdateView.as_view()
authorization_view = oauth2_views.AuthorizationView.as_view()

urlpatterns = [
	url(r"^applications/$", app_list_view, name="oauth2_app_list"),
	url(r"^application/(?P<pk>\d+)/$", app_update_view, name="oauth2_app_update"),
	url(r"^authorize/$", authorization_view, name="authorize"),
]
