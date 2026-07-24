"""SRS 복습 간격 테스트.

정답 사다리: 1번째 3일 → 2번째 10일 → 이후 ease 배율.
오답: 연속 정답 리셋 + 3일 뒤 다시.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from learning.models import ItemType, SrsState
from learning.services import (
    SRS_FIRST_INTERVAL,
    SRS_LAPSE_INTERVAL,
    SRS_SECOND_INTERVAL,
    _apply_sm2,
)


class SrsIntervalTest(TestCase):
    def _state(self, **kw):
        defaults = dict(
            user_id=1, item_type=ItemType.KANJI, item_id=1,
            due_at=timezone.now(),
        )
        defaults.update(kw)
        return SrsState(**defaults)

    def test_first_correct_is_three_days(self):
        s = self._state(repetitions=0)
        _apply_sm2(s, True)
        self.assertEqual(s.interval_days, SRS_FIRST_INTERVAL)
        self.assertEqual(s.interval_days, 3)
        self.assertEqual(s.repetitions, 1)

    def test_second_correct_is_ten_days(self):
        s = self._state(repetitions=1, interval_days=3)
        _apply_sm2(s, True)
        self.assertEqual(s.interval_days, SRS_SECOND_INTERVAL)
        self.assertEqual(s.interval_days, 10)
        self.assertEqual(s.repetitions, 2)

    def test_third_correct_uses_ease_multiplier(self):
        s = self._state(repetitions=2, interval_days=10, ease=2.5)
        _apply_sm2(s, True)
        self.assertEqual(s.interval_days, 25)  # round(10 * 2.5)

    def test_wrong_resets_and_reappears_in_three_days(self):
        s = self._state(repetitions=4, interval_days=40)
        _apply_sm2(s, False)
        self.assertEqual(s.repetitions, 0)
        self.assertEqual(s.interval_days, SRS_LAPSE_INTERVAL)
        self.assertEqual(s.interval_days, 3)

    def test_relearn_after_lapse_restarts_ladder(self):
        """틀린 뒤 다시 맞히면 사다리 처음(3일)부터."""
        s = self._state(repetitions=0, interval_days=SRS_LAPSE_INTERVAL)
        _apply_sm2(s, True)
        self.assertEqual(s.interval_days, 3)

    def test_due_at_advances_by_interval(self):
        s = self._state(repetitions=0)
        before = timezone.now()
        _apply_sm2(s, True)
        delta = s.due_at - before
        self.assertGreater(delta, timedelta(days=3) - timedelta(minutes=1))
        self.assertLess(delta, timedelta(days=3) + timedelta(minutes=1))
