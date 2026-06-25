"""notifications 앱 — 인앱 알림 + 푸시 토큰.

캐시(자산)와 무관한 부가 도메인. 알림 생성은 캐시 트랜잭션 커밋 이후(on_commit)에
호출해, 알림 실패가 캐시 정합성에 영향 주지 않게 한다.
"""
from django.conf import settings
from django.db import models


class Notification(models.Model):
    """유저 인앱 알림 1건."""

    class Type(models.TextChoices):
        ATTENDANCE = 'attendance', '출석'
        STREAK = 'streak', '연속출석'
        BOX = 'box', '상자'
        EXCHANGE = 'exchange', '교환'
        QUIZ_REMINDER = 'quiz_reminder', '학습 리마인더'
        SYSTEM = 'system', '시스템'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications',
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    # 딥링크/참조 (예: {"screen": "Ledger"}). 클라가 탭 시 라우팅에 사용.
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_notifications_notification'
        verbose_name = '알림'
        verbose_name_plural = '알림'
        ordering = ('-created_at', '-id')
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'[{self.type}] {self.title} → {self.user_id}'


class PushToken(models.Model):
    """FCM 디바이스 토큰. 실제 발송은 Firebase 크리덴셜 설정 후 활성화."""

    class Platform(models.TextChoices):
        ANDROID = 'android', 'Android'
        IOS = 'ios', 'iOS'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_tokens',
    )
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices, default=Platform.ANDROID)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_notifications_pushtoken'
        verbose_name = '푸시 토큰'
        verbose_name_plural = '푸시 토큰'
        indexes = [models.Index(fields=['user', 'is_active'])]

    def __str__(self):
        return f'{self.platform} token → {self.user_id} ({"active" if self.is_active else "inactive"})'
