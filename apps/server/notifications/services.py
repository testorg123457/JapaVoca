"""notifications 서비스 — 인앱 알림 생성 헬퍼.

이벤트 지점(출석/교환 등)에서 호출. 캐시 트랜잭션과 묶지 말고, 커밋 이후
transaction.on_commit 으로 호출해 알림 실패가 캐시에 영향 없게 한다.
"""
from django.db import transaction
from django.utils import timezone

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


# ── 전체 공지(broadcast) ─────────────────────────────────────────────────────────

BROADCAST_CHUNK = 500


def broadcast_system(qs, title, body='', *, screen='', push=False, key=None):
    """qs의 유저들에게 system 알림을 만든다. 발송한 인원 수 반환.

    ⚠️ 되돌릴 수 없는 전체 발송이라 두 가지를 지킨다:
      - **멱등성**: 같은 key로 이미 받은 유저는 건너뛴다. 재실행·더블클릭·부분 실패 후
        재시도해도 중복 발송되지 않는다. key 미지정이면 (제목·본문·화면·날짜)로 만든다.
      - **keyset 페이지네이션**(pk__gt): OFFSET 방식은 발송 중 탈퇴가 생기면 뒤 행이
        앞으로 당겨져 한 명을 건너뛴다. 마지막 pk 기준으로 넘겨 그 틈을 없앤다.
    청크마다 독립 커밋 — 중간 실패해도 앞부분은 남고, 재시도는 멱등성으로 중복을 막는다.
    """
    import hashlib

    from .models import Notification

    if key is None:
        seed = f'{title}\x1f{body}\x1f{screen}\x1f{timezone.localdate()}'
        key = hashlib.sha256(seed.encode()).hexdigest()[:16]
    data = {'broadcast_key': key}
    if screen:
        data['screen'] = screen

    already = set(
        Notification.objects.filter(
            type=Notification.Type.SYSTEM, data__broadcast_key=key,
        ).values_list('user_id', flat=True)
    )

    sent = 0
    last_pk = 0
    while True:
        chunk = list(qs.filter(pk__gt=last_pk).order_by('pk')[:BROADCAST_CHUNK])
        if not chunk:
            break
        last_pk = chunk[-1].pk
        fresh = [u for u in chunk if u.id not in already]
        if fresh:
            with transaction.atomic():
                for user in fresh:
                    notify(
                        user, Notification.Type.SYSTEM, title, body,
                        data=data, push=push,
                    )
            sent += len(fresh)
    return sent
