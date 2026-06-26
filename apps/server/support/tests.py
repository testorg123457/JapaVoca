from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from .models import Inquiry


class InquiryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            google_uid='g-sup-1', email='sup1@test.com', nickname='테스터',
        )
        self.client.force_authenticate(user=self.user)

    # --- POST ---
    def test_post_inquiry_creates_record(self):
        res = self.client.post('/api/support/inquiries/', {'content': '테스트 문의'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Inquiry.objects.filter(user=self.user).count(), 1)
        self.assertEqual(res.data['content'], '테스트 문의')
        self.assertIsNone(res.data['answer'])

    def test_content_too_long_returns_400(self):
        res = self.client.post('/api/support/inquiries/', {'content': 'x' * 2001})
        self.assertEqual(res.status_code, 400)

    def test_empty_content_returns_400(self):
        res = self.client.post('/api/support/inquiries/', {'content': ''})
        self.assertEqual(res.status_code, 400)

    def test_daily_limit_10(self):
        for i in range(10):
            Inquiry.objects.create(user=self.user, content=f'문의{i}')
        res = self.client.post('/api/support/inquiries/', {'content': '11번째'})
        self.assertEqual(res.status_code, 429)

    # --- GET list ---
    def test_get_inquiries_returns_own_only(self):
        Inquiry.objects.create(user=self.user, content='내 문의')
        other = User.objects.create_user(google_uid='g-sup-2', email='sup2@test.com')
        Inquiry.objects.create(user=other, content='남의 문의')
        res = self.client.get('/api/support/inquiries/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['content'], '내 문의')

    def test_get_inquiries_newest_first(self):
        Inquiry.objects.create(user=self.user, content='첫 번째')
        Inquiry.objects.create(user=self.user, content='두 번째')
        res = self.client.get('/api/support/inquiries/')
        self.assertEqual(res.data[0]['content'], '두 번째')

    # --- unread-count ---
    def test_unread_count_only_answered_unread(self):
        Inquiry.objects.create(user=self.user, content='q1', answer='a', is_answer_read=False)
        Inquiry.objects.create(user=self.user, content='q2', answer='a', is_answer_read=True)
        Inquiry.objects.create(user=self.user, content='q3')
        res = self.client.get('/api/support/inquiries/unread-count/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)

    # --- mark-all-read ---
    def test_mark_all_read_updates_flags(self):
        Inquiry.objects.create(user=self.user, content='q', answer='a', is_answer_read=False)
        res = self.client.patch('/api/support/inquiries/mark-all-read/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(
            Inquiry.objects.filter(user=self.user, is_answer_read=False, answer__isnull=False).exists()
        )

    def test_mark_all_read_only_own(self):
        other = User.objects.create_user(google_uid='g-sup-3', email='sup3@test.com')
        Inquiry.objects.create(user=other, content='q', answer='a', is_answer_read=False)
        self.client.patch('/api/support/inquiries/mark-all-read/')
        self.assertTrue(
            Inquiry.objects.filter(user=other, is_answer_read=False).exists()
        )

    # --- auth ---
    def test_requires_auth(self):
        anon = APIClient()
        self.assertEqual(anon.get('/api/support/inquiries/').status_code, 401)
        self.assertEqual(anon.post('/api/support/inquiries/', {'content': 'q'}).status_code, 401)
        self.assertEqual(anon.get('/api/support/inquiries/unread-count/').status_code, 401)
        self.assertEqual(anon.patch('/api/support/inquiries/mark-all-read/').status_code, 401)
