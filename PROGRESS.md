# JapaVoca 작업 로그

진행한 작업을 한 줄~두 줄로 누적 기록한다. 새 작업은 아래에 추가(오래된 것이 위, 최신이 아래).

## ✅ 완료

1. 모노레포 셋업 — `apps/mobile`(RN 0.86) + `apps/server`(Django) 두 폴더 구조, 루트 `.gitignore`/`README`, JS workspace 도구 미도입.
2. 모바일 앱 생성 — RN 0.86 TS, 패키지명 `com.japavoca.app`, 내비/Reanimated/NativeWind/MMKV/AdMob/구글로그인/react-query 등 설치.
3. 디자인 시스템 — `tokens.ts` 단일 소스 + NativeWind(토스st 룩), 공용 컴포넌트(Button/Card/CashBadge/AppText) 직접 구현. gluestack 제거.
4. StyleGuideScreen 에뮬레이터 실행 확인 — 빌드 성공, 실제 화면 렌더 스크린샷까지 검증.
5. Django 백엔드 골격 — config + 도메인 앱 5개(accounts/content/learning/rewards/exchange), DRF+JWT+CORS, env 기반 settings.
6. DB 모델 구현 — 5개 앱 전체 모델 작성(커스텀 User, 캐시 BigInteger, 원장 append-only 등), PostgreSQL 마이그레이션 적용, admin 등록, `models_schema.md` 정리.

## ⬜ 다음 할 일

1. JWT 로그인 + 구글 소셜 인증 API
2. 퀴즈 출제 API (SRS 출제 + 오답 생성 + 정답 채점)
3. 캐시 트랜잭션 서비스 (원장 + 잔액 원자성)
4. 콘텐츠 시드 (한자/단어 임포트)
5. QuizLog 7일 보관 삭제 배치
