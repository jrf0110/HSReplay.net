from django.conf.urls import include, url
from django.contrib import admin
from django.contrib.auth.decorators import login_required


admin.site.login = login_required(admin.site.login)

urlpatterns = [
	url(r"^", admin.site.urls),
	url(r"^loginas/", include("loginas.urls")),
]
