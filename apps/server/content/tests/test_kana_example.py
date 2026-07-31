from django.db import IntegrityError
from django.test import TestCase

from content.models import Kana, KanaExample


class KanaExampleModelTest(TestCase):
    def setUp(self):
        self.kana = Kana.objects.create(character='あ', romaji='a', script='hira', kind='seion')

    def test_create_with_kanji(self):
        ex = KanaExample.objects.create(
            kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강',
        )
        self.assertEqual(ex.surface, 'あか')
        self.assertEqual(ex.kanji, '赤')
        self.assertEqual(ex.meaning_ko, '빨강')

    def test_create_without_kanji(self):
        ex = KanaExample.objects.create(
            kana=self.kana, surface='あめ', kanji='', meaning_ko='비',
        )
        self.assertEqual(ex.kanji, '')

    def test_unique_kana_surface(self):
        KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강')
        with self.assertRaises(IntegrityError):
            KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨간색')

    def test_many_words_per_kana(self):
        for surface, kanji, meaning in [
            ('あか', '赤', '빨강'), ('あお', '青', '파랑'),
            ('あめ', '雨', '비'), ('あし', '足', '발'),
        ]:
            KanaExample.objects.create(kana=self.kana, surface=surface, kanji=kanji, meaning_ko=meaning)
        self.assertEqual(KanaExample.objects.filter(kana=self.kana).count(), 4)

    def test_same_surface_different_kana_allowed(self):
        kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
        KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강')
        KanaExample.objects.create(kana=kana2, surface='あか', kanji='赤', meaning_ko='빨강')
        self.assertEqual(KanaExample.objects.count(), 2)
