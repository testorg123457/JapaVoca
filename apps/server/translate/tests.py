from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

from .ai import parse_translation_json


class ParseTranslationJsonTest(TestCase):
    def test_plain_json(self):
        r = parse_translation_json('{"original": "寿司", "korean": "초밥"}')
        self.assertEqual(r, {'original': '寿司', 'korean': '초밥'})

    def test_json_in_code_fence(self):
        raw = '```json\n{"original": "駅", "korean": "역"}\n```'
        r = parse_translation_json(raw)
        self.assertEqual(r['korean'], '역')

    def test_garbage_returns_empty_fields(self):
        r = parse_translation_json('전혀 JSON 아님')
        self.assertEqual(r, {'original': '', 'korean': ''})


class TranslateViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            google_uid='g-tr-1', email='tr1@test.com', nickname='번역테스터',
        )
        self.client.force_authenticate(user=self.user)

    @patch('translate.views.ocr_and_translate',
           return_value={'original': '猫', 'korean': '고양이'})
    def test_image_ok(self, _m):
        img = SimpleUploadedFile('a.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        res = self.client.post('/api/translate/image/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['korean'], '고양이')

    def test_image_missing_400(self):
        res = self.client.post('/api/translate/image/', {}, format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_requires_auth(self):
        anon = APIClient()
        res = anon.post('/api/translate/text/', {'text': '猫'}, format='json')
        self.assertIn(res.status_code, (401, 403))

    @patch('translate.views.translate_text', return_value='고양이')
    def test_text_ok(self, _m):
        res = self.client.post('/api/translate/text/', {'text': '猫'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['korean'], '고양이')

    def test_image_over_8mb_400(self):
        big = SimpleUploadedFile(
            'big.jpg', b'\x00' * (8 * 1024 * 1024 + 1), content_type='image/jpeg')
        res = self.client.post('/api/translate/image/', {'image': big}, format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_text_too_long_400(self):
        res = self.client.post('/api/translate/text/', {'text': '猫' * 2001}, format='json')
        self.assertEqual(res.status_code, 400)

    @patch('translate.views.ocr_and_translate', side_effect=RuntimeError('AI down'))
    def test_image_ai_failure_502(self, _m):
        img = SimpleUploadedFile('a.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        res = self.client.post('/api/translate/image/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 502)

    @patch('translate.views.ocr_and_translate', return_value={'original': '', 'korean': ''})
    def test_image_empty_ocr_returns_blank_original(self, _m):
        # 글자 없음: 서버는 original='' 그대로 전달(문구 처리는 클라이언트).
        img = SimpleUploadedFile('a.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        res = self.client.post('/api/translate/image/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['original'], '')
