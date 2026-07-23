"""exchange 서비스 테스트 — 교환 성공/발급실패 환불/멱등성.

캐시 정합성(CLAUDE.md): 발급 실패 시 차감분이 정확히 환불되어 net 0 이고,
환불 상태·사유가 감사 추적 가능한 값이어야 한다(관리자 조정으로 뭉개지지 않음).
"""
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from rewards.models import Ledger, Wallet
from rewards.services import earn

from .models import AdRewardLog, GiftExchange
from .products import get_product
from .services import (
    AdNotVerified,
    ExchangeIssueFailed,
    request_exchange,
)


class RequestExchangeTest(TestCase):
    CODE = 'COFFEE_5000'

    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-ex', email='ex@x.com')
        self.price = get_product(self.CODE)['price_cash']
        # 교환에 충분한 잔액 적립.
        earn(self.user, self.price, Ledger.Reason.QUIZ_BOX)

    def _balance(self):
        return Wallet.objects.get(pk=self.user.pk).balance

    def test_success_issues_and_deducts(self):
        with mock.patch(
            'exchange.services.issue_gifticon', return_value={'status': 'issued'},
        ):
            gift = request_exchange(self.user, self.CODE, ad_verified=True)
        self.assertEqual(gift.status, GiftExchange.Status.ISSUED)
        self.assertIsNotNone(gift.issued_at)
        self.assertEqual(self._balance(), 0)  # 전액 차감됨.

    def test_issue_failure_refunds_net_zero(self):
        """발급 실패 → 상태 REFUNDED, 잔액 원복(net 0), 환불 원장은 전용 사유."""
        with mock.patch(
            'exchange.services.issue_gifticon', return_value={'status': 'failed'},
        ):
            with self.assertRaises(ExchangeIssueFailed):
                request_exchange(self.user, self.CODE, ad_verified=True)

        gift = GiftExchange.objects.get(user=self.user)
        self.assertEqual(gift.status, GiftExchange.Status.REFUNDED)

        # 차감과 환불이 상쇄되어 잔액이 원상복구.
        self.assertEqual(self._balance(), self.price)

        # 환불 원장은 EARN + 전용 환불 사유(관리자 조정 아님).
        refund = Ledger.objects.get(
            user=self.user, direction=Ledger.Direction.EARN,
            reason=Ledger.Reason.EXCHANGE_REFUND,
        )
        self.assertEqual(refund.amount, self.price)
        self.assertEqual(refund.ref_type, 'gift_exchange')
        self.assertEqual(refund.ref_id, gift.id)
        # 불변식: balance == Σearn − Σuse.
        earned = sum(
            l.amount for l in Ledger.objects.filter(
                user=self.user, direction=Ledger.Direction.EARN)
        )
        used = sum(
            l.amount for l in Ledger.objects.filter(
                user=self.user, direction=Ledger.Direction.USE)
        )
        self.assertEqual(self._balance(), earned - used)

    def test_idempotent_key_returns_same_gift(self):
        """같은 idempotency_key 재요청은 새 교환/추가 차감 없이 기존 건 반환."""
        with mock.patch(
            'exchange.services.issue_gifticon', return_value={'status': 'issued'},
        ):
            first = request_exchange(
                self.user, self.CODE, ad_verified=True, idempotency_key='K1',
            )
            second = request_exchange(
                self.user, self.CODE, ad_verified=True, idempotency_key='K1',
            )
        self.assertEqual(first.id, second.id)
        self.assertEqual(GiftExchange.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self._balance(), 0)  # 이중 차감 없음.


class AdmobSsvCallbackTest(TestCase):
    """SSV 콜백 뷰 — custom_data 파싱(context:nonce)·하위호환·멱등."""

    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-ssv', email='ssv@x.com')

    def _call(self, **params):
        base = {'transaction_id': 'tx-1', 'user_id': str(self.user.pk)}
        base.update(params)
        return self.client.get('/api/exchange/admob/ssv/', base)

    def test_custom_data_context_and_nonce(self):
        res = self._call(custom_data='exchange:abc123')
        self.assertEqual(res.status_code, 200)
        log = AdRewardLog.objects.get(transaction_id='tx-1')
        self.assertEqual(log.reward_context, AdRewardLog.RewardContext.EXCHANGE)
        self.assertEqual(log.nonce, 'abc123')

    def test_custom_data_context_only_backcompat(self):
        res = self._call(custom_data='exchange')
        self.assertEqual(res.status_code, 200)
        log = AdRewardLog.objects.get(transaction_id='tx-1')
        self.assertEqual(log.reward_context, AdRewardLog.RewardContext.EXCHANGE)
        self.assertIsNone(log.nonce)

    def test_unknown_context_falls_back_to_box_open(self):
        self._call(custom_data='weird:n9')
        log = AdRewardLog.objects.get(transaction_id='tx-1')
        self.assertEqual(log.reward_context, AdRewardLog.RewardContext.BOX_OPEN)
        self.assertEqual(log.nonce, 'n9')

    def test_duplicate_nonce_idempotent_200(self):
        self._call(custom_data='exchange:dup-1')
        res = self._call(transaction_id='tx-2', custom_data='exchange:dup-1')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(AdRewardLog.objects.filter(nonce='dup-1').count(), 1)


class AdStatusTest(TestCase):
    """ad-status 폴링 — 인증·소유권·도착 전/후·required 플래그."""

    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-st', email='st@x.com')
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def _log(self, user, nonce, **kw):
        return AdRewardLog.objects.create(
            user=user, ad_unit='', ssv_signature='',
            transaction_id=f'tx-{nonce}', verified=True,
            reward_context=AdRewardLog.RewardContext.EXCHANGE, nonce=nonce, **kw,
        )

    def test_requires_auth(self):
        res = APIClient().get('/api/exchange/ad-status/', {'nonce': 'x'})
        self.assertEqual(res.status_code, 401)

    def test_not_arrived_yet(self):
        res = self.api.get('/api/exchange/ad-status/', {'nonce': 'nope'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.data, {'required': False, 'verified': False, 'ad_log_id': None},
        )

    def test_arrived_own_log(self):
        log = self._log(self.user, 'n1')
        res = self.api.get('/api/exchange/ad-status/', {'nonce': 'n1'})
        self.assertTrue(res.data['verified'])
        self.assertEqual(res.data['ad_log_id'], log.id)

    def test_other_users_log_hidden(self):
        other = User.objects.create_user(google_uid='g-ot', email='ot@x.com')
        self._log(other, 'n2')
        res = self.api.get('/api/exchange/ad-status/', {'nonce': 'n2'})
        self.assertFalse(res.data['verified'])
        self.assertIsNone(res.data['ad_log_id'])

    def test_unverified_log_not_returned(self):
        log = self._log(self.user, 'n3')
        log.verified = False
        log.save(update_fields=['verified'])
        res = self.api.get('/api/exchange/ad-status/', {'nonce': 'n3'})
        self.assertFalse(res.data['verified'])

    @override_settings(ADMOB_SSV_VERIFY=True)
    def test_required_reflects_setting(self):
        res = self.api.get('/api/exchange/ad-status/', {'nonce': 'x'})
        self.assertTrue(res.data['required'])


@override_settings(ADMOB_SSV_VERIFY=True)
class StrictModeExchangeTest(TestCase):
    """엄격 모드(ADMOB_SSV_VERIFY=True) — ad_log 필수·소비·재사용 차단."""

    CODE = 'COFFEE_5000'

    def setUp(self):
        self.user = User.objects.create_user(google_uid='g-strict', email='s@x.com')
        self.price = get_product(self.CODE)['price_cash']
        earn(self.user, self.price * 2, Ledger.Reason.QUIZ_BOX)

    def _verified_log(self, nonce='sn1'):
        return AdRewardLog.objects.create(
            user=self.user, ad_unit='', ssv_signature='',
            transaction_id=f'tx-{nonce}', verified=True,
            reward_context=AdRewardLog.RewardContext.EXCHANGE, nonce=nonce,
        )

    def test_valid_log_exchanges_and_consumes(self):
        log = self._verified_log()
        with mock.patch(
            'exchange.services.issue_gifticon', return_value={'status': 'issued'},
        ):
            gift = request_exchange(
                self.user, self.CODE, ad_verified=True, ad_log_id=log.id,
            )
        self.assertEqual(gift.status, GiftExchange.Status.ISSUED)
        log.refresh_from_db()
        self.assertEqual(log.ref_id, gift.id)  # 소비됨(1광고=1교환).

    def test_missing_log_rejected(self):
        with self.assertRaises(AdNotVerified):
            request_exchange(self.user, self.CODE, ad_verified=True, ad_log_id=None)

    def test_consumed_log_rejected(self):
        log = self._verified_log()
        with mock.patch(
            'exchange.services.issue_gifticon', return_value={'status': 'issued'},
        ):
            request_exchange(
                self.user, self.CODE, ad_verified=True, ad_log_id=log.id,
                idempotency_key='S1',
            )
            with self.assertRaises(AdNotVerified):
                request_exchange(
                    self.user, self.CODE, ad_verified=True, ad_log_id=log.id,
                    idempotency_key='S2',
                )

    def test_box_open_context_log_rejected(self):
        log = AdRewardLog.objects.create(
            user=self.user, ad_unit='', ssv_signature='',
            transaction_id='tx-box', verified=True,
            reward_context=AdRewardLog.RewardContext.BOX_OPEN, nonce='bx1',
        )
        with self.assertRaises(AdNotVerified):
            request_exchange(
                self.user, self.CODE, ad_verified=True, ad_log_id=log.id,
            )
