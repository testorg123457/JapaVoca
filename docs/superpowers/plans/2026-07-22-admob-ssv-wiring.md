# AdMob SSV 배선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 클라 ↔ 서버 SSV 파이프라인을 nonce로 명시 연결해, 기프티콘 교환이 "광고 시청 완료 + (엄격 모드) SSV 콜백 검증" 후에만 진행되게 한다.

**Architecture:** 클라가 광고 로드마다 nonce를 생성해 SDK `serverSideVerificationOptions`에 싣고, AdMob SSV 콜백이 그걸 `AdRewardLog.nonce`로 저장한다. 클라는 새 `ad-status` 엔드포인트를 폴링해 `ad_log_id`를 확보한 뒤 교환 요청에 동봉한다. 서버의 검증·소비 로직(`request_exchange`)은 이미 완성돼 있어 무변경. 스펙: `docs/superpowers/specs/2026-07-22-admob-ssv-wiring-design.md`

**Tech Stack:** Django 6 + DRF(서버), React Native 0.86 + react-native-google-mobile-ads(클라), Django TestCase + Jest(테스트)

## Global Constraints

- **커밋 금지**: Claude/에이전트는 `git commit`을 실행하지 않는다. 각 태스크 끝의 체크포인트는 "변경 파일 목록 + 테스트 결과 보고"로 대체하고, 커밋은 사용자가 직접 한다.
- 서버 테스트 명령: `cd /Users/elio/Documents/git2/JapaVoca/apps/server && source .venv/bin/activate && python manage.py test <target> --keepdb --noinput` (Supabase 테스트 DB `test_postgres` 재사용. `--keepdb` 빠지면 대화형 프롬프트에 걸림)
- 클라 검증 명령: `cd /Users/elio/Documents/git2/JapaVoca/apps/mobile && npx tsc --noEmit && npx eslint <파일들> && npx jest`
- `npx react-native run-android` 실행 금지(사용자 명시 요청 시에만)
- 새 npm/pip 의존성 추가 금지 — 전부 기존 스택으로 구현
- 기존 jest 스위트 `__tests__/App.test.tsx`는 `global.css` 이슈로 원래 깨져 있음(무시). 기존 52개 테스트는 회귀 없어야 함
- Mock 모드(`ADMOB_SSV_VERIFY=False`)가 기본 — 모든 변경은 이 모드에서 기존 플로우가 계속 돌아야 한다

---

### Task 1: 서버 — `AdRewardLog.nonce` 필드 + 마이그레이션

**Files:**
- Modify: `apps/server/exchange/models.py` (AdRewardLog, `ref_id` 필드 위쪽에 삽입)
- Create: `apps/server/exchange/migrations/0004_adrewardlog_nonce.py` (makemigrations 자동 생성)

**Interfaces:**
- Produces: `AdRewardLog.nonce: CharField(max_length=64, unique=True, null=True, blank=True)` — Task 2(콜백 저장)·Task 3(폴링 조회)이 사용

- [ ] **Step 1: 필드 추가**

`apps/server/exchange/models.py`의 `AdRewardLog`에서 `verified` 필드 바로 아래에 추가:

```python
    # 클라 생성 일회용 nonce(SSV custom_data "<context>:<nonce>" 로 전달됨).
    # 광고 ↔ 보상 액션을 명시적으로 연결하는 키. 콜백 미연결 구버전 로그는 null.
    nonce = models.CharField(
        max_length=64, null=True, blank=True, unique=True,
        help_text='클라 생성 일회용 nonce — 광고와 보상 액션의 명시 연결 키',
    )
```

- [ ] **Step 2: 마이그레이션 생성**

Run: `cd /Users/elio/Documents/git2/JapaVoca/apps/server && source .venv/bin/activate && python manage.py makemigrations exchange`
Expected: `0004_adrewardlog_nonce.py` 생성, "Add field nonce to adrewardlog"

⚠️ 실 Supabase에 `migrate`는 실행하지 않는다(사용자 몫). 테스트 러너가 테스트 DB에 자동 적용한다.

- [ ] **Step 3: 기존 테스트 회귀 확인**

Run: `python manage.py test exchange --keepdb --noinput`
Expected: 기존 3개 테스트 PASS

- [ ] **Step 4: 체크포인트 — 변경 파일·테스트 결과 보고 (커밋은 사용자)**

---

### Task 2: 서버 — SSV 콜백 뷰 `custom_data` 파싱 (TDD)

**Files:**
- Modify: `apps/server/exchange/views.py` (`AdmobSsvView.get`, 현재 L150-165 부근)
- Test: `apps/server/exchange/tests.py` (클래스 추가)

**Interfaces:**
- Consumes: Task 1의 `AdRewardLog.nonce`
- Produces: 콜백 수신 시 `custom_data="<context>:<nonce>"` 파싱 → `AdRewardLog(nonce=...)` 저장. 콜론 없으면 전체를 context로(하위호환). nonce 중복은 200 멱등

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/server/exchange/tests.py`에 추가 (파일 상단 import에 `from django.test import override_settings` 와 `from .models import AdRewardLog` 병합):

```python
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
```

주의: `accounts.models.User`는 파일에 이미 import돼 있음(기존 테스트 참고).

- [ ] **Step 2: 실패 확인**

Run: `python manage.py test exchange.tests.AdmobSsvCallbackTest --keepdb --noinput`
Expected: FAIL — `log.nonce`가 None(파싱 미구현), `custom_data='exchange:abc123'`이 통째로 context 매칭 실패해 BOX_OPEN으로 저장되는 등

- [ ] **Step 3: 구현**

`apps/server/exchange/views.py`에서:

(a) 상단 import에 추가:
```python
from django.db import IntegrityError
```

(b) `AdmobSsvView.get`의 custom_data 블록(현재 L150-155)을 교체:
```python
        # custom_data = "<context>:<nonce>" (클라 useRewardedAd 가 조립).
        # 콜론 없으면 전체를 context 로 해석한다(구버전 하위호환).
        custom_data = q.get('custom_data', '')
        context_part, _, nonce_part = custom_data.partition(':')
        context = (
            context_part
            if context_part in _REWARD_CONTEXTS
            else AdRewardLog.RewardContext.BOX_OPEN
        )
        nonce = nonce_part[:64] or None
```

(c) `AdRewardLog.objects.create(...)` 블록(현재 L158-165)을 교체:
```python
        # 3) 로그 기록(검증 결과 그대로). nonce 동시 중복은 멱등 처리.
        try:
            AdRewardLog.objects.create(
                user=user,
                ad_unit=q.get('ad_unit_id', ''),
                ssv_signature=q.get('signature', ''),
                transaction_id=transaction_id,
                verified=verified,
                reward_context=context,
                nonce=nonce,
            )
        except IntegrityError:
            return Response(status=status.HTTP_200_OK)
```

- [ ] **Step 4: 통과 확인**

Run: `python manage.py test exchange --keepdb --noinput`
Expected: 전체 PASS (기존 3 + 신규 4)

- [ ] **Step 5: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 3: 서버 — `ad-status` 폴링 엔드포인트 (TDD)

**Files:**
- Modify: `apps/server/exchange/views.py` (AdStatusView 클래스 추가, AdmobSsvView 위에)
- Modify: `apps/server/exchange/urls.py`
- Test: `apps/server/exchange/tests.py`

**Interfaces:**
- Consumes: Task 1의 `AdRewardLog.nonce`
- Produces: `GET /api/exchange/ad-status/?nonce=` → `{required: bool, verified: bool, ad_log_id: int|null}` — Task 6(클라 폴링)이 사용. `required` = `settings.ADMOB_SSV_VERIFY`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/server/exchange/tests.py`에 추가 (상단에 `from rest_framework.test import APIClient` 와 `from django.test import override_settings` import 병합):

```python
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
```

- [ ] **Step 2: 실패 확인**

Run: `python manage.py test exchange.tests.AdStatusTest --keepdb --noinput`
Expected: FAIL — 404 (라우트 없음)

- [ ] **Step 3: 구현**

`apps/server/exchange/views.py`의 `_REWARD_CONTEXTS` 정의 위에 클래스 추가:

```python
class AdStatusView(APIView):
    """GET /api/exchange/ad-status/?nonce= — 내 광고 SSV 도착/검증 상태 폴링.

    required=settings.ADMOB_SSV_VERIFY. Mock 모드(False)면 클라가 폴링 없이
    진행하고, 엄격 모드(True)면 verified 될 때까지 폴링 후 ad_log_id 를
    교환 요청에 동봉한다. 본인 로그만 조회된다.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        nonce = request.query_params.get('nonce', '')
        log = None
        if nonce:
            log = AdRewardLog.objects.filter(
                user=request.user, nonce=nonce, verified=True,
            ).first()
        return Response({
            'required': settings.ADMOB_SSV_VERIFY,
            'verified': log is not None,
            'ad_log_id': log.id if log else None,
        })
```

`apps/server/exchange/urls.py` 교체:

```python
"""exchange URL — /api/exchange/ 하위."""
from django.urls import path

from .views import (
    AdmobSsvView,
    AdStatusView,
    ExchangeHistoryView,
    ProductsView,
    RequestExchangeView,
)

app_name = 'exchange'

urlpatterns = [
    path('products/', ProductsView.as_view(), name='products'),
    path('request/', RequestExchangeView.as_view(), name='request'),
    path('history/', ExchangeHistoryView.as_view(), name='history'),
    path('ad-status/', AdStatusView.as_view(), name='ad-status'),
    path('admob/ssv/', AdmobSsvView.as_view(), name='admob-ssv'),
]
```

- [ ] **Step 4: 통과 확인**

Run: `python manage.py test exchange --keepdb --noinput`
Expected: 전체 PASS

- [ ] **Step 5: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 4: 서버 — 엄격 모드 교환 테스트 (테스트만, 구현 무변경)

`request_exchange`의 엄격 모드 분기(`ADMOB_SSV_VERIFY=True`)는 이미 구현돼 있으나 테스트가 없다. 플래그를 켰을 때의 계약을 테스트로 고정한다.

**Files:**
- Test: `apps/server/exchange/tests.py`

**Interfaces:**
- Consumes: `request_exchange(user, product_code, ad_verified, idempotency_key=None, ad_log_id=None)` (exchange/services.py), Task 1의 nonce 필드

- [ ] **Step 1: 테스트 작성**

`apps/server/exchange/tests.py`에 추가:

```python
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
```

import 병합: `from .services import AdNotVerified` (기존 import 블록에 추가), `override_settings`는 Task 3에서 추가됨.

- [ ] **Step 2: 통과 확인 (구현이 이미 있으므로 바로 PASS 기대)**

Run: `python manage.py test exchange --keepdb --noinput`
Expected: 전체 PASS. 실패하면 기존 서비스 로직의 실제 버그 — 수정 전 보고

- [ ] **Step 3: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 5: 클라 — `useRewardedAd` 개선 (earned + nonce + SSV 옵션)

**Files:**
- Modify: `apps/mobile/src/hooks/useRewardedAd.ts` (전체 교체)

**Interfaces:**
- Produces: `useRewardedAd(unitId: string, ssv?: RewardedSsv)` → `{ showThen }`.
  `showThen(onDone: (earned: boolean, nonce: string) => void)` — earned=EARNED_REWARD 수신 여부, nonce=이 광고 로드의 SSV nonce.
  `RewardedSsv = { userId: number; context: 'exchange' | 'box_open' }`
- 하위호환: 기존 `showThen(() => {...})` 호출부(인자 안 쓰는 콜백)는 TS 규칙상 그대로 컴파일됨(deprecated WalletScreen 무수정 통과)

- [ ] **Step 1: 전체 교체 구현**

`apps/mobile/src/hooks/useRewardedAd.ts` 전체를 다음으로 교체:

```typescript
/**
 * 보상형 광고 1개를 관리하는 공용 훅.
 *
 * show 후 (보상/닫힘/실패) 무엇이든 onDone 을 1회 호출해 호출부가 다음 동작을
 * 진행하게 한다(사용자 블로킹 금지). onDone(earned, nonce):
 *   - earned: EARNED_REWARD(시청 완료 보상) 수신 여부. 스킵·조기종료·미로드·표시실패는 false.
 *   - nonce: 이 광고 로드에 실린 SSV nonce — ad-status 폴링 키.
 *
 * 광고는 소비되므로 닫힌 뒤 **새 nonce 로 인스턴스를 재생성**해 다음 회차용으로
 * 로드한다(SSV 옵션은 createForAdRequest 시점에 고정되므로 load() 재사용 불가).
 *
 * ssv 옵션을 주면 serverSideVerificationOptions { userId, customData:
 * "<context>:<nonce>" } 를 실어 AdMob SSV 콜백 → 서버 AdRewardLog 와 명시 연결한다.
 *
 * 상자 개봉/기프티콘 교환 등 "광고 보고 → 서버 액션" 흐름에서 공용으로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

/** SSV 연결 옵션 — context 는 서버 AdRewardLog.RewardContext 값과 일치해야 한다. */
export type RewardedSsv = {
  userId: number;
  context: 'exchange' | 'box_open';
};

function genNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useRewardedAd(unitId: string, ssv?: RewardedSsv) {
  const adRef = useRef<RewardedAd | null>(null);
  const onDoneRef = useRef<((earned: boolean, nonce: string) => void) | null>(null);
  const earnedRef = useRef(false);
  const nonceRef = useRef('');
  const [loaded, setLoaded] = useState(false);
  // 광고 소비(CLOSED) 시 +1 → effect 재실행으로 새 nonce 인스턴스 재생성.
  const [generation, setGeneration] = useState(0);

  // 객체 identity 로 인한 불필요한 재생성 방지 — 원시값으로 분해해 deps 에 사용.
  const ssvUserId = ssv?.userId;
  const ssvContext = ssv?.context;

  useEffect(() => {
    void generation; // 값은 안 쓰고 재생성 트리거로만 씀(exhaustive-deps 충족).
    const nonce = genNonce();
    nonceRef.current = nonce;
    earnedRef.current = false;

    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
      ...(ssvUserId != null && ssvContext
        ? {
            serverSideVerificationOptions: {
              userId: String(ssvUserId),
              customData: `${ssvContext}:${nonce}`,
            },
          }
        : {}),
    });
    adRef.current = ad;

    const fireOnce = () => {
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.(earnedRef.current, nonce);
    };

    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      // 시청 완료(보상 확정) — 보통 CLOSED 보다 먼저 온다.
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earnedRef.current = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setLoaded(false);
        fireOnce();
        setGeneration((g) => g + 1); // 소비됨 — 새 nonce 로 재생성·재로드.
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        setLoaded(false);
        fireOnce();
      }),
    ];
    ad.load();

    return () => {
      onDoneRef.current = null;
      unsubs.forEach((u) => u());
    };
  }, [unitId, ssvUserId, ssvContext, generation]);

  /** 광고를 보여주고 끝나면 onDone(earned, nonce) 호출. 미로드면 즉시 onDone(false, …). */
  const showThen = useCallback(
    (onDone: (earned: boolean, nonce: string) => void) => {
      const ad = adRef.current;
      if (ad && loaded) {
        earnedRef.current = false;
        onDoneRef.current = onDone;
        ad.show().catch(() => {
          onDoneRef.current = null;
          onDone(false, nonceRef.current);
        });
      } else {
        onDone(false, nonceRef.current);
      }
    },
    [loaded],
  );

  return { showThen };
}
```

- [ ] **Step 2: 타입·호출부 호환 확인**

Run: `cd /Users/elio/Documents/git2/JapaVoca/apps/mobile && npx tsc --noEmit`
Expected: 에러 0 (기존 호출부 `showThen(() => …)`는 인자 무시 콜백이라 그대로 컴파일)

- [ ] **Step 3: 린트**

Run: `npx eslint src/hooks/useRewardedAd.ts`
Expected: 에러 0

- [ ] **Step 4: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 6: 클라 — `fetchAdStatus`/`pollAdStatus` + `ad_log_id` 타입 (TDD)

**Files:**
- Modify: `apps/mobile/src/api/exchange.ts`
- Test: `apps/mobile/__tests__/adStatus.poll.test.ts` (신규)

**Interfaces:**
- Consumes: Task 3의 `GET /api/exchange/ad-status/?nonce=`
- Produces:
  - `AdStatus = { required: boolean; verified: boolean; ad_log_id: number | null }`
  - `pollAdStatus(nonce: string, opts?: { intervalMs?: number; maxAttempts?: number }): Promise<AdStatus>` — Task 7(ExchangeScreen)이 사용. 기본 2000ms×15회
  - `ExchangeRequestBody.ad_log_id?: number | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/mobile/__tests__/adStatus.poll.test.ts` 신규:

```typescript
/**
 * pollAdStatus — SSV 콜백 도착 폴링 로직.
 * apiClient 는 모킹(네이티브 의존 차단), intervalMs:0 으로 타이머 대기 제거.
 */
import apiClient from '../src/api/client';
import { pollAdStatus } from '../src/api/exchange';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('pollAdStatus', () => {
  beforeEach(() => mockedGet.mockReset());

  it('Mock 모드(required=false)면 1회 호출로 즉시 반환', async () => {
    mockedGet.mockResolvedValue({
      data: { required: false, verified: false, ad_log_id: null },
    });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.required).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('검증 도착 시 그 시점에 ad_log_id 와 함께 반환', async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { required: true, verified: false, ad_log_id: null },
      })
      .mockResolvedValueOnce({
        data: { required: true, verified: true, ad_log_id: 7 },
      });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.verified).toBe(true);
    expect(res.ad_log_id).toBe(7);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('시도 소진 시 미검증 상태 반환(타임아웃)', async () => {
    mockedGet.mockResolvedValue({
      data: { required: true, verified: false, ad_log_id: null },
    });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 3 });
    expect(res.verified).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('네트워크 오류는 남은 횟수 내 재시도로 흡수', async () => {
    mockedGet
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({
        data: { required: true, verified: true, ad_log_id: 3 },
      });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.verified).toBe(true);
    expect(res.ad_log_id).toBe(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/adStatus.poll.test.ts`
Expected: FAIL — `pollAdStatus is not a function` (미구현)

- [ ] **Step 3: 구현**

`apps/mobile/src/api/exchange.ts`에서:

(a) 파일 상단 주석의 계약 목록에 한 줄 추가:
```
 *   GET  /api/exchange/ad-status/?nonce= → {required, verified, ad_log_id}
```

(b) `ExchangeRequestBody`를 교체:
```typescript
export type ExchangeRequestBody = {
  product_code: string;
  ad_verified: boolean;
  idempotency_key?: string;
  /** SSV 엄격 모드 광고 증빙(AdRewardLog.id). Mock 모드면 서버가 무시. */
  ad_log_id?: number | null;
};
```

(c) `useRequestExchange` 아래에 추가:
```typescript
export type AdStatus = {
  /** 서버가 SSV 엄격 모드인지(ADMOB_SSV_VERIFY). false 면 폴링 없이 진행. */
  required: boolean;
  verified: boolean;
  ad_log_id: number | null;
};

export async function fetchAdStatus(nonce: string): Promise<AdStatus> {
  const response = await apiClient.get<AdStatus>('/api/exchange/ad-status/', {
    params: { nonce },
  });
  return response.data;
}

/**
 * SSV 콜백 도착 폴링. Mock 모드(required=false)면 1회 조회로 즉시 끝난다.
 * 검증 확인 또는 시도 소진 시 마지막 상태 반환. 네트워크 오류는 남은 횟수 내 재시도.
 */
export async function pollAdStatus(
  nonce: string,
  { intervalMs = 2000, maxAttempts = 15 } = {},
): Promise<AdStatus> {
  let last: AdStatus = { required: true, verified: false, ad_log_id: null };
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      last = await fetchAdStatus(nonce);
      if (!last.required || last.verified) {
        return last;
      }
    } catch {
      // 네트워크 오류 — 남은 횟수 내 재시도.
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return last;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/adStatus.poll.test.ts`
Expected: 4개 PASS

- [ ] **Step 5: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 7: 클라 — `ExchangeScreen` 배선 (earned 게이트 + 폴링 + ad_log_id)

**Files:**
- Modify: `apps/mobile/src/screens/main/ExchangeScreen.tsx`

**Interfaces:**
- Consumes: Task 5의 `showThen((earned, nonce) => …)` + `RewardedSsv`, Task 6의 `pollAdStatus`/`ad_log_id`
- 주의: 이 파일의 `keyRef` 멱등키 로직(2026-07-22 R8 수정)은 그대로 유지

- [ ] **Step 1: import·훅 수정**

(a) `import React, { useRef } from 'react';` → `import React, { useRef, useState } from 'react';`

(b) exchange import에 `pollAdStatus` 추가:
```typescript
import {
  pollAdStatus,
  useProducts,
  useRequestExchange,
  type Product,
} from '../../api/exchange';
```

(c) `useRewardedAd` 호출을 SSV 옵션 포함으로 교체:
```typescript
  const { showThen } = useRewardedAd(
    Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED,
    me.data ? { userId: me.data.id, context: 'exchange' } : undefined,
  );
```

(d) `lockRef` 아래에 상태 추가:
```typescript
  // SSV 폴링 중 오버레이 표시용(요청 pending 과 별개 단계).
  const [verifying, setVerifying] = useState(false);
```

- [ ] **Step 2: `handleSelect`의 showThen 블록 교체**

`lockRef.current = true;`부터 `showThen(...)` 끝까지를 다음으로 교체 (멱등키 로직은 유지):

```typescript
    lockRef.current = true;
    // 이번 상품에 진행 중인 키가 있으면(직전 시도 실패) 재사용, 없으면 새로 발급.
    const idempotencyKey = keyRef.current[product.code] ?? genIdempotencyKey();
    keyRef.current[product.code] = idempotencyKey;
    showThen(async (earned, nonce) => {
      // 광고를 끝까지 보지 않았으면(스킵·미로드 포함) 서버 호출 없이 종료 — 차감 없음.
      if (!earned) {
        lockRef.current = false;
        Alert.alert(
          '광고 시청 필요',
          '광고를 끝까지 시청해야 교환할 수 있어요. 광고가 안 나왔다면 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      // SSV 확인 — Mock 모드(required=false)면 1회 조회로 즉시 통과.
      setVerifying(true);
      const status = await pollAdStatus(nonce).finally(() => setVerifying(false));
      if (status.required && !status.verified) {
        lockRef.current = false;
        Alert.alert(
          '광고 확인 지연',
          '광고 시청 확인이 지연되고 있어요. 캐시는 차감되지 않았어요. 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      requestExchange.mutate(
        {
          product_code: product.code,
          ad_verified: true,
          idempotency_key: idempotencyKey,
          ad_log_id: status.ad_log_id,
        },
        {
          onSuccess: () => {
            lockRef.current = false;
            delete keyRef.current[product.code]; // 성공 — 다음 구매는 새 키.
            Alert.alert('교환 완료!', `${product.name} 교환이 완료됐어요.`);
          },
          onError: (error) => {
            lockRef.current = false;
            const response = (error as AxiosError<{ detail?: string }>).response;
            // 응답 없음(네트워크 오류) = 서버 처리 여부 불명 → 키 유지, 재탭은 멱등 재시도.
            // 응답 있음(서버가 정의한 실패) → 키 폐기, 재탭은 새 시도(멱등 레코드 오인 방지).
            if (response) {
              delete keyRef.current[product.code];
            }
            Alert.alert('교환 실패', response?.data?.detail ?? '교환에 실패했습니다. 잠시 후 다시 시도해주세요.');
          },
        },
      );
    });
```

- [ ] **Step 3: 오버레이 조건에 verifying 추가**

`{requestExchange.isPending && (` → `{(requestExchange.isPending || verifying) && (`

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && npx eslint src/screens/main/ExchangeScreen.tsx`
Expected: tsc 에러 0, eslint 에러 0 (기존 warning 은 무방)

- [ ] **Step 5: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 8: 클라 — `BoxOpenScreen` 정직한 earned 기록

**Files:**
- Modify: `apps/mobile/src/screens/quiz/BoxOpenScreen.tsx`

**Interfaces:**
- Consumes: Task 5의 `showThen((earned) => …)` + `RewardedSsv`
- 게이트 없음 — earned 는 `opened_via_ad` 감사 기록용. 미로드여도 개봉은 진행(스펙 결정)

- [ ] **Step 1: 수정**

(a) import 추가:
```typescript
import { useMe } from '../../api/hooks';
```

(b) 컴포넌트 상단 `const queryClient = useQueryClient();` 아래에 추가하고 `useRewardedAd` 호출 교체:
```typescript
  const me = useMe();
  const { showThen } = useRewardedAd(
    Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED,
    me.data ? { userId: me.data.id, context: 'box_open' } : undefined,
  );
```

(c) `handleOpen`의 광고 턴 분기 교체:
```typescript
    if (isAdTurn) {
      // earned = 실제 시청 완료 여부 — opened_via_ad 감사 기록용(게이트 아님).
      showThen((earned) => doOpen(earned));
    } else {
      doOpen(false);
    }
```

- [ ] **Step 2: 검증**

Run: `npx tsc --noEmit && npx eslint src/screens/quiz/BoxOpenScreen.tsx`
Expected: tsc 에러 0, eslint 에러 0

- [ ] **Step 3: 체크포인트 — 보고 (커밋은 사용자)**

---

### Task 9: 전체 검증 + dev 시뮬레이션 가이드

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 서버 전체 테스트**

Run: `cd /Users/elio/Documents/git2/JapaVoca/apps/server && source .venv/bin/activate && python manage.py test --keepdb --noinput`
Expected: 전체 PASS (exchange 신규 포함, learning/rewards 등 회귀 없음)

- [ ] **Step 2: 클라 전체 검증**

Run: `cd /Users/elio/Documents/git2/JapaVoca/apps/mobile && npx tsc --noEmit && npx eslint . && npx jest`
Expected: tsc 0 에러 / eslint 0 에러 / jest 56 pass (기존 52 + 신규 4). `App.test.tsx` global.css 실패는 기존 이슈로 무시

- [ ] **Step 3: 사용자에게 dev 수동 시뮬레이션 절차 보고**

실기기·서버 준비되면 사용자가 직접 수행 (Mock 모드에서 엄격 플로우 검증):

```bash
# 1) 서버 .env 에 ADMOB_SSV_VERIFY=True 임시 설정 후 runserver 재시작
# 2) 앱에서 교환 시도 → 광고 시청 → "광고 확인 지연" 대기 상태 확인
# 3) 그 30초 안에 콜백 도착 시뮬레이션(Metro 로그에서 nonce 확인 또는 임의 조합):
curl "http://localhost:8001/api/exchange/admob/ssv/?transaction_id=tx-sim-1&user_id=<User.pk>&custom_data=exchange:<nonce>&reward_amount=1&reward_item=cash"
# 4) 폴링이 잡아 교환 진행되는지, 같은 로그 재사용이 차단되는지 확인
# 5) 확인 후 ADMOB_SSV_VERIFY 원복(False)
```

- [ ] **Step 4: 최종 체크포인트 — 전체 변경 요약 보고 (커밋·migrate는 사용자)**
