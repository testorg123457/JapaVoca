from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from learning.models import QuizSet
from learning.services import abandon_quiz_set


class AbandonQuizSetTest(TestCase):
    def _user(self, **kw):
        return User.objects.create_user(
            google_uid=kw.pop('google_uid', 'g-a'),
            email=kw.pop('email', 'a@x.com'),
            **kw,
        )

    def test_active_set_gets_abandoned(self):
        user = self._user()
        qs = QuizSet.objects.create(user=user)
        self.assertIsNone(qs.abandoned_at)

        abandon_quiz_set(user)

        qs.refresh_from_db()
        self.assertIsNotNone(qs.abandoned_at)
        self.assertIsNone(qs.completed_at)  # completed_at은 건드리지 않아야 함

    def test_no_active_set_is_noop(self):
        user = self._user(google_uid='g-b', email='b@x.com')
        # 세트 없어도 예외 없이 통과
        abandon_quiz_set(user)

    def test_completed_set_not_affected(self):
        user = self._user(google_uid='g-c', email='c@x.com')
        now = timezone.now()
        qs = QuizSet.objects.create(user=user, completed_at=now)

        abandon_quiz_set(user)

        qs.refresh_from_db()
        self.assertIsNone(qs.abandoned_at)  # 완료된 세트는 폐기 안 됨

    def test_abandoned_set_not_returned_as_active(self):
        from learning.services import build_quiz_set, NoContent
        user = self._user(google_uid='g-d', email='d@x.com', study_mode='kana',
                          study_kana_hiragana=True)
        qs = QuizSet.objects.create(user=user)
        abandon_quiz_set(user)
        qs.refresh_from_db()
        self.assertIsNotNone(qs.abandoned_at)
        # 폐기된 세트는 활성으로 반환되지 않아야 함 (콘텐츠 없으면 NoContent 또는 새 세트)
        # 여기서는 폐기 세트가 재반환되지 않는 것만 확인
        active = QuizSet.objects.filter(user=user, completed_at__isnull=True,
                                        abandoned_at__isnull=True).first()
        self.assertIsNone(active)
