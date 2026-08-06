"""rewards 서비스 테스트 — 상자 개봉(묶음 포함) 캐시 정합성.

캐시 정합성(CLAUDE.md): 묶음 상자(burst_count>1)는 보상을 개수만큼 굴리지만
인벤토리·광고 횟수는 1개로 세고, 원장에는 합계 1건만 남는다.
어느 경우에도 wallet.balance == (earn합 − use합) 이어야 한다.
"""
from unittest import mock

from django.test import TestCase

from accounts.models import User

from .models import CashBox, Ledger, Wallet
from .services import BOX_REWARD_BANDS, BoxAlreadyOpened, open_cash_box


class OpenCashBoxTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-box', email='box@x.com')

    def _balance(self):
        return Wallet.objects.get(pk=self.user.pk).balance

    def _ledger_net(self):
        rows = Ledger.objects.filter(user=self.user)
        earned = sum(r.amount for r in rows if r.direction == Ledger.Direction.EARN)
        used = sum(r.amount for r in rows if r.direction == Ledger.Direction.USE)
        return earned - used

    def test_single_box_gives_one_reward(self):
        box = CashBox.objects.create(user=self.user, grade=CashBox.Grade.NORMAL)
        self.assertEqual(box.burst_count, 1)  # 기본은 낱개

        box, ledger = open_cash_box(self.user, box.id)

        bands = BOX_REWARD_BANDS[CashBox.Grade.NORMAL]
        lo, hi = bands[0][0][0], bands[-1][0][1]
        self.assertEqual(len(box.reward_breakdown), 1)
        self.assertTrue(lo <= box.reward_cash <= hi)
        self.assertEqual(ledger.amount, box.reward_cash)
        self.assertEqual(self._balance(), box.reward_cash)

    def test_burst_box_gives_three_rewards_but_one_ledger_row(self):
        box = CashBox.objects.create(
            user=self.user, grade=CashBox.Grade.NORMAL, burst_count=3,
        )
        box, ledger = open_cash_box(self.user, box.id)

        # 보상은 3개, 각각 따로 굴린 값.
        self.assertEqual(len(box.reward_breakdown), 3)
        bands = BOX_REWARD_BANDS[CashBox.Grade.NORMAL]
        lo, hi = bands[0][0][0], bands[-1][0][1]
        for amount in box.reward_breakdown:
            self.assertTrue(lo <= amount <= hi)

        # reward_cash 는 합계이고, 원장은 묶음이므로 1건뿐.
        self.assertEqual(box.reward_cash, sum(box.reward_breakdown))
        self.assertEqual(Ledger.objects.filter(user=self.user).count(), 1)
        self.assertEqual(ledger.amount, box.reward_cash)

    def test_burst_box_keeps_balance_consistent(self):
        box = CashBox.objects.create(
            user=self.user, grade=CashBox.Grade.PURPLE, burst_count=3,
        )
        box, _ = open_cash_box(self.user, box.id)

        self.assertEqual(self._balance(), box.reward_cash)
        self.assertEqual(self._balance(), self._ledger_net())

    def test_burst_box_counts_as_one_in_inventory(self):
        """묶음이어도 인벤토리는 1개 — 열면 미개봉 목록이 비어야 한다."""
        box = CashBox.objects.create(
            user=self.user, grade=CashBox.Grade.NORMAL, burst_count=3,
        )
        unopened = CashBox.objects.filter(user=self.user, status=CashBox.Status.UNOPENED)
        self.assertEqual(unopened.count(), 1)
        open_cash_box(self.user, box.id)
        self.assertEqual(unopened.count(), 0)

    def test_reopen_is_rejected_and_pays_once(self):
        box = CashBox.objects.create(
            user=self.user, grade=CashBox.Grade.NORMAL, burst_count=3,
        )
        box, _ = open_cash_box(self.user, box.id)
        paid = box.reward_cash

        with self.assertRaises(BoxAlreadyOpened):
            open_cash_box(self.user, box.id)

        self.assertEqual(self._balance(), paid)
        self.assertEqual(Ledger.objects.filter(user=self.user).count(), 1)

    def test_burst_count_zero_is_treated_as_one(self):
        """데이터가 망가져 0이 들어와도 보상 0원/빈 목록이 되지 않아야 한다."""
        box = CashBox.objects.create(
            user=self.user, grade=CashBox.Grade.NORMAL, burst_count=0,
        )
        box, _ = open_cash_box(self.user, box.id)
        self.assertEqual(len(box.reward_breakdown), 1)
        self.assertGreater(box.reward_cash, 0)


class RollBurstCountTest(TestCase):
    """확률 분기는 서버에서만 굴린다(클라이언트 값 신뢰 금지)."""

    def test_roll_returns_burst_or_single(self):
        from learning.services import BOX_BURST_COUNT, _roll_burst_count

        for grade in CashBox.Grade.values:
            with mock.patch('learning.services.random.random', return_value=0.0):
                self.assertEqual(_roll_burst_count(grade), BOX_BURST_COUNT)
            with mock.patch('learning.services.random.random', return_value=0.99):
                self.assertEqual(_roll_burst_count(grade), 1)

    def test_burst_chance_is_per_grade(self):
        """묶음 확률은 등급마다 다르다 — 공통 상수 하나면 상위 등급 기대값이 통제 없이 커진다.

        버건디 묶음은 최고 금액이 3번 굴러가는 단일 최대 지급 경로다.
        """
        from learning.services import _BOX_BURST_CHANCE

        # 모든 등급에 값이 있어야 한다(빠지면 KeyError로 상자 생성이 터진다).
        for grade in CashBox.Grade.values:
            self.assertIn(grade, _BOX_BURST_CHANCE)

    def test_reward_bands_cover_every_grade_without_gaps(self):
        """구간은 빈틈 없이 붙고, 등급끼리 겹치지 않는다."""
        from .services import BOX_REWARD_BANDS

        order = [
            CashBox.Grade.NORMAL, CashBox.Grade.BLUE,
            CashBox.Grade.PURPLE, CashBox.Grade.BURGUNDY,
        ]
        prev_hi = 0
        for grade in order:
            bands = BOX_REWARD_BANDS[grade]
            self.assertEqual(sum(w for _, w in bands), 100)
            ranges = [r for r, _ in bands]
            # 등급 안: 빈틈 없이 이어진다
            for (lo, hi), (next_lo, _) in zip(ranges, ranges[1:]):
                self.assertLessEqual(lo, hi)
                self.assertEqual(next_lo, hi + 1)
            # 등급 사이: 겹치지 않는다
            self.assertGreater(ranges[0][0], prev_hi)
            prev_hi = ranges[-1][1]
