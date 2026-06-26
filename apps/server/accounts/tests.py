from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import ConsentAgreement, User
from accounts.services import ConsentError, get_consent_status, record_consent


class ConsentModelTest(TestCase):
    def test_create_consent_row(self):
        user = User.objects.create_user(google_uid='g-1', email='a@b.com')
        row = ConsentAgreement.objects.create(
            user=user,
            terms_version=settings.TERMS_VERSION,
            privacy_version=settings.PRIVACY_VERSION,
            phone_data_agreed=True,
            marketing_agreed=False,
            phone_number='01012345678',
        )
        self.assertEqual(row.user, user)
        self.assertEqual(ConsentAgreement._meta.db_table, 'tbl_accounts_consent')
        self.assertIsNotNone(row.agreed_at)

    def test_update_existing_row_raises(self):
        user = User.objects.create_user(google_uid='g-2', email='c@d.com')
        row = ConsentAgreement.objects.create(
            user=user,
            terms_version=settings.TERMS_VERSION,
            privacy_version=settings.PRIVACY_VERSION,
            phone_data_agreed=True,
            marketing_agreed=False,
            phone_number='01099998888',
        )
        row.marketing_agreed = True
        with self.assertRaises(TypeError):
            row.save()

    def test_create_consent_row_without_phone_number(self):
        user = User.objects.create_user(google_uid='g-3', email='e@f.com')
        row = ConsentAgreement.objects.create(
            user=user,
            terms_version=settings.TERMS_VERSION,
            privacy_version=settings.PRIVACY_VERSION,
            phone_data_agreed=False,
            marketing_agreed=False,
            phone_number=None,
        )
        self.assertIsNone(row.phone_number)
        self.assertIsNotNone(row.pk)


class ConsentServiceTest(TestCase):
    def _user(self, **kw):
        return User.objects.create_user(google_uid=kw.pop('google_uid', 'g-x'), email=kw.pop('email', 'x@y.com'), **kw)

    def test_status_required_initially(self):
        user = self._user()
        status = get_consent_status(user)
        self.assertTrue(status['required'])
        self.assertEqual(status['terms_version'], settings.TERMS_VERSION)

    def test_record_then_not_required(self):
        user = self._user()
        record_consent(user, marketing_agreed=True, phone_data_agreed=True, phone_number='01011112222')
        status = get_consent_status(user)
        self.assertFalse(status['required'])
        self.assertTrue(status['marketing_agreed'])
        user.refresh_from_db()
        self.assertTrue(user.push_marketing)  # 마케팅 동의 → 푸시 설정 동기화

    def test_guest_phone_forced_false(self):
        guest = User(guest_uid='guest-1', provider=User.Provider.GUEST, nickname='게스트')
        guest.set_unusable_password()
        guest.save()
        row = record_consent(guest, marketing_agreed=False, phone_data_agreed=True, phone_number='01000000000')
        self.assertFalse(row.phone_data_agreed)
        self.assertIsNone(row.phone_number)

    def test_non_guest_must_agree_phone(self):
        user = self._user()
        with self.assertRaises(ConsentError):
            record_consent(user, marketing_agreed=False, phone_data_agreed=False)


class ConsentApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(google_uid='g-api', email='api@x.com')
        self.client.force_authenticate(user=self.user)

    def test_status_endpoint(self):
        resp = self.client.get('/api/auth/consent/status/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['required'])

    def test_post_consent_then_not_required(self):
        resp = self.client.post(
            '/api/auth/consent/',
            {'marketing_agreed': True, 'phone_data_agreed': True, 'phone_number': '01012345678'},
            format='json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(resp.data['required'])

    def test_post_non_guest_without_phone_is_400(self):
        resp = self.client.post(
            '/api/auth/consent/',
            {'marketing_agreed': False, 'phone_data_agreed': False},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get('/api/auth/consent/status/')
        self.assertEqual(resp.status_code, 401)
