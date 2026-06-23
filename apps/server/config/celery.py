"""Celery 앱 설정 + Beat 스케줄.

브로커는 CELERY_BROKER_URL(기본 redis://localhost:6379/0). 설정은 Django settings 의
CELERY_ 네임스페이스에서 읽는다.
"""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('japavoca')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# 주기 실행 스케줄: 매일 새벽 3시(서버 로컬타임=CELERY_TIMEZONE) QuizLog 7일 배치 삭제.
app.conf.beat_schedule = {
    'delete-old-quiz-logs': {
        'task': 'learning.tasks.delete_old_quiz_logs',
        'schedule': crontab(hour=3, minute=0),
    },
}
