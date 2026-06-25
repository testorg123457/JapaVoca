"""notifications URL — /api/notifications/ 하위."""
from django.urls import path

from .views import (
    MarkAllReadView,
    MarkReadView,
    NotificationListView,
    PushTokenView,
    UnreadCountView,
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='list'),
    path('unread-count/', UnreadCountView.as_view(), name='unread-count'),
    path('read-all/', MarkAllReadView.as_view(), name='read-all'),
    path('push-token/', PushTokenView.as_view(), name='push-token'),
    path('<int:pk>/read/', MarkReadView.as_view(), name='read'),
]
