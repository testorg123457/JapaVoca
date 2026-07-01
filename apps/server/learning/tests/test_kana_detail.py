from django.test import TestCase

from content.models import Kana, KanaExample
from learning.services import _item_detail


class KanaDetailTest(TestCase):
    def setUp(self):
        self.kana = Kana.objects.create(character='あ', romaji='a', script='hira', kind='seion')
        for surface, kanji, meaning in [
            ('あか', '赤', '빨강'), ('あお', '青', '파랑'),
            ('あめ', '雨', '비'), ('あし', '足', '발'),
        ]:
            KanaExample.objects.create(kana=self.kana, surface=surface, kanji=kanji, meaning_ko=meaning)

    def test_returns_exactly_two(self):
        detail = _item_detail('kana', self.kana.id)
        self.assertIn('example_words', detail)
        self.assertEqual(len(detail['example_words']), 2)

    def test_example_words_structure(self):
        detail = _item_detail('kana', self.kana.id)
        for ex in detail['example_words']:
            self.assertIn('surface', ex)
            self.assertIn('kanji', ex)
            self.assertIn('meaning', ex)

    def test_words_belong_to_kana(self):
        valid_surfaces = {'あか', 'あお', 'あめ', 'あし'}
        detail = _item_detail('kana', self.kana.id)
        for ex in detail['example_words']:
            self.assertIn(ex['surface'], valid_surfaces)

    def test_no_examples_returns_empty_list(self):
        kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
        detail = _item_detail('kana', kana2.id)
        self.assertEqual(detail['example_words'], [])

    def test_existing_fields_preserved(self):
        detail = _item_detail('kana', self.kana.id)
        self.assertEqual(detail['surface'], 'あ')
        self.assertEqual(detail['reading'], 'a')
        self.assertEqual(detail['script'], 'hira')

    def test_kanji_empty_string_preserved(self):
        kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
        KanaExample.objects.create(kana=kana2, surface='いえ', kanji='', meaning_ko='집')
        detail = _item_detail('kana', kana2.id)
        self.assertEqual(detail['example_words'][0]['kanji'], '')

    def test_pool_smaller_than_two(self):
        kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
        KanaExample.objects.create(kana=kana2, surface='いぬ', kanji='犬', meaning_ko='개')
        detail = _item_detail('kana', kana2.id)
        self.assertEqual(len(detail['example_words']), 1)
