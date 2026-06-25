from django.contrib import admin

from .models import Notification, PushToken


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('title', 'body')


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'platform', 'is_active', 'updated_at')
    list_filter = ('platform', 'is_active')
