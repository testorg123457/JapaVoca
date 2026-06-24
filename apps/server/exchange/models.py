"""exchange 앱 — 기프티콘 교환 / 광고 SSV 검증 도메인."""
from django.conf import settings
from django.db import models


class GiftExchange(models.Model):
    """기프티콘 교환.

    provider_order_id 를 멱등성 키로 사용해 중복 발급을 막는다.
    발급 실패 시 차감 캐시는 롤백/환불(status=refunded)한다.
    유저 삭제로 교환 이력이 사라지면 안 되므로 user FK 는 PROTECT.
    """

    class Status(models.TextChoices):
        REQUESTED = 'requested', '요청됨'
        ISSUED = 'issued', '발급완료'
        FAILED = 'failed', '실패'
        REFUNDED = 'refunded', '환불됨'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='gift_exchanges',
    )
    product_code = models.CharField(max_length=100, help_text='발급사 상품 코드')
    cash_cost = models.BigIntegerField(help_text='차감 캐시')
    provider = models.CharField(max_length=50, help_text='발급사(예: giftshow)')
    provider_order_id = models.CharField(
        max_length=200, unique=True, help_text='발급사 주문 id(멱등성 키)',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.REQUESTED,
    )
    ad_verified = models.BooleanField(default=False, help_text='교환 광고 시청 SSV 검증')
    created_at = models.DateTimeField(auto_now_add=True)
    issued_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_exchange_giftexchange'
        verbose_name = '기프티콘 교환'
        verbose_name_plural = '기프티콘 교환'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_gift_user_created'),
            models.Index(fields=['status'], name='idx_gift_status'),
        ]

    def __str__(self):
        return f'{self.user_id} {self.product_code} ({self.status})'


class AdRewardLog(models.Model):
    """광고 SSV(서버 검증) 로그. 검증 통과(verified=True) 시에만 보상 지급."""

    class RewardContext(models.TextChoices):
        BOX_OPEN = 'box_open', '상자 개봉'
        EXCHANGE = 'exchange', '교환'
        BONUS = 'bonus', '보너스'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ad_reward_logs',
    )
    ad_unit = models.CharField(max_length=100, help_text='AdMob 광고 유닛 ID')
    ssv_signature = models.TextField(help_text='AdMob SSV 검증 데이터')
    # SSV 콜백 멱등성 키. 같은 transaction_id 재수신은 중복 처리하지 않는다.
    transaction_id = models.CharField(
        max_length=200, null=True, blank=True, unique=True,
        help_text='AdMob SSV transaction_id(멱등성 키)',
    )
    verified = models.BooleanField(default=False, help_text='검증 성공 여부')
    reward_context = models.CharField(max_length=10, choices=RewardContext.choices)
    ref_id = models.PositiveIntegerField(
        null=True, blank=True, help_text='연결된 CashBox.id 또는 GiftExchange.id',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_exchange_adrewardlog'
        verbose_name = '광고 보상 로그'
        verbose_name_plural = '광고 보상 로그'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_adlog_user_created'),
        ]

    def __str__(self):
        return f'{self.user_id} {self.reward_context} verified={self.verified}'
