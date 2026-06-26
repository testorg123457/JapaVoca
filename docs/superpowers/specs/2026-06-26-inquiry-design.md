# 문의하기 + 답변 조회 — 설계 문서

> 작성일: 2026-06-26
> 관련 플랜: `docs/문의하기-구현플랜.md`
> 목표: Gmail mailto 제거 → DB 저장 방식으로 전환. 운영자는 Django Admin에서 읽고 답변.

---

## 1. 배경

- `SettingsScreen.tsx:160` — `openSupport()`: Alert로 Gmail 주소만 노출하는 방식.
- 서버에 support 관련 앱/모델/엔드포인트 없음.
- 캐시/지갑과 완전 무관 — 원장·트랜잭션 로직 건드리지 않음.

---

## 2. 데이터 모델

```
Inquiry (tbl_support_inquiry)
├── user          FK → User, on_delete=CASCADE
├── content       TextField, max_length=2000
├── created_at    DateTimeField, auto_now_add=True
├── answer        TextField, null=True, blank=True
├── answered_at   DateTimeField, null=True, blank=True   ← Admin save_model에서 자동 채움
└── is_answer_read  BooleanField, default=False
```

- 1문의 = 1행. `answer` null → 대기 중, 값 있으면 답변 완료.
- 스레드·추가 메시지 없음.

---

## 3. API 엔드포인트

| 메서드 | URL | 설명 |
|---|---|---|
| `POST` | `/api/support/inquiries/` | 문의 등록 (하루 10건 제한) |
| `GET` | `/api/support/inquiries/` | 내 문의 목록, 최신순 |
| `GET` | `/api/support/inquiries/unread-count/` | 미확인 답변 수 (뱃지용) |
| `PATCH` | `/api/support/inquiries/mark-all-read/` | 전체 읽음 처리 |

- 전부 `IsAuthenticated`. 본인 데이터만 접근.
- `POST` — 당일 제출 건수를 view 레벨에서 체크, 10건 초과 시 `429` 반환. 자정 기준은 서버 `TIME_ZONE` (Asia/Seoul) 기준.

---

## 4. Django Admin

- `support/admin.py`에 `Inquiry` 등록.
- `InquiryAdmin.save_model` 오버라이드: `answer`가 새로 채워질 때 `answered_at = now()` 자동 설정.
- 운영자는 Admin에서 문의 조회 및 답변 작성. 직접 DB 접근 불필요.

---

## 5. 프론트 구조

### 5-1. 파일 배치

```
apps/mobile/src/
├── api/
│   └── support.ts               # Inquiry 타입 + API 함수
├── api/hooks.ts                 # useInquiries, usePostInquiry,
│                                #   useUnreadInquiryCount, useMarkAllInquiriesRead 추가
└── screens/main/
    └── InquiryScreen.tsx        # 목록 + 하단 고정 작성박스
```

### 5-2. InquiryScreen 레이아웃

```
┌─────────────────────────────────┐
│  ← 문의하기                      │
├─────────────────────────────────┤
│  [과거 문의 카드 목록 - 스크롤]    │
│                                 │
│  ┌─────────────────────────────┐│  ← is_answer_read=false면 좌측 brand 세로 바
│  │ 2026.06.26                  ││
│  │ 퀴즈가 안 나와요...           ││
│  │ ─────────────────────────  ││
│  │ 💬 앱을 재시작해 보세요.       ││  ← answer 있을 때
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 2026.06.25                  ││
│  │ 캐시가 안 쌓여요              ││
│  │            ⏳ 답변 준비 중    ││  ← answer 없을 때
│  └─────────────────────────────┘│
│                                 │
│  빈 상태: 텍스트만 ("아직 문의가  │
│  없어요. 궁금한 점 보내주세요.")  │
├─────────────────────────────────┤
│  [하단 고정 작성박스]             │  ← KeyboardAvoidingView
│  ┌─────────────────────────────┐│
│  │ 무엇이 궁금하신가요?           ││
│  │                   [보내기 →]││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 5-3. 상태 처리

| 상황 | 처리 |
|---|---|
| 전송 성공 | 인라인 토스트 + 텍스트 초기화 + 목록 invalidate |
| 전송 실패 | 에러 토스트 ("문의 전송에 실패했어요. 다시 시도해주세요.") |
| 하루 10건 초과 | 에러 토스트 ("오늘 문의 한도에 도달했어요.") |
| 전송 중 | 버튼 로딩 상태, 중복 전송 방지 |

### 5-4. 뱃지 / 읽음 처리

- `useUnreadInquiryCount` — InquiryScreen 내 `useEffect`에서 AppState `active` 복귀 시 `refetch` 호출. 폴링 없음.
- Settings "문의하기" ListRow 우측에 빨간 dot (unread > 0).
- InquiryScreen 마운트 시 `mark-all-read` 호출 — **낙관적 업데이트**로 즉시 뱃지 0 처리. API 실패 시 롤백.

---

## 6. 네비게이션 변경

- `MainStackParamList`에 `Inquiry: undefined` 추가
- `MainStack.tsx`에 `InquiryScreen` 등록
- `SettingsScreen`: `SUPPORT_EMAIL`, `SUPPORT_MAIL` 상수 제거, `openSupport()` 제거, ListRow → `navigation.navigate('Inquiry')`

---

## 7. 디자인 원칙

- `tokens.ts` 기준. 하드코딩 금지.
- 카드 모서리 `rounded-xl`.
- 미확인 답변: 카드 좌측 brand 색 세로 바 (확인 후 사라짐).
- 답변 없음: `⏳ 답변 준비 중` 우측 정렬 tertiary 소형 텍스트.

---

## 8. 범위 밖

- 푸시 알림 (2차)
- 운영자 별도 UI (Django Admin으로 충분)
- 첨부파일, 카테고리 분류, 스레드
