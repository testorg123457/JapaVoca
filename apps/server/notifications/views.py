"""notifications 뷰 — 인앱 알림 목록/미읽음수/읽음 + 푸시 토큰 등록."""
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, PushToken
from .serializers import NotificationSerializer, PushTokenSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListView(ListAPIView):
    """GET /api/notifications/ — 내 알림(최신순, 페이지네이션)."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — 헤더 배지용 미읽음 수."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class MarkReadView(APIView):
    """POST /api/notifications/<id>/read/ — 단건 읽음."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        updated = (
            Notification.objects
            .filter(user=request.user, pk=pk, is_read=False)
            .update(is_read=True, read_at=timezone.now())
        )
        return Response({'id': pk, 'is_read': True, 'updated': updated})


class MarkAllReadView(APIView):
    """POST /api/notifications/read-all/ — 전체 읽음."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = (
            Notification.objects
            .filter(user=request.user, is_read=False)
            .update(is_read=True, read_at=timezone.now())
        )
        return Response({'updated': updated})


class PushTokenView(APIView):
    """POST/DELETE /api/notifications/push-token/ — FCM 토큰 등록/해제(upsert)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        platform = serializer.validated_data['platform']
        PushToken.objects.update_or_create(
            token=token,
            defaults={'user': request.user, 'platform': platform, 'is_active': True},
        )
        return Response({'registered': True}, status=status.HTTP_200_OK)

    def delete(self, request):
        token = request.data.get('token')
        if token:
            PushToken.objects.filter(user=request.user, token=token).update(is_active=False)
        return Response({'registered': False}, status=status.HTTP_200_OK)
