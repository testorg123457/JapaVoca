"""rewards 시리얼라이저 — 거래 내역(원장) 응답용."""
from rest_framework import serializers

from .models import Ledger


class LedgerSerializer(serializers.ModelSerializer):
    """거래 내역 1건. 원장은 불변이라 전 필드 read-only."""

    class Meta:
        model = Ledger
        fields = (
            'id', 'direction', 'amount', 'reason',
            'ref_type', 'ref_id', 'balance_after', 'created_at',
        )
        read_only_fields = fields
