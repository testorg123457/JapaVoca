"""notifications 서비스 — 인앱 알림 생성 헬퍼.

이벤트 지점(출석/교환 등)에서 호출. 캐시 트랜잭션과 묶지 말고, 커밋 이후
transaction.on_commit 으로 호출해 알림 실패가 캐시에 영향 없게 한다.
"""
from .models import Notification
from .push import send_push


def notify(user, type, title, body='', data=None, push=False):
    """인앱 알림 1건 생성(+선택적 푸시). 생성된 Notification 반환.

    push=True 면 유저 환경설정에 따라 푸시도 시도(현재는 stub 로그).
    """
    notification = Notification.objects.create(
        user=user,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    if push:
        try:
            send_push(user, title, body, data)
        except Exception:  # noqa: BLE001 — 푸시 실패는 인앱 알림에 영향 주지 않음
            pass
    return notification
