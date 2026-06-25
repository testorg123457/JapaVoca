"""푸시 발송 추상화.

실제 FCM 발송은 Firebase 서비스계정 크리덴셜이 필요하다(03-구현순서-선결조건.md).
크리덴셜이 없는 현재는 LoggingProvider 가 콘솔 로그만 남긴다. settings.FCM_ENABLED 가
켜지고 firebase-admin 이 설치되면 FcmProvider 로 교체한다.
"""
import logging

from django.conf import settings

logger = logging.getLogger('notifications.push')


def _active_tokens(user):
    from .models import PushToken
    return list(
        PushToken.objects.filter(user=user, is_active=True).values_list('token', flat=True)
    )


def send_push(user, title: str, body: str, data: dict | None = None) -> bool:
    """유저의 활성 디바이스로 푸시 발송 시도.

    유저 환경설정(push_enabled)을 존중. 크리덴셜 미설정이면 로그만 남기고 False 반환.
    반환값은 "실제 발송 성공" 여부(현재 stub 은 항상 False).
    """
    if not getattr(user, 'push_enabled', True):
        return False
    tokens = _active_tokens(user)
    if not tokens:
        return False

    if getattr(settings, 'FCM_ENABLED', False):
        # TODO: firebase-admin messaging 으로 실제 발송(크리덴셜 주입 후).
        logger.info('FCM enabled but FcmProvider not wired yet (creds pending).')
        return False

    logger.info('[push stub] user=%s title=%s tokens=%d data=%s', user.id, title, len(tokens), data or {})
    return False
