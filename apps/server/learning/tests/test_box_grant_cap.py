"""learning 서비스 테스트 — 정답 시 상자 지급 상한.

배경(2026-07-23): 세트당 상한(SET_BOX_CAP=3)이 있어서, 며칠 전 시작해놓고 안 끝낸
세트를 재개하면 정답을 맞춰도 상자가 안 나왔다. 세트는 날짜를 넘겨 이어질 수 있는데
상한이 세트에 묶여 있었던 게 원인. 이제 상자 상한은 일일 기준 하나뿐이다.
"""
from django.core import signing
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from content.models import Kanji
from rewards.models import CashBox, Daily

from learning.models import ItemType, QuizLog, QuizSet, QuizSetItem
from learning.services import MAX_BOXES_PER_DAY, QUESTION_SALT, grade_answer


class BoxGrantCapTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-cap', email='cap@x.com')
        self.kanji = Kanji.objects.create(character='一', meaning_ko='한 일')
        self.quiz_set = QuizSet.objects.create(user=self.user)

    def _answer_correctly(self, order):
        """세트의 order번째 문항을 정답 처리한다."""
        QuizSetItem.objects.create(
            quiz_set=self.quiz_set, order=order,
            item_type=ItemType.KANJI, item_id=self.kanji.id,
            question_type=QuizLog.QuestionType.WORD_TO_MEANING,
            correct_index=0,
        )
        token = signing.dumps(
            {
                'it': ItemType.KANJI, 'id': self.kanji.id,
                'qt': QuizLog.QuestionType.WORD_TO_MEANING, 'ci': 0,
                'sid': self.quiz_set.id, 'ord': order,
            },
            salt=QUESTION_SALT,
        )
        return grade_answer(self.user, token, 0)

    def _box_count(self):
        return CashBox.objects.filter(user=self.user).count()

    def test_same_set_keeps_granting_boxes(self):
        """한 세트에서 정답 4개 — 예전엔 3개에서 막혔다(세트 상한). 이제 4개 다 나온다."""
        for order in range(1, 5):
            self._answer_correctly(order)
        self.assertEqual(self._box_count(), 4)

    def test_daily_cap_stops_grants(self):
        """일일 상한에 도달하면 더 안 준다."""
        Daily.objects.create(
            user=self.user, date=timezone.localdate(), boxes_earned=MAX_BOXES_PER_DAY,
        )
        self._answer_correctly(1)
        self.assertEqual(self._box_count(), 0)

    def test_daily_cap_is_the_only_cap(self):
        """세트당 상한은 없다 — 상자 상한은 일일 기준 하나뿐."""
        import learning.services as ls
        self.assertFalse(hasattr(ls, 'SET_BOX_CAP'))
        self.assertGreater(MAX_BOXES_PER_DAY, 0)
