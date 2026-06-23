"""Django 시작 시 Celery 앱을 로드해 @shared_task 가 이 앱에 등록되게 한다."""
from .celery import app as celery_app

__all__ = ('celery_app',)
