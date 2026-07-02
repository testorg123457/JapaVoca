"""rewards 서비스 — 캐시 트랜잭션(원장 + 잔액 원자성) + 상자 개봉.

⚠️ 캐시 정합성 핵심:
  - 모든 적립/사용은 `earn()` / `use()` 만 통해서 한다. Wallet/Ledger 를 직접 조작 금지.
  - 잔액 갱신 + 원장 기록을 **하나의 트랜잭션**으로 처리한다.
  - 잔액 행을 select_for_update 로 잠가 동시성 하의 음수/이중차감을 막는다.
  - 불변식: wallet.balance == Σ(earn.amount) − Σ(use.amount).
"""
import random
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Attendance, CashBox, Daily, Ledger, Wallet

# 개봉 시 등급별 캐시 보상 범위.
BOX_REWARD_RANGE = {
    CashBox.Grade.NORMAL: (1, 4),    # 기존 (10,40)의 1/10, 최대치 축소 (임시)
    CashBox.Grade.PURPLE: (5, 15),   # 일반 최대치(4) 초과부터 (임시)
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


class AdNotVerifiedForBox(CashError):
    """광고 보상이 SSV 검증되지 않음 — 광고 개봉 거부."""


@transaction.atomic
def open_cash_box(user, box_id, *, ad_verified=False, ad_log_id=None) -> tuple[CashBox, Ledger]:
    """캐시상자 개봉 — 보상 캐시 확정 + earn() 적립을 원자적으로 처리.

    광고 보고 개봉하는 상자는 ad_verified=True(SSV 검증 통과 후 호출).
    실제 검증 모드(settings.ADMOB_SSV_VERIFY=True)에서 ad_log_id 가 주어지면
    해당 AdRewardLog 가 verified=True 인지 확인한다. Mock 모드거나 ad_log_id 가
    없으면 검증을 건너뛴다(지시서 B-2).
    """
    if settings.ADMOB_SSV_VERIFY and ad_log_id is not None:
        from exchange.models import AdRewardLog  # 순환 import 회피(지연).
        verified = AdRewardLog.objects.filter(
            id=ad_log_id, user=user, verified=True,
        ).exists()
        if not verified:
            raise AdNotVerifiedForBox('광고 보상이 검증되지 않았습니다.')

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


def list_unopened_boxes(user):
    """미개봉 상자 목록(최신순)."""
    return CashBox.objects.filter(
        user=user, status=CashBox.Status.UNOPENED,
    ).order_by('-created_at')


# 출석 보너스 — 7일 주기로 반복(japavoca-plan.md 3.5: 1일 기본 / 2~6일 점증 / 7일 대형).
# streak_count 자체는 누적(연속 출석 N일째 표시용)이고, 보너스 금액만 7일 주기로 순환한다.
ATTENDANCE_CYCLE_LENGTH = 7
BASE_ATTENDANCE_BONUS = 10
# 7일차(주간 연속 출석 완성)는 +30C 고정 보너스. 2~6일차는 점증.
STREAK_BONUS_BY_CYCLE_DAY = {2: 5, 3: 10, 4: 15, 5: 20, 6: 30, 7: 30}


class AlreadyCheckedIn(CashError):
    """오늘 이미 출석 체크함."""


def get_today_attendance(user) -> dict:
    """오늘 출석 여부 + 최신 스트릭 조회. 부수효과 없음(체크인은 check_in() 으로만)."""
    today = timezone.localdate()
    latest = Attendance.objects.filter(user=user).order_by('-date').first()
    if latest is None:
        return {'checked_in': False, 'streak_count': 0, 'bonus_cash': 0}
    checked_in = latest.date == today
    return {
        'checked_in': checked_in,
        'streak_count': latest.streak_count,
        'bonus_cash': latest.bonus_cash if checked_in else 0,
    }


@transaction.atomic
def check_in(user) -> Attendance:
    """출석 체크 — streak 계산 + 보너스 캐시 적립(원장 기록 포함)을 원자적으로 처리.

    하루 1회만 허용(Attendance.user+date unique 제약). 이미 체크인했으면 AlreadyCheckedIn.
    적립은 reason=ATTENDANCE(기본분) / reason=STREAK(연속출석 가산분)로 나눠 원장에 남긴다.
    """
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    previous = Attendance.objects.filter(user=user, date=yesterday).first()
    streak_count = previous.streak_count + 1 if previous else 1
    day_in_cycle = (streak_count - 1) % ATTENDANCE_CYCLE_LENGTH + 1
    streak_bonus = STREAK_BONUS_BY_CYCLE_DAY.get(day_in_cycle, 0)
    total_bonus = BASE_ATTENDANCE_BONUS + streak_bonus
    is_cycle_reward = day_in_cycle == ATTENDANCE_CYCLE_LENGTH

    try:
        attendance = Attendance.objects.create(
            user=user, date=today, streak_count=streak_count,
            bonus_cash=total_bonus, is_cycle_reward=is_cycle_reward,
        )
    except IntegrityError as exc:
        raise AlreadyCheckedIn('오늘 이미 출석 체크했습니다.') from exc

    earn(
        user, BASE_ATTENDANCE_BONUS, Ledger.Reason.ATTENDANCE,
        ref_type='attendance', ref_id=attendance.id,
    )
    if streak_bonus > 0:
        earn(
            user, streak_bonus, Ledger.Reason.STREAK,
            ref_type='attendance', ref_id=attendance.id,
        )

    daily, _ = Daily.objects.get_or_create(user=user, date=today)
    daily = Daily.objects.select_for_update().get(pk=daily.pk)
    daily.attended = True
    daily.cash_earned += total_bonus
    daily.save(update_fields=['attended', 'cash_earned', 'updated_at'])

    # 인앱 알림은 캐시 트랜잭션 커밋 이후에 생성(실패해도 캐시에 영향 없게).
    def _notify():
        from notifications.models import Notification
        from notifications.services import notify
        if is_cycle_reward:
            notify(
                user, Notification.Type.STREAK,
                f'{streak_count}일 연속 출석 보너스!',
                f'연속 출석 보너스로 +{total_bonus}C 적립됐어요.',
                data={'screen': 'Attendance'}, push=True,
            )
        else:
            notify(
                user, Notification.Type.ATTENDANCE,
                '오늘 출석 완료!',
                f'출석 보너스 +{total_bonus}C 적립됐어요.',
                data={'screen': 'Attendance'}, push=True,
            )

    transaction.on_commit(_notify)
    return attendance


def get_today_daily(user) -> dict:
    """오늘의 학습 현황(문제수/정답수/획득 상자수). 데이터 없으면 0."""
    daily = Daily.objects.filter(user=user, date=timezone.localdate()).first()
    if daily is None:
        return {'quiz_count': 0, 'correct_count': 0, 'boxes_earned': 0}
    return {
        'quiz_count': daily.quiz_count,
        'correct_count': daily.correct_count,
        'boxes_earned': daily.boxes_earned,
    }
