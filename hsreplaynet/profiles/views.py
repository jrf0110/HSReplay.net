from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from hsreplaynet.features.decorators import view_requires_feature_access


@method_decorator(view_requires_feature_access("profiles"), name="dispatch")
class HighlightsView(LoginRequiredMixin, TemplateView):
	template_name = "profiles/highlights.html"
