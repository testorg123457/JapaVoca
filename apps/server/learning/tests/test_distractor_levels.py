"""오답 보기 급수 제한 테스트.

정답과 동떨어진 급수의 오답이 섞이면 뜻을 몰라도 소거법으로 맞힐 수 있다.
그래서 오답은 "정답 급수 + 한 단계 쉬운 급수"에서 먼저 뽑는다(N5만 N4를 대신 씀).
"""
from django.test import TestCase

from content.models import Kanji

from learning.models import ItemType
from learning.services import DISTRACTOR_LEVELS, _distractor_texts


class DistractorLevelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        # 급수별로 뜻이 겹치지 않는 한자를 넉넉히 만든다.
        cls.by_level = {}
        code = 0x4E00
        for level in ('N1', 'N2', 'N3', 'N4', 'N5'):
            made = []
            for i in range(6):
                made.append(Kanji.objects.create(
                    character=chr(code), meaning_ko=f'{level}뜻{i}', jlpt_level=level,
                ))
                code += 1
            cls.by_level[level] = made

    def _levels_of(self, texts):
        return {
            Kanji.objects.get(meaning_ko=t).jlpt_level
            for t in texts
        }

    def test_pool_is_own_level_plus_one_easier(self):
        for level, expected in DISTRACTOR_LEVELS.items():
            item = self.by_level[level][0]
            texts = _distractor_texts(
                ItemType.KANJI, item.id, 'meaning', item.meaning_ko, level=level,
            )
            self.assertEqual(len(texts), 3, level)
            self.assertTrue(
                self._levels_of(texts) <= set(expected),
                f'{level}: {self._levels_of(texts)} ⊄ {set(expected)}',
            )

    def test_n5_borrows_from_harder_level(self):
        """N5는 더 쉬운 급수가 없으므로 N4를 쓴다."""
        self.assertEqual(set(DISTRACTOR_LEVELS['N5']), {'N5', 'N4'})

    def test_falls_back_when_pool_too_small(self):
        """풀이 얕으면 전체로 넓혀서라도 3개를 채운다 — 못 채우면 문제가 버려진다."""
        Kanji.objects.exclude(jlpt_level='N1').delete()
        item = self.by_level['N1'][0]
        # N1 5개만 남았지만 여전히 3개는 채워야 한다.
        texts = _distractor_texts(
            ItemType.KANJI, item.id, 'meaning', item.meaning_ko, level='N1',
        )
        self.assertEqual(len(texts), 3)

    def test_correct_answer_never_appears_as_distractor(self):
        item = self.by_level['N3'][0]
        texts = _distractor_texts(
            ItemType.KANJI, item.id, 'meaning', item.meaning_ko, level='N3',
        )
        self.assertNotIn(item.meaning_ko, texts)
        self.assertEqual(len(set(texts)), len(texts))  # 중복 없음

    def test_unknown_level_uses_whole_pool(self):
        """급수 데이터가 없는 항목(가나 등)은 전체에서 뽑되 동작은 해야 한다."""
        item = self.by_level['N2'][0]
        texts = _distractor_texts(
            ItemType.KANJI, item.id, 'meaning', item.meaning_ko, level='',
        )
        self.assertEqual(len(texts), 3)
