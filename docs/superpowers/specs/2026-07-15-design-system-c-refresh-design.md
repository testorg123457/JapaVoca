# 디자인 시스템 정리 패스 — 설계 (2026-07-15)

## 배경

frontend-design 관점 진단: 시스템 뼈대(2-tier 토큰, 그림자 원칙, 굵기 위계)는 좋으나
① 다크 모드가 웜 브라운이라 라이트(쿨 뉴트럴)와 온도가 어긋나고
② vermilion→mint 전환의 잔재(이름·주석·다크 틴트 값)가 남아 있다.
캐시앱다운 인상은 수익 모델(캐시워크형)상 의도된 것이므로 민트 유지.

> 시그니처 도장(Stamp) 도입안은 구현 후 **사용자 결정으로 철회**(2026-07-15).
> 사용자의 실제 요구 = 새 장치 추가가 아니라 "부족한 부분·AI스러운 부분 교정".

## 1. 다크 모드 온도 통일

웜 브라운 → 쿨 잉크(그림자 잉크 #0B1220과 같은 방향). 키 집합은 불변.

| 토큰 | 기존 | 변경 |
|---|---|---|
| bg-secondary (=bg) | #1A1716 | #161719 |
| bg-primary (=surface) | #241F1E | #1F2023 |
| bg-tertiary / border-tertiary | #332B29 | #2A2B2F |
| border-secondary (=border) | #4A4442 | #3E4045 |
| brand-subtle (=brand-soft) | #3A1A14 (버밀리온 잔재 레드 틴트) | #10301F (민트 틴트) |
| brand-subtle-active | #4D241C | #164028 |

`danger-subtle`(#3A1A14)은 레드 틴트가 정상이므로 유지. amber/success/info 틴트도 유지.

## 2. 네이밍·잔재 정리

- semantic `coral`/`coral-subtle` 삭제 (라이트·다크, 사용처 0 확인).
- semantic `epic`/`epic-subtle`/`box`/`box-subtle` + `brown` 프리미티브 삭제 — 상자 등급 5종→2종(normal/purple) 축소로 미사용. `purple` 프리미티브는 BoxOpenScreen이 사용하므로 유지.
- "Vermilion" 잔재 주석·문구 현행화: tokens.ts, Button.tsx, StyleGuideScreen.tsx(+틀린 그레이 hex 라벨 교정).

## 3. 아이콘 틴트 통일 (색 역할 규율 적용)

비-스피너 brand 아이콘 전수 점검(7곳). 기능색(주액션/활성/상태)은 유지, 색 역할표상
리워드 계열인데 민트를 쓰던 4곳을 amber로 교정:

| 위치 | 기존 | 변경 | 근거 |
|---|---|---|---|
| WalletScreen 상품 gift 타일 | brand-subtle + brand | amber-subtle + amber-strong | 리워드=amber 역할 |
| GifticonWalletScreen 카드 스트립 | brand-subtle + brand | amber-subtle + amber-strong | 〃 |
| GifticonDetailScreen 아이콘 | brand-subtle + brand | amber-subtle + amber-strong | 〃 |
| BookmarkScreen 활성 북마크 | brand | amber | LockQuiz·복습 모달의 활성 북마크=amber와 통일 |

유지: 홈 퀴즈 카드 book(주액션), LockTheme 활성 체크(선택 상태), 문의 답변 라벨(새 답변 상태 신호).

## 문서 현행화 (코드 수정 후)

- `docs/디자인-시스템-원칙.md`: 진행 현황 현행화(구 "Primary = Vermilion" 상태로 낡아 있었음).
- `docs/프로잭트-현황.md` §10: 타이포 수치 어긋남(문서 hero 42/title 22 ↔ 실제 34/19) 교정.

## 검증

- `npx tsc --noEmit` + ESLint(수정 파일). 네이티브 재빌드 불필요(폰트·에셋 변경 없음).
- 다크 모드 실기기 확인은 사용자가 원할 때 (빌드는 요청 시에만 — 프로젝트 규칙).
