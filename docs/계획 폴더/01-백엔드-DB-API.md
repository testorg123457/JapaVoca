# 백엔드 — DB 모델 변경 & API 명세

> 테이블명은 기존 규칙 `tbl_<app>_<model>`. 모든 신규 캐시 변동 없음(알림/푸시/급수는 캐시 무관).

## 1. `accounts.User` 변경

### 1.1 급수 분리 (기능 A)
- 추가: `jlpt_level_word` (CharField, choices=JLPTLevel, null, blank) — 단어 학습 급수
- 추가: `jlpt_level_kanji` (CharField, choices=JLPTLevel, null, blank) — 한자 학습 급수
- 기존 `selected_jlpt_level` 유지(하위 호환), **데이터 마이그레이션**으로 두 신규 필드에 기존 값 백필.
- (선택) `selected_jlpt_level`은 "기본/공통"으로 남기되 출제는 신규 필드 우선.

### 1.2 멀티 프로바이더 (기능 F)
- 변경: `google_uid` → `null=True, blank=True` (unique 유지; Postgres는 NULL 다중 허용). 카카오 유저는 google_uid 없음.
- 추가: `kakao_uid` (CharField, max_length=150, null, blank, unique)
- 추가: `provider` (CharField, choices=[`google`,`kakao`], default=`google`)
- 마이그레이션: 기존 유저 `provider='google'`. USERNAME_FIELD는 `google_uid` 유지(로그인은 JWT `for_user(pk)` 기반이라 영향 없음). 매니저 `create_user`는 google 전용 경로로 두고, 카카오는 서비스에서 직접 `get_or_create(kakao_uid=...)`.

### 1.3 푸시 환경설정 (기능 E)
- 추가: `push_enabled` (Boolean, default=True) — 전체 푸시 on/off
- 추가: `push_quiz_reminder` (Boolean, default=True) — 학습 리마인더
- 추가: `push_marketing` (Boolean, default=False) — 마케팅/이벤트(기본 off, 동의 기반)

### 1.4 직렬화
- `UserSerializer`(읽기)에 `jlpt_level_word`, `jlpt_level_kanji`, `provider`, `push_enabled`, `push_quiz_reminder`, `push_marketing` 추가.
- `ProfileUpdateSerializer`(쓰기)에 `nickname`, `jlpt_level_word`, `jlpt_level_kanji`, `push_enabled`, `push_quiz_reminder`, `push_marketing` 추가.

## 2. 신규 앱 `notifications` (기능 C)

### 2.1 `Notification` 모델 (`tbl_notifications_notification`)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| user | FK→User (CASCADE) | 수신자 |
| type | CharField choices | `attendance`,`streak`,`box`,`exchange`,`quiz_reminder`,`system` |
| title | CharField(120) | 제목 |
| body | TextField | 본문 |
| is_read | Boolean default False | 읽음 여부 |
| data | JSONField default dict | 딥링크/참조(예: {"screen":"Ledger"}) |
| created_at | DateTimeField auto_now_add | |
| read_at | DateTimeField null | |

인덱스: `(user, is_read, created_at)`, `(user, created_at)`.

### 2.2 생성 헬퍼 `notifications.services.notify(user, type, title, body, data=None)`
- 단순 INSERT(캐시 무관). 이벤트 지점에서 호출:
  - 출석 보너스 지급 후(`rewards.services.check_in`) → `attendance`
  - 연속출석 사이클 보너스 → `streak`
  - 교환 완료/실패(`exchange` 처리부) → `exchange`
  - (선택) 상자 획득/개봉 → `box`
- ⚠️ 호출은 캐시 트랜잭션 **커밋 이후**(transaction.on_commit)로 묶어, 알림 실패가 캐시에 영향 없게.

### 2.3 API (`/api/notifications/`)
| 메서드·경로 | 설명 | 응답 |
|---|---|---|
| GET `/api/notifications/` | 목록(최신순, 페이지네이션) | {count,next,previous,results:[Notification]} |
| GET `/api/notifications/unread-count/` | 미읽음 수(배지용) | {count:int} |
| POST `/api/notifications/<id>/read/` | 단건 읽음 | {id,is_read} |
| POST `/api/notifications/read-all/` | 전체 읽음 | {updated:int} |

## 3. 푸시 (기능 E) — 백엔드 스캐폴드

### 3.1 `PushToken` 모델 (`tbl_notifications_pushtoken`) — notifications 앱에 둠
| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| user | FK→User (CASCADE) | |
| token | CharField(255) unique | FCM 디바이스 토큰 |
| platform | CharField choices [`android`,`ios`] | |
| is_active | Boolean default True | |
| created_at/updated_at | DateTimeField | |

### 3.2 API (`/api/notifications/`)
| 메서드·경로 | 설명 |
|---|---|
| POST `/api/notifications/push-token/` | {token, platform} 등록(upsert) |
| DELETE `/api/notifications/push-token/` | {token} 비활성화 |

### 3.3 발송 추상화 `notifications.push.send_push(user, title, body, data)`
- provider 인터페이스. 기본 `LoggingProvider`(콘솔 로그만, 크리덴셜 없을 때).
- `FcmProvider`는 `settings.FCM_*` 가 설정되면 활성(추후). 발송 전 `user.push_enabled` 및 종류별 플래그 확인.
- 인앱 `notify()`와 함께 호출되도록 `notify(..., push=True)` 옵션 제공.

## 4. 카카오 로그인 (기능 F) — 백엔드

### 4.1 흐름
1. 클라가 카카오 SDK로 **access token** 획득 → `POST /api/auth/kakao/ {access_token}`.
2. 서버가 `https://kapi.kakao.com/v2/user/me` 를 access token으로 호출해 사용자 정보(id, email, nickname) 획득(`requests`).
3. `get_or_create(kakao_uid=..., defaults={provider:'kakao', email, nickname})` → BANNED 거부 → JWT 발급(구글과 동일 `_issue_tokens`).

### 4.2 API
- `POST /api/auth/kakao/` — body `{access_token}` → `{tokens, user, created}` (구글과 동일 응답 형태).
- 설정: `.env`에 `KAKAO_*`는 서버 검증엔 불필요(access token만으로 kapi 호출). 단 클라 SDK는 네이티브 앱키 필요(선결).

## 5. 출석 월별 (기능 B)

### 5.1 API
- `GET /api/rewards/attendance/?year=YYYY&month=M` (IsAuthenticated)
- 처리: `Attendance.filter(user, date in [월초, 월말])` + `Daily.filter(...)` 조인.
- 응답:
```json
{
  "year": 2026, "month": 6,
  "streak_count": 5,
  "days": [
    {"date":"2026-06-25","attended":true,"quiz_count":12,"correct_count":9,"bonus_cash":30}
  ]
}
```
- `quiz_count/correct_count`는 `Daily`에서, `attended/bonus_cash`는 `Attendance`에서. 둘 다 영구 보존(quiz_log와 달리).
- 기존 `attendance/today` 유지.

## 6. 라우팅 등록
- `config/urls.py`에 `path('api/notifications/', include('notifications.urls'))` 추가.
- `accounts/urls.py`에 `kakao/` 추가.
- `rewards/urls.py`에 월별 `attendance/`(쿼리형) 추가 — 기존 `attendance/today/`와 구분 위해 `attendance/month/` 또는 `attendance/` 루트로.

## 7. settings.py
- `INSTALLED_APPS`에 `notifications` 추가.
- `KAKAO_*`(선택), `FCM_*`(선택) 환경변수 자리.
- 신규 패키지: `requests`(카카오 kapi 호출; 이미 transitive로 있을 수 있으나 명시 추가). FCM은 추후 `firebase-admin`.
