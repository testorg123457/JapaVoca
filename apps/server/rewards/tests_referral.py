"""추천인 기능 테스트 — 지급 정합성 + 어뷰징 방어.

캐시 정합성(CLAUDE.md): 지급은 earn()만 통하고 wallet.balance == (earn합 − use합).
어뷰징: 게스트 불가 / 평생 1회 / 자기추천 불가 / 초대 보상 상한.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User

from .models import Ledger, Referral, Wallet
from .services import (
    REFERRAL_REDEEM_WINDOW,
    REFERRAL_INVITEE_REWARD,
    REFERRAL_INVITER_TIERS,
    REFERRAL_MAX_INVITES,
    ReferralAlreadyUsed,
    ReferralCodeInvalid,
    ReferralDeviceAlreadyUsed,
    ReferralDeviceRequired,
    ReferralNotAllowedForGuest,
    ReferralSelfNotAllowed,
    ReferralWindowExpired,
    get_or_create_referral_code,
    inviter_reward_for,
    get_referral_status,
    redeem_referral,
)


def _social(n):
    return User.objects.create_user(google_uid=f'g-ref-{n}', email=f'ref{n}@x.com')


def _guest(n):
    return User.objects.create(guest_uid=f'guest-ref-{n}', provider=User.Provider.GUEST)


def _balance(user):
    w = Wallet.objects.filter(pk=user.pk).first()
    return w.balance if w else 0


class ReferralCodeTest(TestCase):
    def test_code_is_issued_once_and_stable(self):
        u = _social(1)
        code = get_or_create_referral_code(u)
        self.assertEqual(len(code), 8)
        self.assertEqual(get_or_create_referral_code(u), code)

    def test_codes_are_unique_across_users(self):
        codes = {get_or_create_referral_code(_social(i)) for i in range(20)}
        self.assertEqual(len(codes), 20)

    def test_code_avoids_confusable_characters(self):
        """0/O, 1/I/L 은 손으로 옮겨 적을 때 헷갈리므로 코드에 넣지 않는다."""
        for i in range(30):
            code = get_or_create_referral_code(_social(100 + i))
            self.assertFalse(set(code) & set('01OIL'), code)


class RedeemReferralTest(TestCase):
    def setUp(self):
        self.inviter = _social(1)
        self.invitee = _social(2)
        self.code = get_or_create_referral_code(self.inviter)

    def test_both_sides_get_cash(self):
        redeem_referral(self.invitee, self.code, device_id='dev-main')
        self.assertEqual(_balance(self.invitee), REFERRAL_INVITEE_REWARD)
        self.assertEqual(_balance(self.inviter), REFERRAL_INVITEE_REWARD)

    def test_ledger_rows_recorded_with_reasons(self):
        redeem_referral(self.invitee, self.code, device_id='dev-main')
        self.assertTrue(Ledger.objects.filter(
            user=self.invitee, reason=Ledger.Reason.REFERRAL_INVITEE,
        ).exists())
        self.assertTrue(Ledger.objects.filter(
            user=self.inviter, reason=Ledger.Reason.REFERRAL_INVITER,
        ).exists())

    def test_balance_matches_ledger(self):
        redeem_referral(self.invitee, self.code, device_id='dev-main')
        for u in (self.inviter, self.invitee):
            rows = Ledger.objects.filter(user=u)
            earned = sum(r.amount for r in rows if r.direction == Ledger.Direction.EARN)
            used = sum(r.amount for r in rows if r.direction == Ledger.Direction.USE)
            self.assertEqual(_balance(u), earned - used)

    def test_code_is_case_and_space_insensitive(self):
        redeem_referral(self.invitee, f'  {self.code.lower()} ', device_id='dev-main')
        self.assertEqual(_balance(self.invitee), REFERRAL_INVITEE_REWARD)

    # ── 어뷰징 방어 ──────────────────────────────────────────────────────────

    def test_guest_cannot_redeem(self):
        """게스트는 기기 UUID로 무한 생성 가능 → 무한 파밍을 막는다."""
        guest = _guest(1)
        with self.assertRaises(ReferralNotAllowedForGuest):
            redeem_referral(guest, self.code, device_id='dev-guest')
        self.assertEqual(_balance(guest), 0)
        self.assertEqual(_balance(self.inviter), 0)

    def test_guest_code_is_rejected(self):
        guest = _guest(2)
        guest.referral_code = 'GUESTAAA'
        guest.save(update_fields=['referral_code'])
        with self.assertRaises(ReferralCodeInvalid):
            redeem_referral(self.invitee, 'GUESTAAA', device_id='dev-x')

    def test_cannot_redeem_twice(self):
        redeem_referral(self.invitee, self.code, device_id='dev-main')
        other = _social(3)
        with self.assertRaises(ReferralAlreadyUsed):
            redeem_referral(self.invitee, get_or_create_referral_code(other), device_id='dev-b')
        self.assertEqual(_balance(self.invitee), REFERRAL_INVITEE_REWARD)  # 두 번 안 받음

    def test_cannot_use_own_code(self):
        with self.assertRaises(ReferralSelfNotAllowed):
            redeem_referral(self.inviter, self.code, device_id='dev-self')
        self.assertEqual(_balance(self.inviter), 0)

    def test_unknown_code_rejected(self):
        with self.assertRaises(ReferralCodeInvalid):
            redeem_referral(self.invitee, 'ZZZZZZZZ', device_id='dev-x')
        self.assertEqual(_balance(self.invitee), 0)

    def test_empty_code_rejected(self):
        for bad in ('', '   ', None):
            with self.assertRaises(ReferralCodeInvalid):
                redeem_referral(self.invitee, bad, device_id='dev-x')

    def test_inviter_reward_tiers_down_then_stops(self):
        """티어대로 줄다가 0 — 대량 계정 생성 피해를 총액으로 고정."""
        total = sum(n * cash for n, cash in REFERRAL_INVITER_TIERS)
        for i in range(REFERRAL_MAX_INVITES + 3):
            redeem_referral(_social(200 + i), self.code, device_id=f'dev-{i}')

        self.assertEqual(_balance(self.inviter), total)
        # 관계는 전부 기록된다(추적이 끊기면 안 됨).
        self.assertEqual(
            Referral.objects.filter(inviter=self.inviter).count(),
            REFERRAL_MAX_INVITES + 3,
        )
        # 상한 이후 초대받은 사람은 그래도 자기 몫을 받는다.
        self.assertEqual(Referral.objects.filter(inviter=self.inviter, inviter_cash=0).count(), 3)
        for r in Referral.objects.filter(inviter=self.inviter):
            self.assertEqual(r.invitee_cash, REFERRAL_INVITEE_REWARD)

    def test_reward_amount_per_position(self):
        """각 초대 순번이 실제로 티어 금액을 받는지(기대값은 상수에서 생성)."""
        expected = [cash for n, cash in REFERRAL_INVITER_TIERS for _ in range(n)]
        for i in range(len(expected)):
            redeem_referral(_social(300 + i), self.code, device_id=f'dev-p{i}')
        cashes = list(
            Referral.objects.filter(inviter=self.inviter)
            .order_by('id').values_list('inviter_cash', flat=True)
        )
        self.assertEqual(cashes, expected)

    def test_failed_redeem_leaves_no_trace(self):
        """실패하면 관계도 캐시도 남지 않아야 한다(부분 반영 금지)."""
        with self.assertRaises(ReferralCodeInvalid):
            redeem_referral(self.invitee, 'NOPENOPE', device_id='dev-x')
        self.assertFalse(Referral.objects.filter(invitee=self.invitee).exists())
        self.assertFalse(Ledger.objects.filter(user=self.invitee).exists())


class ReferralStatusTest(TestCase):
    def test_status_reports_counts(self):
        inviter = _social(1)
        code = get_or_create_referral_code(inviter)
        redeem_referral(_social(2), code, device_id='dev-s2')
        redeem_referral(_social(3), code, device_id='dev-s3')

        st = get_referral_status(inviter)
        self.assertEqual(st['code'], code)
        self.assertEqual(st['invited_count'], 2)
        self.assertEqual(st['earned_cash'], 600)
        self.assertEqual(st['next_reward'], 300)
        self.assertFalse(st['used_code'])

    def test_status_next_reward_follows_tier(self):
        inviter = _social(1)
        code = get_or_create_referral_code(inviter)
        first_count, _ = REFERRAL_INVITER_TIERS[0]
        for i in range(first_count):
            redeem_referral(_social(400 + i), code, device_id=f'dev-t{i}')
        # 첫 티어를 다 쓰면 다음 티어 금액으로 내려간다.
        self.assertEqual(
            get_referral_status(inviter)['next_reward'], REFERRAL_INVITER_TIERS[1][1],
        )
        for i in range(REFERRAL_MAX_INVITES - first_count):
            redeem_referral(_social(500 + i), code, device_id=f'dev-u{i}')
        # 다 소진되면 0 — 화면에서 강조를 끄는 신호로 쓴다.
        self.assertEqual(get_referral_status(inviter)['next_reward'], 0)
        self.assertEqual(
            get_referral_status(inviter)['earned_cash'],
            sum(n * cash for n, cash in REFERRAL_INVITER_TIERS),
        )

    def test_guest_status_has_no_code(self):
        st = get_referral_status(_guest(9))
        self.assertIsNone(st['code'])
        self.assertTrue(st['is_guest'])

    def test_used_code_flag(self):
        inviter = _social(1)
        invitee = _social(2)
        redeem_referral(invitee, get_or_create_referral_code(inviter), device_id='dev-used')
        self.assertTrue(get_referral_status(invitee)['used_code'])


class InviterRewardTierTest(TestCase):
    """티어 계산 순수함수 — 기대값을 상수에서 끌어와 숫자를 바꿔도 유효하게."""

    def test_each_tier_pays_its_rate(self):
        position = 0
        for count, cash in REFERRAL_INVITER_TIERS:
            for _ in range(count):
                self.assertEqual(inviter_reward_for(position), cash, f'{position}번째')
                position += 1

    def test_beyond_last_tier_is_zero(self):
        for n in (REFERRAL_MAX_INVITES, REFERRAL_MAX_INVITES + 1, 500):
            self.assertEqual(inviter_reward_for(n), 0)

    def test_reward_never_increases(self):
        """티어는 단조 감소여야 한다 — 뒤로 갈수록 유리해지면 안 된다."""
        values = [inviter_reward_for(n) for n in range(REFERRAL_MAX_INVITES + 5)]
        self.assertEqual(values, sorted(values, reverse=True))

    def test_total_is_bounded(self):
        expected = sum(n * cash for n, cash in REFERRAL_INVITER_TIERS)
        self.assertEqual(sum(inviter_reward_for(n) for n in range(500)), expected)


class ReferralWindowTest(TestCase):
    """가입 후 기한 안에만 입력 가능 — 오래된 계정의 뒤늦은 파밍 차단."""

    def setUp(self):
        self.inviter = _social(1)
        self.code = get_or_create_referral_code(self.inviter)

    def _age_account(self, user, days):
        """가입 시각을 과거로 돌린다(created_at 은 auto_now_add 라 update 로 덮어씀)."""
        User.objects.filter(pk=user.pk).update(
            created_at=timezone.now() - timedelta(days=days),
        )
        return User.objects.get(pk=user.pk)

    def test_fresh_account_can_redeem(self):
        invitee = _social(2)
        redeem_referral(invitee, self.code, device_id='dev-fresh')
        self.assertEqual(_balance(invitee), REFERRAL_INVITEE_REWARD)

    def test_inside_window_can_redeem(self):
        invitee = self._age_account(_social(2), REFERRAL_REDEEM_WINDOW.days - 1)
        redeem_referral(invitee, self.code, device_id='dev-in')
        self.assertEqual(_balance(invitee), REFERRAL_INVITEE_REWARD)

    def test_expired_account_is_rejected(self):
        invitee = self._age_account(_social(3), REFERRAL_REDEEM_WINDOW.days + 1)
        with self.assertRaises(ReferralWindowExpired):
            redeem_referral(invitee, self.code, device_id='dev-old')
        self.assertEqual(_balance(invitee), 0)
        self.assertFalse(Referral.objects.filter(invitee=invitee).exists())

    def test_status_reports_can_redeem(self):
        fresh = _social(2)
        self.assertTrue(get_referral_status(fresh)['can_redeem'])

        expired = self._age_account(_social(3), REFERRAL_REDEEM_WINDOW.days + 1)
        self.assertFalse(get_referral_status(expired)['can_redeem'])

    def test_status_can_redeem_false_after_use(self):
        invitee = _social(2)
        redeem_referral(invitee, self.code, device_id='dev-used2')
        self.assertFalse(get_referral_status(invitee)['can_redeem'])

    def test_guest_cannot_redeem_by_status(self):
        self.assertFalse(get_referral_status(_guest(7))['can_redeem'])
