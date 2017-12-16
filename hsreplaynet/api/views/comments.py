from django_comments.models import Comment
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import RetrieveDestroyAPIView

from ..permissions import IsOwnerOrStaff
from ..serializers.comments import CommentSerializer


class CommentDetailView(RetrieveDestroyAPIView):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsOwnerOrStaff, )
	queryset = Comment.objects.filter(is_removed=False)
	serializer_class = CommentSerializer

	def perform_destroy(self, instance):
		instance.is_removed = True
		instance.save()
