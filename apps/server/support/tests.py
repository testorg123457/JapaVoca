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


class InquiryAdminAnswerTests(TestCase):
    """Admin 답변 저장 시 알림 동작 — 최초 답변에만 알림/시각 기록(수정 시 재발송 금지)."""

    def setUp(self):
        from django.contrib.admin.sites import AdminSite
        from support.admin import InquiryAdmin
        self.admin = InquiryAdmin(Inquiry, AdminSite())
        self.user = User.objects.create_user(google_uid='g-ans', email='ans@x.com')
        self.inquiry = Inquiry.objects.create(user=self.user, content='질문')

    def _save_answer(self, text, changed=('answer',)):
        """admin.save_model 을 흉내 — form.changed_data 만 필요."""
        from types import SimpleNamespace
        from django.test import RequestFactory
        self.inquiry.answer = text
        # on_commit 알림이 실제로 실행되도록 콜백을 잡아 실행한다(TestCase 트랜잭션 대응).
        with self.captureOnCommitCallbacks(execute=True):
            self.admin.save_model(
                RequestFactory().post('/'), self.inquiry,
                SimpleNamespace(changed_data=list(changed)), change=True,
            )
        self.inquiry.refresh_from_db()

    def _inquiry_notifs(self):
        from notifications.models import Notification
        return Notification.objects.filter(user=self.user, type=Notification.Type.INQUIRY)

    def test_first_answer_sets_time_and_notifies(self):
        self._save_answer('답변입니다')
        self.assertIsNotNone(self.inquiry.answered_at)
        self.assertEqual(self._inquiry_notifs().count(), 1)

    def test_editing_answer_does_not_renotify_or_reset_time(self):
        self._save_answer('답변입니다')
        first_time = self.inquiry.answered_at
        # 오타 정정 — 다시 저장
        self._save_answer('답변입니다.')
        self.assertEqual(self.inquiry.answered_at, first_time)  # 시각 유지
        self.assertEqual(self._inquiry_notifs().count(), 1)     # 재발송 없음


class BroadcastIdempotencyTests(TestCase):
    def setUp(self):
        self.users = [
            User.objects.create_user(google_uid=f'g-bc-{i}', email=f'bc{i}@x.com')
            for i in range(3)
        ]

    def test_same_key_does_not_resend(self):
        from notifications.services import broadcast_system
        from notifications.models import Notification

        qs = User.objects.filter(google_uid__startswith='g-bc-')
        first = broadcast_system(qs, '점검 안내', '내용', key='k1')
        self.assertEqual(first, 3)
        # 같은 key로 재실행 — 아무도 다시 안 받는다.
        second = broadcast_system(qs, '점검 안내', '내용', key='k1')
        self.assertEqual(second, 0)
        self.assertEqual(
            Notification.objects.filter(type=Notification.Type.SYSTEM).count(), 3,
        )

    def test_partial_audience_then_full_only_sends_new(self):
        from notifications.services import broadcast_system
        # 먼저 한 명에게만
        broadcast_system(User.objects.filter(pk=self.users[0].pk), 'x', key='k2')
        # 전체 재발송 — 이미 받은 1명은 건너뛰고 2명만
        sent = broadcast_system(
            User.objects.filter(google_uid__startswith='g-bc-'), 'x', key='k2',
        )
        self.assertEqual(sent, 2)
