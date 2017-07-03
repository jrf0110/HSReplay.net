from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils.timezone import now


class Article(models.Model):
	title = models.CharField(max_length=200)
	slug = models.SlugField(max_length=200)
	contents = models.TextField(blank=True)
	excerpt = models.TextField(blank=True, help_text="Defaults to the first paragraph")
	author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

	draft = models.BooleanField(default=False, help_text="Drafts are only visible to staff.")
	listed = models.BooleanField(default=True, help_text="Whether the post appears in lists.")
	enable_comments = models.BooleanField(default=True)

	template_name = models.CharField(
		max_length=100,
		blank=True,
		help_text="Use a custom template"
	)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)
	published = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ("-published", "-created")

	def __str__(self):
		return self.title

	def get_absolute_url(self):
		return reverse("articles_article_detail", kwargs={"pk": self.pk, "slug": self.slug})

	def get_excerpt(self):
		if self.excerpt:
			return self.excerpt
		paragraphs = self.contents.replace("\r\n", "\n").split("\n\n")
		return paragraphs[0]

	def publish(self):
		self.draft = False
		self.published = now()
		self.save()

	@property
	def pubdate(self):
		return self.published or self.created

	@property
	def tweet_intent_url(self, intent_url="https://twitter.com/intent/tweet"):
		from urllib.parse import urlencode
		url = "https://hsreplay.net" + self.get_absolute_url()
		text = "%s - HSReplay.net" % (self.title)
		return intent_url + "?" + urlencode({"text": text, "url": url})
