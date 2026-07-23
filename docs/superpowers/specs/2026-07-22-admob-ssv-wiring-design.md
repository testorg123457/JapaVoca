# AdMob SSV 배선 설계 — 교환 엄격 게이트 + nonce 연결

날짜: 2026-07-22
상태: 승인됨 (elio)

## 배경 / 문제

CLAUDE.md 절대 원칙: **"광고 보상은 AdMob SSV(서버 검증) 통과 후에만 지급한다."**
현재 서버에는 SSV 파이프라인(콜백 수신 `AdmobSsvView`, 서명 검증 `ssv.py`,
로그 소비 로직 `request_exchange`)이 완성돼 있으나 **클라이언트와 한 번도 연결된 적이 없다**:

- `useRewardedAd`가 `EARNED_REWARD`(실제 시청 완료)를 구독하지 않음 — 스킵/미로드도 성공 취급 (감사 R1/R6)
- 클라가 SDK에 `serverSideVerificationOptions`(userId/customData)를 싣지 않음 — 콜백이 와도 연결 불가
- 클라가 `ad_log_id`를 서버에 보내지 않음 — `ADMOB_SSV_VERIFY=True`를 켜는 순간 모든 교환이 400 (감사 R2)

결과: Mock 모드(현 기본)에서 광고 없이 기프티콘 교환 가능(캐시 유출 경로).

## 확정된 결정

| 결정 | 선택 | 근거 |
|---|---|---|
| 게이트 범위 | **교환만 엄격**, 상자 개봉은 느슨(감사 기록만) | 상자 보상은 광고와 무관(수익화 수단), 교환은 돈이 나가는 관문. 서버 주석의 기존 의도와 일치 |
| 콜백 대기 UX | **폴링 대기** (2초×15회, 최대 30초) | 교환은 드문 이벤트라 대기 허용. 낙관 진행은 발급 후 회수 불가라 부적합 |
| 광고↔보상 연결 | **nonce 명시 연결** (접근안 A) | 돈 나가는 경로는 "어느 광고가 이 교환을 허가했나"가 명시적이어야 함. 기존 소비 로직(ref_id)과 자연스럽게 맞물림 |
| 운영 전제 | 공개 서버 있음, AdMob 콘솔 등록은 아직(테스트 광고만) | 배선을 지금 완성하되 Mock 모드 기본 유지. 등록 후 서버 플래그만 켜면 전환 |

## 데이터 흐름

```
[클라] 광고 로드 시 nonce(UUID) 생성
       → SDK serverSideVerificationOptions { userId: User.pk, customData: "exchange:<nonce>" }
[클라] 유저 시청 → RewardedAdEventType.EARNED_REWARD 로 실제 완료 확인
[AdMob] → GET /api/exchange/admob/ssv/ 콜백 (custom_data 그대로 전달)
[서버] AdmobSsvView: custom_data 파싱 → AdRewardLog(nonce 저장, verified)
[클라] GET /api/exchange/ad-status/?nonce=… 폴링 → { required, verified, ad_log_id }
[클라] POST /api/exchange/request/ + ad_log_id
[서버] request_exchange (무변경): 로그 검증(verified·EXCHANGE·미소비) → 소비 → 차감 → 발급
```

### 모드 스위치 (핵심 설계 포인트)

`ad-status` 응답의 `required` = `settings.ADMOB_SSV_VERIFY`. 클라는 광고 시청 후 1회 조회:

- `required=false` (Mock, 현 기본): 폴링 없이 바로 교환. 단 **`earned=true`일 때만** `ad_verified=true` 전송 — Mock 모드에서도 "광고 안 보면 교환 불가"가 클라 수준에서 정직해짐
- `required=true` (AdMob 등록 후): 폴링 → `ad_log_id` 확보 → 교환

→ 플래그 전환 시 **클라 수정/재배포 불필요** (런타임 적응).

## 서버 변경 (3개)

1. **`AdRewardLog.nonce`** — `CharField(max_length=64, unique=True, null=True, blank=True)` + 마이그레이션 1개. Postgres는 NULL 중복 허용이라 기존 행 안전.
2. **`AdmobSsvView`** — `custom_data`를 `"context:nonce"`로 파싱(`split(':', 1)`). 콜론 없으면 기존처럼 전체를 context로 해석(하위호환). nonce 중복(unique 충돌)은 멱등 처리.
3. **새 엔드포인트** `GET /api/exchange/ad-status/?nonce=` — `IsAuthenticated`, **본인 로그만** 조회(`user=request.user`). 응답 `{ required: bool, verified: bool, ad_log_id: int|null }`. 로그 미도착이면 `verified=false, ad_log_id=null`.

**무변경**: `request_exchange`(검증·소비 완성됨), `open_cash_box`(느슨 유지), `ExchangeRequestSerializer`(`ad_log_id` 이미 수용).

## 클라이언트 변경 (3개)

1. **`useRewardedAd` 개선** (핵심):
   - `EARNED_REWARD` 구독 → `showThen(onDone)`의 콜백 시그니처를 `onDone(earned: boolean)`으로 변경. 미로드 시 즉시 `onDone(false)`.
   - 로드 시 nonce 생성 + `serverSideVerificationOptions` 설정. 훅이 현재 nonce 노출.
   - ⚠️ SSV 옵션은 `createForAdRequest` 시점 고정 → 광고 소비 후 재로드는 **새 nonce로 인스턴스 재생성** 구조로 변경 (현재의 "마운트 시 1회 생성 + ad.load() 재사용" 구조 폐기).
   - 옵션 파라미터: `useRewardedAd(unitId, { ssv?: { userId: number, context: 'exchange' | 'box_open' } })` — nonce는 훅 내부에서 생성하고 `customData = "<context>:<nonce>"`를 훅이 조립. SSV 옵션은 교환·상자 화면 모두 설정(상자는 감사용).
   - 호출부 전수 갱신: `BoxOpenScreen`, `ExchangeScreen` (2곳뿐).
2. **`ExchangeScreen`**:
   - `earned=false` → 서버 호출 없이 "광고 시청이 필요해요 / 광고를 불러오지 못했어요" 안내 (차감 없음)
   - `earned=true` → ad-status 1회 조회 → `required=false`면 바로 교환 / `required=true`면 폴링(2초×15회) → `ad_log_id`로 교환
   - 폴링 중 기존 `isPending` 오버레이 재사용(로컬 state 추가). 타임아웃 → 차감 없이 "확인이 지연되고 있어요, 잠시 후 다시 시도해주세요"
   - R8에서 도입한 멱등키 로직과 공존(변경 없음)
3. **`BoxOpenScreen`**: `showThen((earned) => doOpen(earned))` — `opened_via_ad` 감사 기록이 정직해짐. 게이트 없음(미로드여도 개봉 진행).

## 에러 처리

| 상황 | 처리 |
|---|---|
| 광고 미로드/스킵 (교환) | 서버 호출 없음, 안내 후 종료. 차감 없음 |
| SSV 콜백 지연 > 30초 | 폴링 타임아웃 → 차감 없이 재시도 안내. 늦게 도착한 로그는 미소비로 남아 무해(재사용 차단은 소비 로직이 보장) |
| 폴링 중 네트워크 오류 | 남은 횟수 내 계속 재시도 |
| nonce 콜백 중복 수신 | transaction_id + nonce unique로 멱등 |
| 발급 실패 | 기존 REFUNDED 환불 로직 그대로 (2026-07-22 R5 수정 반영) |

## 검증 계획

- **서버 테스트** (`exchange/tests.py` 확장):
  - 콜백 뷰: `custom_data="exchange:abc"` 파싱, 콜론 없는 하위호환, nonce 중복 멱등
  - ad-status: 인증 필수, 타인 nonce 조회 불가, 미도착 시 `verified=false`, `required` 플래그 반영
  - `override_settings(ADMOB_SSV_VERIFY=True)`: ad_log 있으면 교환 성공+소비, 없으면 AdNotVerified, 소비된 로그 재사용 차단
- **클라**: `tsc --noEmit`, `eslint`, `jest` (기존 52개 회귀 없음)
- **수동 e2e(dev)**: 서명 검증 꺼진 상태에서 콜백 URL을 curl로 직접 호출해 도착 시뮬레이션 → 앱에서 폴링→교환 전 과정 확인
- 테스트 실행: `python manage.py test exchange --keepdb --noinput`

## 범위 외

- AdMob 콘솔 등록·실 서명 e2e (등록 후 별도)
- Play Integrity / 응답속도 어뷰징 탐지
- 상자 개봉 쪽 로그 재사용(감사 R3) — 느슨 모드 결정으로 무관, 엄격화 시 재검토
- SSV 엔드포인트 rate limit (감사 R10) — 프로덕션에서 `ADMOB_SSV_VERIFY=True` 필수를 전제로 서명이 신뢰 근거

## 운영 체크리스트 (나중에 AdMob 등록 시)

1. AdMob 콘솔에 앱·보상형 유닛 등록, SSV 콜백 URL = `https://<서버>/api/exchange/admob/ssv/`
2. `.env`의 광고 유닛 ID 교체 (`ADMOB_REWARDED_BOX_ID`)
3. 서버 `.env`에 `ADMOB_SSV_VERIFY=True`
4. 실기기에서 교환 1건 e2e 확인
