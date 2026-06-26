from django.contrib import admin
from django.utils import timezone

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'short_content', 'created_at', 'answered_at', 'is_answer_read')
    list_filter = ('is_answer_read',)
    search_fields = ('user__email', 'user__nickname', 'content')
    readonly_fields = ('user', 'content', 'created_at', 'answered_at', 'is_answer_read')
    ordering = ('-created_at',)

    @admin.display(description='문의 내용')
    def short_content(self, obj):
        return obj.content[:40] + ('…' if len(obj.content) > 40 else '')

    def save_model(self, request, obj, form, change):
        if obj.answer == '':
            obj.answer = None
        if change and 'answer' in form.changed_data and obj.answer:
            obj.answered_at = timezone.now()
        super().save_model(request, obj, form, change)
