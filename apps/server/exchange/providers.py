"""기프티콘 발급사 연동 — 실제 연동 전 Mock.

GIFTICON_PROVIDER_URL 이 설정돼 있으면 실제 발급사 API 를 호출하고,
없으면(dev) Mock 성공 응답을 돌려준다. 호출부(services.request_exchange)는
반환 dict 의 status == 'issued' 여부로 성공/실패를 판정한다.
"""
import requests
from django.conf import settings


class GifticonIssueError(Exception):
    """발급사 호출 자체가 실패(네트워크/HTTP 오류 등)."""


def issue_gifticon(provider_order_id: str, product_code: str) -> dict:
    """기프티콘 발급 요청.

    반환 예: {'status': 'issued', 'pin': '...'} 또는 {'status': 'failed', 'reason': ...}
    멱등성 키로 provider_order_id 를 함께 보낸다(발급사가 중복 발급을 막도록).
    """
    if not settings.GIFTICON_PROVIDER_URL:
        # Mock 모드 — 항상 발급 성공.
        return {'status': 'issued', 'pin': 'MOCK-1234-5678'}

    try:
        response = requests.post(
            settings.GIFTICON_PROVIDER_URL,
            json={'order_id': provider_order_id, 'product_code': product_code},
            headers={'Authorization': f'Bearer {settings.GIFTICON_PROVIDER_KEY}'},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise GifticonIssueError(str(exc)) from exc
