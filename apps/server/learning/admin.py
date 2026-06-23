from django.contrib import admin

from .models import QuizLog, SrsState


@admin.register(SrsState)
class SrsStateAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'item_type', 'item_id', 'ease', 'interval_days',
                    'repetitions', 'due_at', 'last_result')
    list_filter = ('item_type', 'last_result')
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user',)


@admin.register(QuizLog)
class QuizLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'mode', 'item_type', 'item_id', 'question_type',
                    'is_correct', 'answer_ms', 'created_at')
    list_filter = ('mode', 'item_type', 'question_type', 'is_correct')
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user', 'box')
    readonly_fields = ('created_at',)
