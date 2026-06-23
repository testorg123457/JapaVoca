"""rewards 서비스 — 캐시 트랜잭션(원장 + 잔액 원자성) + 상자 개봉.

⚠️ 캐시 정합성 핵심:
  - 모든 적립/사용은 `earn()` / `use()` 만 통해서 한다. Wallet/Ledger 를 직접 조작 금지.
  - 잔액 갱신 + 원장 기록을 **하나의 트랜잭션**으로 처리한다.
  - 잔액 행을 select_for_update 로 잠가 동시성 하의 음수/이중차감을 막는다.
  - 불변식: wallet.balance == Σ(earn.amount) − Σ(use.amount).
"""
import random

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import CashBox, Ledger, Wallet

# 개봉 시 등급별 캐시 보상 범위.
BOX_REWARD_RANGE = {
    CashBox.Grade.NORMAL: (5, 30),
    CashBox.Grade.RARE: (50, 150),
    CashBox.Grade.JACKPOT: (300, 1000),
}


class CashError(Exception):
    """캐시 처리 일반 오류."""


class InvalidAmount(CashError):
    """금액이 양의 정수가 아님."""


class InsufficientBalance(CashError):
    """잔액 부족."""


def _lock_wallet(user) -> Wallet:
    """유저 지갑을 (없으면 생성 후) 행 잠금 상태로 가져온다. 트랜잭션 안에서만 호출."""
    Wallet.objects.get_or_create(user=user)
    return Wallet.objects.select_for_update().get(pk=user.pk)


@transaction.atomic
def earn(user, amount, reason, *, ref_type='', ref_id=None, ad_verified=False) -> Ledger:
    """캐시 적립. 잔액 증가 + earn 원장 기록을 원자적으로 처리하고 Ledger 반환."""
    if not isinstance(amount, int) or amount <= 0:
        raise InvalidAmount('amount 는 양의 정수여야 합니다.')

    wallet = _lock_wallet(user)
    wallet.balance += amount
    wallet.total_earned += amount
    wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])

    return Ledger.objects.create(
        user=user,
        direction=Ledger.Direction.EARN,
        amount=amount,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
        balance_after=wallet.balance,
        ad_verified=ad_verified,
    )


@transaction.atomic
def use(user, amount, reason, *, ref_type='', ref_id=None) -> Ledger:
    """캐시 사용(차감). 잔액 부족 시 InsufficientBalance. 잔액 감소 + use 원장 기록을 원자적으로 처리."""
    if not isinstance(amount, int) or amount <= 0:
        raise InvalidAmount('amount 는 양의 정수여야 합니다.')

    wallet = _lock_wallet(user)
    if wallet.balance < amount:
        raise InsufficientBalance(f'잔액 부족: balance={wallet.balance}, 요청={amount}')

    wallet.balance -= amount
    wallet.total_used += amount
    wallet.save(update_fields=['balance', 'total_used', 'updated_at'])

    return Ledger.objects.create(
        user=user,
        direction=Ledger.Direction.USE,
        amount=amount,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
        balance_after=wallet.balance,
    )


class BoxAlreadyOpened(CashError):
    """이미 개봉된 상자."""


@transaction.atomic
def open_cash_box(user, box_id, *, ad_verified=False) -> tuple[CashBox, Ledger]:
    """캐시상자 개봉 — 보상 캐시 확정 + earn() 적립을 원자적으로 처리.

    광고 보고 개봉하는 상자는 ad_verified=True(SSV 검증 통과 후 호출).
    """
    box = CashBox.objects.select_for_update().get(id=box_id, user=user)
    if box.status == CashBox.Status.OPENED:
        raise BoxAlreadyOpened('이미 개봉된 상자입니다.')

    lo, hi = BOX_REWARD_RANGE[box.grade]
    reward = random.randint(lo, hi)

    box.reward_cash = reward
    box.status = CashBox.Status.OPENED
    box.opened_via_ad = ad_verified
    box.opened_at = timezone.now()
    box.save(update_fields=['reward_cash', 'status', 'opened_via_ad', 'opened_at'])

    ledger = earn(
        user, reward, Ledger.Reason.QUIZ_BOX,
        ref_type='cash_box', ref_id=box.id, ad_verified=ad_verified,
    )
    return box, ledger


def get_balance(user) -> int:
    wallet = Wallet.objects.filter(pk=user.pk).first()
    return wallet.balance if wallet else 0


def wallet_is_consistent(user) -> bool:
    """감사용: wallet.balance == earn합 − use합 인지 검증."""
    wallet = Wallet.objects.filter(pk=user.pk).first()
    if wallet is None:
        return True
    agg = Ledger.objects.filter(user=user)
    earned = agg.filter(direction=Ledger.Direction.EARN).aggregate(s=Sum('amount'))['s'] or 0
    used = agg.filter(direction=Ledger.Direction.USE).aggregate(s=Sum('amount'))['s'] or 0
    return wallet.balance == earned - used
