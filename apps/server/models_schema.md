# JapaVoca — DB 모델 스키마 요약

팀 참조용. 도메인 앱별 테이블/컬럼 요약. 실제 정의는 각 앱 `models.py` 참조.

공통 규칙
- 모든 모델에 `created_at`(auto_now_add) 기본. 변경 추적 모델은 `updated_at`(auto_now) 추가.
- 캐시 금액 필드는 전부 `BigIntegerField`(정수 캐시 단위, 소수점 없음).
- `choices`는 모델 내 `TextChoices` Enum으로 정의.
- 유저 FK는 `settings.AUTH_USER_MODEL`(= `accounts.User`).

---

## accounts

### accounts_user (User) — 커스텀 유저
`AbstractBaseUser` + `PermissionsMixin`. `USERNAME_FIELD='google_uid'`, `REQUIRED_FIELDS=['email']`.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| password, last_login | (AbstractBaseUser) | 소셜 유저는 unusable password |
| is_superuser, groups, user_permissions | (PermissionsMixin) | |
| google_uid | CharField(150) unique | 구글 OAuth 식별자 |
| email | EmailField unique | |
| nickname | CharField(50) blank | |
| selected_jlpt_level | CharField(2) choices(N1~N5) null blank | 온보딩 전 비어있을 수 있어 null 허용 |
| status | CharField(10) choices(active/flagged/banned) default=active | |
| is_active | BooleanField default=True | |
| is_staff | BooleanField default=False | |
| last_login_at | DateTimeField null | |
| created_at | DateTimeField auto_now_add | |

Enum: `JLPTLevel(N1~N5)`, `Status(active/flagged/banned)`

---

## content

### content_kanji (Kanji) — 한자(~2,200)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| character | CharField(10) unique | 한자 |
| meaning_ko | TextField | 한국어 뜻 |
| components | TextField blank | 구성자 |
| stroke_count | PositiveIntegerField null | 획수 |
| on_reading | CharField(100) blank | 음독 |
| kun_reading | CharField(100) blank | 훈독 |
| meaning_ja | TextField blank | 일본어 뜻 |
| jlpt_level | CharField(2) choices null blank | 미태깅 허용 |
| created_at | DateTimeField auto_now_add | |

Index: `(jlpt_level)`

### content_word (Word) — 단어(~7,000)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| surface | CharField(100) | 단어 표기 |
| word_type | CharField(10) choices(kana/kanji) | |
| reading | CharField(100) blank | 읽기 |
| pos | CharField(50) blank | 품사(파싱 후 채움) |
| jlpt_level | CharField(2) choices null blank | AI 태깅 예정 |
| created_at | DateTimeField auto_now_add | |

Enum: `WordType(kana/kanji)` · Index: `(surface)`, `(jlpt_level)`

### content_wordmeaning (WordMeaning) — 단어 뜻 (Word 1:N)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| word_id | FK(Word) CASCADE | related_name=meanings |
| sense_no | PositiveIntegerField | 의미 순번 |
| meaning_ko | TextField | 정제된 개별 뜻 |
| note | TextField blank | 부가 설명 |
| created_at | DateTimeField auto_now_add | (규칙0 적용) |

Unique: `(word, sense_no)`

---

## learning

### learning_srsstate (SrsState) — SRS 현재 상태(유저×항목)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=srs_states |
| item_type | CharField(10) choices(word/kanji) | |
| item_id | PositiveIntegerField | Word.id/Kanji.id (논리 참조) |
| ease | FloatField default=2.5 | SM-2 계수 |
| interval_days | PositiveIntegerField default=1 | |
| repetitions | PositiveIntegerField default=0 | |
| due_at | DateTimeField | 다음 복습 예정 |
| last_result | CharField(10) choices(correct/wrong) null | |
| created_at | DateTimeField auto_now_add | (규칙0) |
| updated_at | DateTimeField auto_now | |

Enum: `ItemType(word/kanji)`(모듈공용), `LastResult(correct/wrong)`
Unique: `(user, item_type, item_id)` · Index: `(user, due_at)`

### learning_quizlog (QuizLog) — 풀이 이력 (7일 보관)
> 보관 정책: `created_at < now()-7d` 행은 배치 삭제. 장기 통계는 rewards.Daily로 보존.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=quiz_logs |
| mode | CharField(10) choices(word/kanji) | |
| item_type | CharField(10) choices(word/kanji) | |
| item_id | PositiveIntegerField | |
| question_type | CharField(20) choices(word_to_meaning/meaning_to_word) | |
| is_correct | BooleanField | |
| answer_ms | PositiveIntegerField null | 어뷰징 탐지용 |
| jlpt_level | CharField(2) blank | 출제 당시 급수(choices 없음) |
| box_id | FK(rewards.CashBox) SET_NULL null | related_name=quiz_logs |
| created_at | DateTimeField auto_now_add | |

Enum: `Mode(word/kanji)`, `QuestionType(...)`
Index: `(user, created_at)`, `(created_at)`(7일 삭제용)

---

## rewards
> ⚠️ 모든 캐시 변동 = Wallet 잔액 갱신 + Ledger 기록을 **하나의 트랜잭션**으로. `wallet.balance == ledger earn합−use합`.

### rewards_wallet (Wallet) — 캐시 잔고(유저 1:1)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| user_id | OneToOne(User) PK CASCADE | related_name=wallet |
| balance | BigIntegerField default=0 | ≥0 (CheckConstraint) |
| total_earned | BigIntegerField default=0 | 통계 |
| total_used | BigIntegerField default=0 | 통계 |
| created_at | DateTimeField auto_now_add | (규칙0) |
| updated_at | DateTimeField auto_now | |

Constraint: `CHECK(balance >= 0)`

### rewards_ledger (Ledger) — 통합 원장 (append-only, 불변)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) PROTECT | related_name=ledgers |
| direction | CharField(4) choices(earn/use) | |
| amount | BigIntegerField | 항상 양수(CHECK>0), 부호는 direction |
| reason | CharField(20) choices | quiz_box/attendance/streak/ad_bonus/exchange/admin_adjust |
| ref_type | CharField(50) blank | cash_box/gift_exchange/attendance… |
| ref_id | PositiveIntegerField null | |
| balance_after | BigIntegerField | 거래 직후 잔액 스냅샷 |
| ad_verified | BooleanField default=False | 광고 SSV 검증 |
| created_at | DateTimeField auto_now_add | |

Enum: `Direction(earn/use)`, `Reason(...)`
Index: `(user, created_at)`, `(user, direction, created_at)` · Constraint: `CHECK(amount > 0)`

### rewards_cashbox (CashBox) — 캐시상자 인벤토리
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=cash_boxes |
| grade | CharField(10) choices(normal/rare/jackpot) | |
| status | CharField(10) choices(unopened/opened) default=unopened | |
| reward_cash | PositiveIntegerField null | 개봉 전 null |
| opened_via_ad | BooleanField default=False | |
| created_at | DateTimeField auto_now_add | |
| opened_at | DateTimeField null | |

Enum: `Grade(...)`, `Status(...)` · Index: `(user, status)`

### rewards_attendance (Attendance) — 출석/연속출석
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=attendances |
| date | DateField | |
| streak_count | PositiveIntegerField default=1 | |
| bonus_cash | PositiveIntegerField default=0 | |
| is_cycle_reward | BooleanField default=False | 7일 사이클 보너스 |
| created_at | DateTimeField auto_now_add | |

Unique: `(user, date)`

### rewards_daily (Daily) — 데일리 현황/일일상한
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=dailies |
| date | DateField | |
| quiz_count | PositiveIntegerField default=0 | |
| correct_count | PositiveIntegerField default=0 | |
| boxes_earned | PositiveIntegerField default=0 | 일일 상한 체크 |
| cash_earned | BigIntegerField default=0 | |
| ad_bonus_count | PositiveIntegerField default=0 | |
| attended | BooleanField default=False | |
| created_at | DateTimeField auto_now_add | (규칙0) |
| updated_at | DateTimeField auto_now | |

Unique: `(user, date)`

---

## exchange

### exchange_giftexchange (GiftExchange) — 기프티콘 교환
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) PROTECT | related_name=gift_exchanges |
| product_code | CharField(100) | |
| cash_cost | BigIntegerField | 차감 캐시 |
| provider | CharField(50) | 발급사 |
| provider_order_id | CharField(200) unique | 멱등성 키 |
| status | CharField(10) choices(requested/issued/failed/refunded) default=requested | |
| ad_verified | BooleanField default=False | |
| created_at | DateTimeField auto_now_add | |
| issued_at | DateTimeField null | |

Enum: `Status(...)` · Index: `(user, created_at)`, `(status)`

### exchange_adrewardlog (AdRewardLog) — 광고 SSV 검증 로그
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BigAutoField PK | |
| user_id | FK(User) CASCADE | related_name=ad_reward_logs |
| ad_unit | CharField(100) | AdMob 광고 유닛 ID |
| ssv_signature | TextField | SSV 검증 데이터 |
| verified | BooleanField default=False | |
| reward_context | CharField(10) choices(box_open/exchange/bonus) | |
| ref_id | PositiveIntegerField null | CashBox.id 또는 GiftExchange.id |
| created_at | DateTimeField auto_now_add | |

Enum: `RewardContext(...)` · Index: `(user, created_at)`

---

## 마이그레이션 상태
- 생성/적용 완료(`0001_initial` × 5 앱), PostgreSQL(`japavoca`) 적용 확인.
- 적용 순서상 cross-app FK(`learning.QuizLog.box → rewards.CashBox`) 정상 해소.
