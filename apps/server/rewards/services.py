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

from .models import CashBox, Daily, Ledger, Wallet

# 개봉 시 등급별 캐시 보상 범위.
# 등급별 보상 구간 — 등급 안에서 다시 저·중·고 3구간으로 나누고 50/30/20 가중.
# 같은 등급에서도 "오늘은 좀 더 나왔네"가 생기고, 무게가 아래쪽에 실려 기대값이 눌린다.
#
# ⚠️ 구간은 **빈틈 없이** 붙인다. 중간 값이 비면 그 숫자만 영영 안 나온다.
# ⚠️ 등급끼리 **겹치지 않는다**(일반 최대 10 < 파랑 최소 11 …). 겹치면 등급을 나눈 의미가 없다.
# 근거·기대값 계산은 docs/캐시-경제-설계.md.
BOX_REWARD_BANDS = {
    CashBox.Grade.NORMAL:   [((5, 6), 50), ((7, 8), 30), ((9, 10), 20)],      # 평균 6.9
    CashBox.Grade.BLUE:     [((11, 12), 50), ((13, 14), 30), ((15, 16), 20)],  # 평균 12.9
    CashBox.Grade.PURPLE:   [((17, 24), 50), ((25, 33), 30), ((34, 40), 20)],  # 평균 26.35
    CashBox.Grade.BURGUNDY: [((41, 65), 50), ((66, 95), 30), ((96, 120), 20)], # 평균 72.25
}


def roll_box_reward(grade) -> int:
    """등급 하나에서 보상 1개를 뽑는다. 구간을 가중 추첨한 뒤 그 안에서 균등 추첨.

    ⚠️ 확률은 반드시 서버에서만 굴린다(클라이언트 값 신뢰 금지).
    """
    bands = BOX_REWARD_BANDS[grade]
    ranges, weights = zip(*bands)
    lo, hi = random.choices(ranges, weights=weights, k=1)[0]
    return random.randint(lo, hi)


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

    # 묶음 상자(burst_count>1)는 보상을 개수만큼 각각 굴린다. 인벤토리·광고 횟수는
    # 1개로 세지만 캐시는 여러 번 뽑는 셈. 원장은 묶음 하나이므로 합계 1건만 남긴다.
    count = max(1, box.burst_count)
    breakdown = [roll_box_reward(box.grade) for _ in range(count)]
    reward = sum(breakdown)

    box.reward_cash = reward
    box.reward_breakdown = breakdown
    box.status = CashBox.Status.OPENED
    box.opened_via_ad = ad_verified
    box.opened_at = timezone.now()
    box.save(update_fields=[
        'reward_cash', 'reward_breakdown', 'status', 'opened_via_ad', 'opened_at',
    ])

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
    """미개봉 상자 목록 — **먼저 받은 것부터**(FIFO).

    ⚠️ 예전엔 최신순(-created_at)이었다. 개봉 화면은 항상 목록의 첫 상자를 열기 때문에,
       그러면 오래된 상자가 계속 뒤로 밀려 영영 안 열린다. 지금은 유효기간이 없어 피해가
       없지만, 붙이는 순간 사용자 모르게 캐시가 만료된다. 재고는 먼저 들어온 것부터 나간다.
    """
    return CashBox.objects.filter(
        user=user, status=CashBox.Status.UNOPENED,
    ).order_by('created_at')


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


# ── 추천인 ──────────────────────────────────────────────────────────────────────

# 코드를 입력한 사람이 받는 캐시. 평생 1회뿐이라 티어 없이 고정.
REFERRAL_INVITEE_REWARD = 300
# 코드 주인이 받는 캐시 — 초대 인원이 늘수록 단계적으로 줄고 결국 0이 된다.
# (인원, 1명당 캐시) 순서대로 소진. 아래를 다 쓰면 그 뒤로는 보상 없음.
# 최대 수령액 = 3*300 + 5*100 = 1,400캐시.
REFERRAL_INVITER_TIERS = ((3, 300), (5, 100))
REFERRAL_MAX_INVITES = sum(n for n, _ in REFERRAL_INVITER_TIERS)  # 보상받는 총 인원
# 추천인 입력 기한 — 가입 후 이 기간 안에만 받을 수 있다.
# 오래된 계정이 뒤늦게 파밍하는 걸 막으면서, 모달을 놓쳐도 구제될 시간은 준다.
REFERRAL_REDEEM_WINDOW = timedelta(days=7)
_REFERRAL_CODE_LEN = 8
# 헷갈리는 글자(0/O, 1/I/L) 제외 — 사용자가 손으로 옮겨 적는 값이라 오입력을 줄인다.
_REFERRAL_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'


class ReferralError(CashError):
    """추천인 처리 오류(사용자에게 사유를 보여준다)."""


class ReferralNotAllowedForGuest(ReferralError):
    """게스트 계정은 추천인 보상 대상이 아님."""


class ReferralAlreadyUsed(ReferralError):
    """이미 추천인을 입력함(평생 1회)."""


class ReferralCodeInvalid(ReferralError):
    """존재하지 않는 코드."""


class ReferralSelfNotAllowed(ReferralError):
    """자기 코드 입력."""


class ReferralDeviceAlreadyUsed(ReferralError):
    """같은 기기에서 이미 추천인 보상을 받음(계정 갈아타기 방어)."""


class ReferralWindowExpired(ReferralError):
    """가입 후 입력 기한이 지남."""


class ReferralDeviceRequired(ReferralError):
    """기기 식별자 누락 — 값을 빼면 기기 제한이 무력화되므로 필수로 받는다."""


def inviter_reward_for(previous_count: int) -> int:
    """이미 previous_count 명을 초대한 사람이 '다음 1명'으로 받을 캐시.

    티어를 순서대로 소진한다(5명까지 300, 그다음 5명은 100, 이후 0).
    ⚠️ 순수함수 — 테스트 있음.
    """
    remaining = previous_count
    for count, cash in REFERRAL_INVITER_TIERS:
        if remaining < count:
            return cash
        remaining -= count
    return 0


def _gen_referral_code() -> str:
    return ''.join(random.choice(_REFERRAL_ALPHABET) for _ in range(_REFERRAL_CODE_LEN))


def get_or_create_referral_code(user) -> str:
    """내 추천 코드. 없으면 발급한다(충돌 시 재시도)."""
    if user.referral_code:
        return user.referral_code
    for _ in range(10):
        code = _gen_referral_code()
        if type(user).objects.filter(referral_code=code).exists():
            continue
        try:
            user.referral_code = code
            user.save(update_fields=['referral_code'])
            return code
        except IntegrityError:
            continue  # 동시 발급 충돌 — 다른 코드로 재시도
    raise ReferralError('추천 코드 발급에 실패했습니다. 잠시 후 다시 시도해주세요.')


def get_referral_status(user) -> dict:
    """내 코드 + 초대 실적 + 내가 입력한 추천인 여부."""
    from .models import Referral
    invited = Referral.objects.filter(inviter=user).count()
    used = Referral.objects.filter(invitee=user).first()
    earned = sum(
        r.inviter_cash for r in Referral.objects.filter(inviter=user).only('inviter_cash')
    )
    deadline = user.created_at + REFERRAL_REDEEM_WINDOW
    can_redeem = (
        not user.is_guest and used is None and timezone.now() <= deadline
    )
    return {
        'code': None if user.is_guest else get_or_create_referral_code(user),
        'is_guest': user.is_guest,
        'invited_count': invited,
        # 다음 1명을 초대하면 받을 캐시. 0이면 더 이상 받을 수 없다(강조 해제 신호).
        'next_reward': inviter_reward_for(invited),
        'earned_cash': earned,
        'max_invites': REFERRAL_MAX_INVITES,
        'invitee_reward': REFERRAL_INVITEE_REWARD,
        'used_code': bool(used),
        # 지금 추천인 코드를 입력할 수 있는지(기한·1회·게스트 반영).
        'can_redeem': can_redeem,
        'redeem_deadline': deadline.isoformat(),
    }


@transaction.atomic
def redeem_referral(user, code: str, device_id: str = ''):
    """추천인 코드 입력 — 입력자와 코드 주인 양쪽에 캐시를 지급한다.

    ⚠️ 어뷰징 방어:
      - 게스트 불가(기기 UUID로 무한 생성 가능 → 무한 파밍).
      - 입력은 평생 1회(Referral.invitee OneToOne + 여기서 선검사).
      - 자기 코드 불가.
      - 코드 주인 보상은 티어로 체감하다 0이 된다(초과분은 관계만 기록, 캐시 0).
      - 가입 후 REFERRAL_REDEEM_WINDOW 안에만 — 오래된 계정의 뒤늦은 파밍 차단.
      - 기기당 1회 — 폰 하나로 계정만 바꿔가며 반복 수령하는 걸 막는다.
        ⚠️ device_id 는 클라가 보내는 값이라 위조 가능하다. 완전한 방어가 아니라
           '흔한 파밍을 비싸게 만드는' 장치다. 근본 해결은 Play Integrity.
           값을 생략하면 제한이 통째로 무력화되므로 누락은 거부한다.
    """
    from .models import Referral

    if user.is_guest:
        raise ReferralNotAllowedForGuest('소셜 로그인 후 이용할 수 있어요.')

    normalized = (code or '').strip().upper()
    if not normalized:
        raise ReferralCodeInvalid('추천 코드를 입력해주세요.')

    if Referral.objects.filter(invitee=user).exists():
        raise ReferralAlreadyUsed('이미 추천인을 입력했어요.')

    if timezone.now() > user.created_at + REFERRAL_REDEEM_WINDOW:
        days = REFERRAL_REDEEM_WINDOW.days
        raise ReferralWindowExpired(f'추천인 입력은 가입 후 {days}일 이내에만 가능해요.')

    device = (device_id or '').strip()
    if not device:
        raise ReferralDeviceRequired('앱을 최신 버전으로 업데이트해주세요.')
    if Referral.objects.filter(device_id=device).exists():
        raise ReferralDeviceAlreadyUsed('이 기기에서는 이미 추천인 보상을 받았어요.')

    User = type(user)
    inviter = User.objects.filter(referral_code=normalized).first()
    if inviter is None:
        raise ReferralCodeInvalid('존재하지 않는 추천 코드예요.')
    if inviter.pk == user.pk:
        raise ReferralSelfNotAllowed('자기 추천 코드는 입력할 수 없어요.')
    if inviter.is_guest:
        raise ReferralCodeInvalid('사용할 수 없는 추천 코드예요.')

    # ⚠️ 두 참여자(초대자·입력자) User 행을 pk 오름차순으로 잠근다. 두 가지를 동시에 해결:
    #   (1) 초대자 행 잠금 → 같은 코드 동시 입력 시 invited_before 를 직렬화(티어 상한 준수).
    #   (2) 상호 추천(X↔Y 동시 입력)의 락 순서 역전 데드락 방지. 초대자 행만 잠그면 두 트랜잭션이
    #       서로 다른 행을 FOR UPDATE 로 쥔 채 Referral.create 의 FK 잠금(상대 행 KEY SHARE)을
    #       기다려 교착한다. 항상 낮은 pk 부터 잠가 사이클을 없앤다.
    #   per-pk 루프로 잠금 획득 순서를 쿼리 플래너와 무관하게 고정한다.
    #   (self-referral 은 위에서 이미 차단 → pk 두 개는 항상 서로 다름. inviter 객체는 pk 기반
    #    이후 참조에 그대로 유효하므로 재대입 불필요.)
    for _pk in sorted({user.pk, inviter.pk}):
        User.objects.select_for_update().get(pk=_pk)

    # 코드 주인 보상은 티어에 따라 줄어든다. 0이 돼도 관계는 남겨 실적/추적이 끊기지 않게 한다.
    invited_before = Referral.objects.filter(inviter=inviter).count()
    inviter_cash = inviter_reward_for(invited_before)

    # 선검사(invitee/device)를 통과해도 동시 요청이면 unique 제약에서 걸린다.
    # savepoint(nested atomic)로 감싸 실패해도 바깥 트랜잭션이 깨지지 않게 하고,
    # 어느 제약이 터졌는지 되물어 정확한 사유를 돌려준다.
    try:
        with transaction.atomic():
            referral = Referral.objects.create(
                inviter=inviter, invitee=user, device_id=device,
                inviter_cash=inviter_cash, invitee_cash=REFERRAL_INVITEE_REWARD,
            )
    except IntegrityError as exc:
        if Referral.objects.filter(invitee=user).exists():
            raise ReferralAlreadyUsed('이미 추천인을 입력했어요.') from exc
        raise ReferralDeviceAlreadyUsed('이 기기에서는 이미 추천인 보상을 받았어요.') from exc

    earn(
        user, REFERRAL_INVITEE_REWARD, Ledger.Reason.REFERRAL_INVITEE,
        ref_type='referral', ref_id=referral.id,
    )
    if inviter_cash:
        earn(
            inviter, inviter_cash, Ledger.Reason.REFERRAL_INVITER,
            ref_type='referral', ref_id=referral.id,
        )

    # 코드 주인은 남이 코드를 쓴 걸 알 방법이 없으므로 알림으로 알린다.
    # 캐시 트랜잭션과 분리(커밋 이후) — 알림 실패가 지급을 되돌리면 안 된다.
    def _notify_inviter():
        from notifications.models import Notification
        from notifications.services import notify
        if inviter_cash:
            title = f'친구 초대 보상 {inviter_cash:,} 캐시!'
            body = '친구가 내 추천 코드를 입력했어요.'
        else:
            # 보상 상한을 다 쓴 뒤에도 초대 사실 자체는 알린다.
            title = '친구가 내 코드를 입력했어요'
            body = '초대 보상은 모두 받아서 캐시는 지급되지 않아요.'
        notify(
            inviter, Notification.Type.REFERRAL, title, body,
            data={'screen': 'AccountSettings'}, push=True,
        )

    transaction.on_commit(_notify_inviter)
    return referral
