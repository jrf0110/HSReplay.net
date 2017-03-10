from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from hsreplaynet.features.decorators import view_requires_feature_access


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class TrendingAllView(TemplateView):
	template_name = "trending/trending_all.html"
