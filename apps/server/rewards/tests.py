"""rewards 서비스 테스트 — 상자 개봉(묶음 포함) 캐시 정합성.

캐시 정합성(CLAUDE.md): 묶음 상자(burst_count>1)는 보상을 개수만큼 굴리지만
인벤토리·광고 횟수는 1개로 세고, 원장에는 합계 1건만 남는다.
어느 경우에도 wallet.balance == (earn합 − use합) 이어야 한다.
"""
from unittest import mock

from django.test import TestCase

from accounts.models import User

from .models import CashBox, Ledger, Wallet
from .services import BOX_REWARD_RANGE, BoxAlreadyOpened, open_cash_box


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

        lo, hi = BOX_REWARD_RANGE[CashBox.Grade.NORMAL]
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
        lo, hi = BOX_REWARD_RANGE[CashBox.Grade.NORMAL]
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

        with mock.patch('learning.services.random.random', return_value=0.0):
            self.assertEqual(_roll_burst_count(), BOX_BURST_COUNT)
        with mock.patch('learning.services.random.random', return_value=0.99):
            self.assertEqual(_roll_burst_count(), 1)
