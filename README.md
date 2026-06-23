# JapaVoca (일본어 한자 보카)

게임화 리워드를 곁들인 일본어 한자 단어 학습 앱. React Native(Android 우선) 앱과
Django 백엔드로 구성된 단일 git 모노레포입니다.

> JS workspace 도구(Nx/Turbo 등)는 사용하지 않습니다. RN 네이티브 빌드 경로 문제를
>피하기 위해 "같은 레포의 두 폴더"로 단순하게 시작하고, 공유 패키지가 실제로 필요해지면
> 그때 도입합니다.

## 폴더 구조

```
JapaVoca/
├── apps/
│   ├── mobile/        # React Native 앱 (android/ ios/ 네이티브 포함)
│   │   └── src/
│   │       ├── theme/         # 디자인 토큰 단일 소스 (tokens.ts) + gluestack 매핑
│   │       ├── components/    # 공용 UI (Button, Card, CashBadge ...)
│   │       ├── screens/       # 화면 (StyleGuide, Home, Quiz, Wallet ...)
│   │       ├── navigation/    # 내비게이터
│   │       ├── api/           # axios + react-query 훅
│   │       ├── store/         # 로컬 상태 (mmkv 래퍼 등)
│   │       └── lib/           # 유틸
│   └── server/        # Django 백엔드 (자체 Python venv)
│       ├── config/    # Django 프로젝트 설정
│       ├── accounts/  # user / 소셜로그인
│       ├── content/   # word / kanji / word_meaning
│       ├── learning/  # srs_state / quiz_log
│       ├── rewards/   # wallet / ledger / cash_box / attendance / daily
│       └── exchange/  # gift_exchange / ad_reward_log
├── docs/              # 기획/계획 문서
├── .gitignore
└── README.md
```

## 사전 요구사항

- Node.js 18+ / npm
- JDK 17 (Android 빌드용)
- Android Studio + Android SDK (에뮬레이터 또는 실기기)
- Python 3.11+ (백엔드)
- (선택) PostgreSQL — 미설치 시 `.env`에서 `DB_ENGINE=sqlite`로 개발 가능

> iOS 빌드는 현재 범위 밖입니다(Android 우선).

## 모바일 앱 실행 (apps/mobile)

```bash
cd apps/mobile
npm install                  # 최초 1회

# Android 에뮬레이터 실행 또는 기기 연결 후
npm start                    # Metro 번들러 (별도 터미널)
npx react-native run-android # 빌드 & 설치
```

- 패키지명(applicationId): `com.japavoca.app`
- 환경 점검: `npx react-native doctor`

## 백엔드 실행 (apps/server)

```bash
cd apps/server
python3 -m venv .venv               # 최초 1회 (Python 3.11+)
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # 키/DB 값 채우기 (로컬은 DB_ENGINE=sqlite 권장)

python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000
```

## 디자인 시스템

"토스st" — 부드럽고 둥근 한국형 리워드 앱 룩. 디자인 토큰의 단일 소스는
`apps/mobile/src/theme/tokens.ts`이며, NativeWind(`tailwind.config.js`)와
gluestack 테마가 동일한 값을 참조합니다. 룩 확인용 데모는 `StyleGuideScreen`.
