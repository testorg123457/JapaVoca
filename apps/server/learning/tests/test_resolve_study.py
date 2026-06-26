from django.test import TestCase

from accounts.models import User
from learning.services import NoContent, resolve_study


class ResolveStudyTest(TestCase):
    def _user(self, **kw):
        return User.objects.create_user(
            google_uid=kw.pop('google_uid', 'g-q'),
            email=kw.pop('email', 'q@x.com'),
            **kw,
        )

    def test_kanji_track(self):
        u = self._user(study_mode='kanji', study_level='N5')
        self.assertEqual(resolve_study(u), ('kanji', None, 'N5'))

    def test_kanji_word_filters_word_type(self):
        u = self._user(study_mode='kanji_word', study_level='N4')
        self.assertEqual(resolve_study(u), ('word', 'kanji', 'N4'))

    def test_kana_word_filters_word_type(self):
        u = self._user(study_mode='kana_word', study_level='N5')
        self.assertEqual(resolve_study(u), ('word', 'kana', 'N5'))

    def test_unset_raises_nocontent(self):
        u = self._user()
        with self.assertRaises(NoContent):
            resolve_study(u)

    def test_kana_hira_only(self):
        u = self._user(google_uid='g-kh', email='kh@x.com', study_mode='kana', study_kana_hiragana=True)
        self.assertEqual(resolve_study(u), ('kana', 'hira', None))

    def test_kana_kata_only(self):
        u = self._user(google_uid='g-kk', email='kk@x.com', study_mode='kana', study_kana_katakana=True)
        self.assertEqual(resolve_study(u), ('kana', 'kata', None))

    def test_kana_both_scripts(self):
        u = self._user(
            google_uid='g-kb', email='kb@x.com',
            study_mode='kana', study_kana_hiragana=True, study_kana_katakana=True,
        )
        self.assertEqual(resolve_study(u), ('kana', None, None))

    def test_kana_no_script_raises_nocontent(self):
        u = self._user(google_uid='g-kn', email='kn@x.com', study_mode='kana')
        with self.assertRaises(NoContent):
            resolve_study(u)
