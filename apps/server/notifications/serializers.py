"""notifications 시리얼라이저."""
from rest_framework import serializers

from .models import Notification, PushToken


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'type', 'title', 'body', 'is_read', 'data', 'created_at', 'read_at')
        read_only_fields = fields


class PushTokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(choices=PushToken.Platform.choices, default=PushToken.Platform.ANDROID)
