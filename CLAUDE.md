CLAUDE.md — JapaVoca (일본어 한자 보카)

Claude Code가 이 저장소에서 작업할 때 반드시 따르는 규칙. 작업 전 이 문서를 먼저 숙지한다.

프로젝트 한 줄 요약

일본어(단어·한자) 학습 + 캐시 리워드 안드로이드 앱. 퀴즈를 풀면 캐시상자를 받고, 광고를 보며 캐시를 적립해 기프티콘으로 교환한다. 수익 모델은 캐시워크형(AdMob 보상형 광고).


서비스명: 일본어 한자 보카 / 영문 JapaVoca / 패키지 com.japavoca.app
1차 플랫폼: Android 우선 (iOS는 3차)


저장소 구조 (모노레포)

japavoca/
├── apps/
│   ├── mobile/   # React Native (TS). android/ 에 네이티브(Kotlin) 포함
│   └── server/   # Django 백엔드 (자체 .venv)
├── docs/         # 기획/계획 문서
└── CLAUDE.md


JS workspace 도구(Nx/Turbo/yarn workspaces)는 도입하지 않는다. RN 네이티브 빌드 경로 문제 때문. mobile/server는 같은 레포의 독립 폴더로 다룬다.
백엔드는 Python venv로 독립 동작. JS 의존성과 섞지 않는다.


기술 스택 (확정)


클라이언트: React Native (TypeScript)
스타일/UI: NativeWind(Tailwind) + 자체 디자인 토큰. ⚠️ gluestack-ui는 사용하지 않는다(웹 react-dom 의존으로 RN 번들 깨짐 → 제거 결정). 공용 컴포넌트는 NativeWind로 직접 만든다.
애니메이션: react-native-reanimated(+worklets), gesture-handler, lottie
광고: react-native-google-mobile-ads (AdMob 보상형)
인증: 구글 소셜 로그인 (@react-native-google-signin)
백엔드: Django + DRF, JWT 인증
DB: PostgreSQL


디자인 규칙


디자인 토큰은 apps/mobile/src/theme/tokens.ts 단일 소스. 색·간격·라운드·그림자·타이포를 여기서만 정의하고 Tailwind config와 컴포넌트가 이 값을 참조한다. 하드코딩 금지.
톤: 최대한 둥글둥글하게. 버튼·카드·인풋·모달·뱃지 모서리를 넉넉히 둥글린다. 각진 요소 지양.
포인트 컬러는 절제해서 한 곳에만. 폰트는 Pretendard.


캐시(돈) 관련 — 가장 중요한 원칙

캐시는 자산이다. 정합성이 깨지면 안 된다.


모든 캐시 적립/사용은 통합 원장 ledger(+/-를 direction earn/use로 구분)에 기록한다.
wallet.balance = ledger의 earn합 − use합 이 항상 일치해야 한다.
캐시 변동은 "원장 기록 + 잔액 갱신"을 하나의 트랜잭션으로 처리. 잔액 갱신은 행 잠금/조건부 UPDATE로 음수·이중차감 방지.
정답 판정·캐시 지급은 반드시 서버에서 검증. 클라이언트 값을 신뢰하지 않는다.
광고 보상은 AdMob SSV(서버 검증) 통과 후에만 지급한다.
기프티콘 발급은 멱등성 키로 중복 방지, 발급 실패 시 캐시 롤백.


어뷰징 방지 기본선


1인 1구글계정 기준. 일일 캐시 상한 적용(daily 테이블 기준).
응답속도(answer_ms)·반복 패턴으로 자동클릭 탐지. Play Integrity로 비정상 기기 차단.
quiz_log는 7일만 보관 후 자동 삭제(파티션 DROP 또는 배치 DELETE). 장기 통계는 daily 집계로 보존.


작업 범위 / 단계


MVP: 로그인·온보딩, 단어/한자 4지선다(SRS), 캐시상자·개봉광고, 지갑·내역, 출석·연속출석, 기프티콘 교환, SSV·정합성·어뷰징 방어.
2차: 잠금화면 학습(네이티브 모듈, apps/mobile/android/), 광고 보너스 상자, 예문·듣기, 푸시, 통계.
3차: iOS, 입력형·획순, 랭킹·초대, 테마/꾸미기, 구독.
상세는 docs/의 계획서 참조.


작업 습관


큰 작업은 한 번에 다 하지 말고 단계로 쪼개 진행하고, 각 단계 끝에 한 일/막힌 점/다음 단계를 보고한다.
환경 도구(Node/JDK/SDK/DB 등)가 없으면 임의로 설치하지 말고 사용자에게 알린다.
의존성을 새로 추가할 땐 이유를 한 줄로 남긴다.
비밀키는 코드에 넣지 말고 .env로 분리(.env.example에 자리만).


자주 쓰는 명령

bash# 모바일
cd apps/mobile && npm install
npx react-native run-android        # 첫 빌드는 오래 걸림(정상)

# 백엔드
cd apps/server && source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver


새 기기에서 클론 후엔 node_modules / .venv 가 없으므로 install부터. Gradle 첫 빌드는 기기마다 한 번씩 길다.