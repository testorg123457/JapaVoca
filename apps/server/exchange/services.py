"""exchange 서비스 — 기프티콘 교환(캐시 차감 + 발급 + 실패 시 환불).

캐시 정합성(CLAUDE.md):
  - 차감은 rewards.services.use(), 환불은 earn() 만 사용(잔액+원장 원자성 보장).
  - 외부 발급 I/O 는 DB 트랜잭션 *밖*에서 호출한다(긴 락/롤백 시 기록 소실 방지).
  - provider_order_id(멱등성 키)로 중복 교환을 막는다.
"""
import uuid

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from rewards.models import Ledger
from rewards.services import use, earn

from .models import AdRewardLog, GiftExchange
from .products import get_product
from .providers import GifticonIssueError, issue_gifticon


class ExchangeError(Exception):
    """교환 처리 일반 오류."""


class AdNotVerified(ExchangeError):
    """광고 미시청 — 교환 불가."""


class InvalidProduct(ExchangeError):
    """존재하지 않는 상품."""


class ExchangeIssueFailed(ExchangeError):
    """발급 실패(환불 완료). 실패한 GiftExchange 를 담아 전달한다."""

    def __init__(self, gift: GiftExchange):
        super().__init__('기프티콘 발급에 실패했습니다.')
        self.gift = gift


def request_exchange(
    user, product_code, ad_verified, idempotency_key=None, ad_log_id=None,
) -> GiftExchange:
    """교환 요청. 성공 시 issued GiftExchange 반환, 발급 실패 시 환불 후 예외.

    ⚠️ 캐시 유출 경로이므로 광고 검증을 box 개봉보다 엄격히 적용한다:
    실제 검증 모드(settings.ADMOB_SSV_VERIFY=True)면 ad_log_id 가 가리키는
    AdRewardLog 가 verified=True · context=EXCHANGE · 미소비(ref_id 없음)여야
    하며, 교환 생성 시 그 로그를 소비 처리(ref_id 설정)해 1광고=1교환을 보장한다.
    Mock 모드(False)면 클라가 보낸 ad_verified 불리언만 본다(지시서 A-2).
    """
    if not ad_verified:
        raise AdNotVerified('광고 시청이 필요합니다.')

    product = get_product(product_code)
    if product is None:
        raise InvalidProduct('유효하지 않은 상품입니다.')

    order_id = idempotency_key or str(uuid.uuid4())
    price_cash = product['price_cash']

    # 멱등: 같은 주문 id 가 이미 있으면 그대로 반환(재시도 안전).
    existing = GiftExchange.objects.filter(provider_order_id=order_id).first()
    if existing is not None:
        return existing

    # 1) (실제 모드면)광고 검증 + 교환 생성 + 캐시 차감(원자적).
    with transaction.atomic():
        ad_log = None
        if settings.ADMOB_SSV_VERIFY:
            ad_log = (
                AdRewardLog.objects.select_for_update().filter(
                    id=ad_log_id, user=user, verified=True,
                    reward_context=AdRewardLog.RewardContext.EXCHANGE,
                    ref_id__isnull=True,
                ).first()
                if ad_log_id is not None
                else None
            )
            if ad_log is None:
                raise AdNotVerified('광고 보상이 검증되지 않았습니다.')

        try:
            with transaction.atomic():  # savepoint: 동시 중복 create 충돌 흡수
                gift = GiftExchange.objects.create(
                    user=user,
                    product_code=product_code,
                    cash_cost=price_cash,
                    provider=product['provider'],
                    provider_order_id=order_id,
                    status=GiftExchange.Status.REQUESTED,
                    ad_verified=ad_verified,
                )
        except IntegrityError:
            return GiftExchange.objects.get(provider_order_id=order_id)

        if ad_log is not None:
            ad_log.ref_id = gift.id  # 광고 로그 소비(재사용 차단).
            ad_log.save(update_fields=['ref_id'])

        use(
            user, price_cash, Ledger.Reason.EXCHANGE,
            ref_type='gift_exchange', ref_id=gift.id,
        )

    # 2) 발급사 호출(외부 I/O — 트랜잭션 밖).
    try:
        result = issue_gifticon(order_id, product_code)
    except GifticonIssueError:
        result = {'status': 'failed'}

    if result.get('status') == 'issued':
        gift.status = GiftExchange.Status.ISSUED
        gift.issued_at = timezone.now()
        gift.save(update_fields=['status', 'issued_at'])
        return gift

    # 3) 발급 실패 → 캐시 환불 + 상태 갱신(원자적). 차감과 상쇄되어 net 0.
    with transaction.atomic():
        earn(
            user, price_cash, Ledger.Reason.ADMIN_ADJUST,
            ref_type='gift_exchange', ref_id=gift.id,
        )
        gift.status = GiftExchange.Status.FAILED
        gift.save(update_fields=['status'])
    raise ExchangeIssueFailed(gift)
