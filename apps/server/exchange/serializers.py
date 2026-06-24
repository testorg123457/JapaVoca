"""exchange 시리얼라이저."""
from rest_framework import serializers

from .models import GiftExchange


class ExchangeRequestSerializer(serializers.Serializer):
    """교환 요청 입력."""

    product_code = serializers.CharField()
    ad_verified = serializers.BooleanField()
    # 네트워크 재시도 멱등용(선택). 없으면 서버가 UUID 생성.
    idempotency_key = serializers.CharField(required=False, allow_blank=True)
    # 실제 SSV 검증 모드에서 광고 시청 증빙(AdRewardLog.id). Mock 모드면 무시.
    ad_log_id = serializers.IntegerField(required=False, allow_null=True)


class GiftExchangeSerializer(serializers.ModelSerializer):
    """교환 1건 응답."""

    class Meta:
        model = GiftExchange
        fields = (
            'id', 'product_code', 'cash_cost', 'provider', 'provider_order_id',
            'status', 'ad_verified', 'created_at', 'issued_at',
        )
        read_only_fields = fields
