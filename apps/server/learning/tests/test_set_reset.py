"""오래된 미완료 세트 폐기 테스트.

세트는 시작 시점에 10문제를 뽑아 저장한다. 하루가 지나면 SRS 기한이 바뀐 낡은
문제가 되므로, 학습 하루 경계(새벽 SET_RESET_HOUR시) 이전에 시작한 미완료 세트는
재개하지 않고 폐기한다. 활발히 푸는 세트(오늘 시작)는 그대로 이어진다.
"""
from datetime import datetime, timedelta

from django.test import TestCase
from django.utils import timezone

from learning.services import SET_RESET_HOUR, _last_reset_cutoff


def _at(y, m, d, hh, mm=0):
    return timezone.make_aware(datetime(y, m, d, hh, mm))


class LastResetCutoffTest(TestCase):
    def test_after_reset_hour_uses_today_boundary(self):
        # 오전 9시 → 오늘 새벽 2시가 경계
        cutoff = _last_reset_cutoff(_at(2026, 7, 24, 9))
        self.assertEqual((cutoff.hour, cutoff.day), (SET_RESET_HOUR, 24))

    def test_before_reset_hour_uses_yesterday_boundary(self):
        # 새벽 1시 → 아직 리셋 전이므로 어제 새벽 2시가 경계
        cutoff = _last_reset_cutoff(_at(2026, 7, 24, 1))
        self.assertEqual((cutoff.hour, cutoff.day), (SET_RESET_HOUR, 23))

    def test_exactly_reset_hour_is_today(self):
        cutoff = _last_reset_cutoff(_at(2026, 7, 24, SET_RESET_HOUR))
        self.assertEqual(cutoff.day, 24)


class BuildQuizSetResetTest(TestCase):
    """build_quiz_set이 낡은 세트를 폐기하는지 — DB 시각을 직접 조작해 검증."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from accounts.models import User
        cls.User = User

    def setUp(self):
        self.user = self.User.objects.create_user(google_uid='g-reset', email='r@x.com')

    def _make_set(self, started_at, answered=0):
        from learning.models import QuizSet
        s = QuizSet.objects.create(user=self.user)
        # started_at은 auto_now_add라 생성 후 강제로 덮어쓴다.
        QuizSet.objects.filter(pk=s.pk).update(started_at=started_at, answered_count=answered)
        return QuizSet.objects.get(pk=s.pk)

    def test_yesterday_set_is_abandoned(self):
        from learning.services import build_quiz_set, NoContent
        old = self._make_set(timezone.now() - timedelta(days=1))

        # 폐기 후 새 세트를 만들려다 학습 트랙 미설정으로 NoContent가 날 수 있다.
        # 관심사는 낡은 세트가 폐기됐는지뿐이므로 그건 무시한다.
        try:
            build_quiz_set(self.user)
        except NoContent:
            pass

        old.refresh_from_db()
        self.assertIsNotNone(old.abandoned_at)

    def test_recent_set_is_resumed(self):
        """방금 시작한 세트는 폐기하지 않고 이어받는다."""
        from learning.services import build_quiz_set
        recent = self._make_set(timezone.now() - timedelta(minutes=5))

        build_quiz_set(self.user)

        recent.refresh_from_db()
        self.assertIsNone(recent.abandoned_at)
