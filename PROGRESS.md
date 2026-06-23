# JapaVoca 작업 로그

진행한 작업을 한 줄~두 줄로 누적 기록한다. 새 작업은 아래에 추가(오래된 것이 위, 최신이 아래).

## ✅ 완료

1. 모노레포 셋업 — `apps/mobile`(RN 0.86) + `apps/server`(Django) 두 폴더 구조, 루트 `.gitignore`/`README`, JS workspace 도구 미도입.
2. 모바일 앱 생성 — RN 0.86 TS, 패키지명 `com.japavoca.app`, 내비/Reanimated/NativeWind/MMKV/AdMob/구글로그인/react-query 등 설치.
3. 디자인 시스템 — `tokens.ts` 단일 소스 + NativeWind(토스st 룩), 공용 컴포넌트(Button/Card/CashBadge/AppText) 직접 구현. gluestack 제거.
4. StyleGuideScreen 에뮬레이터 실행 확인 — 빌드 성공, 실제 화면 렌더 스크린샷까지 검증.
5. Django 백엔드 골격 — config + 도메인 앱 5개(accounts/content/learning/rewards/exchange), DRF+JWT+CORS, env 기반 settings.
6. DB 모델 구현 — 5개 앱 전체 모델 작성(커스텀 User, 캐시 BigInteger, 원장 append-only 등), PostgreSQL 마이그레이션 적용, admin 등록, `models_schema.md` 정리.
7. JWT 로그인 + 구글 소셜 인증 API — 구글 ID토큰 검증→유저 get_or_create→JWT 발급(`/api/auth/google`), `/me` 조회·수정, 토큰 갱신. 스모크 테스트 통과.
8. 캐시 트랜잭션 서비스 — `rewards/services.py` earn/use(원장+잔액 한 트랜잭션, select_for_update로 음수/이중차감 방지), 상자 개봉(`/api/rewards/boxes/<id>/open`)·지갑 조회. 정합성 검증 통과.
9. 퀴즈 출제 API — `/api/quiz/next`(SRS 기반 출제+4지선다 오답), `/api/quiz/answer`(서명 토큰 서버 채점+SM-2+QuizLog+Daily+정답 시 상자). 스모크 통과.
10. QuizLog 7일 배치 삭제 — management command(`delete_old_quiz_logs --dry-run`) + Celery task(max_retries=0) + Beat 매일 03:00(KST). 테스트 7건 통과(경계값 포함).

## ⬜ 다음 할 일

1. 콘텐츠 시드 (한자/단어 임포트)
2. 기프티콘 교환 API (멱등성 + 캐시 차감/롤백)
3. AdMob SSV 검증 연동
4. Celery worker/beat 실행 운영 문서화 (README)
