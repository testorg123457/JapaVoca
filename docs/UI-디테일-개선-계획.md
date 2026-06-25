# UI 디테일 개선 계획 — "알라미급" 깔끔한 UX/UI (라이트 유지)

> 상태: **검토/실행 대기**. 이 문서는 **다른 AI가 단독으로 작업**할 수 있도록 상세히 적는다.
> 짝 문서: 레이아웃 버그 3종(탭 안 눌림·광고 짤림·카드 깨짐)은 [`UI-레이아웃-수정-계획.md`](UI-레이아웃-수정-계획.md)에 별도 정리됨. **그 문서의 §2(A·B·C)도 이 작업과 함께 처리**한다(같은 영역).
> 작업 디렉터리: `apps/mobile`. 절대 경로 기준은 모두 `apps/mobile/`.

---

## 0. 한 줄 목표
현재 민트-라이트 디자인을 유지한 채, **배달의민족 톤 + 알라미(Alarmy) 수준의 깔끔하고 세련된 정보 위계/여백/리스트 패턴**으로 다듬는다.

⚠️ **다크 모드로 바꾸는 게 아니다.** 사용자가 원한 건 알라미의 *다크 색감*이 아니라 *UX/UI의 깔끔함*(여백, 타이포 위계, 줄 구분 리스트, 하단 바, 닫기 버튼 등)이다. 색 테마는 지금의 민트-라이트 그대로.

---

## 1. 반드시 지킬 제약 (어기면 안 됨)
- **디자인 토큰 단일 소스 유지**: `src/theme/tokens.ts`. 색·간격·라운드·타이포·그림자는 여기서만 정의. 화면/컴포넌트에서 hex·매직넘버 하드코딩 금지(구글 로고색 등 의도된 상수 제외).
- **NativeWind className 우선**, 인라인 색이 필요하면 `useThemeColors()`(`ThemeProvider.tsx`)의 semantic 키 사용.
- **라이트 테마 유지**(민트 `brand-400 #2AC1BC`, 옐로 `#FFCE00`, 따뜻한 그레이). 다크 토큰 세트는 건드리지 말고 그대로 둔다(시스템 다크 대응 유지).
- 기존 공용 컴포넌트(`AppText`/`Button`/`Card`/`Tag`/`Icon`/`SectionHeader`/`PressableScale`/`ProgressBar`/`Gradient`) 패턴을 따르고, 새 컴포넌트도 같은 톤으로.
- 캐시(자산) 관련 로직·API는 건드리지 않는다. 이 작업은 **순수 프론트 UI**.

## 2. 현재 구조 빠른 지도 (작업자 오리엔테이션)
- 토큰: `src/theme/tokens.ts` (2-tier: primitives→semantic light/dark, `typography`/`spacing`/`radius`/`shadow`/`fontFamily`). NativeWind 매핑은 `tailwind.config.ts`.
- 공용 컴포넌트: `src/components/` (`AppText` variant=typography 키, `Card` variant=default|elevated|flat|brand, `Tag`, `Icon`(라인 SVG), `SectionHeader`, `PressableScale`, `Gradient`).
- 화면: `src/screens/main/{HomeScreen,WalletScreen,SettingsScreen}.tsx`, `src/screens/quiz/{QuizScreen,BoxOpenScreen}.tsx`, `src/screens/auth/LoginScreen.tsx`, `src/screens/StyleGuideScreen.tsx`.
- 내비: `src/navigation/{BottomTabNavigator,MainStack,RootNavigator,AuthStack}.tsx`. 탭=홈/지갑/설정, Quiz·BoxOpen은 MainStack 풀스크린.

---

## 3. 작업 항목

### 3.1 타이포 스케일 다운 + 위계 강화 ⭐ ("지금 모든 게 살짝씩 다 큼")
**문제**: 전반적으로 글자가 한 단계씩 크고, 그래서 위계 대비가 둔하다.
**방향**: `tokens.ts`의 `typography`/`fontSize`/`lineHeight`를 전반 축소(단일 소스라 한 곳만 고치면 전 화면 반영). 크기뿐 아니라 **굵기(weight) 대비**로 위계를 만든다. 본문은 가볍게, 타이틀·숫자만 굵게.

제안 시작값(디바이스에서 보고 미세조정). `tokens.ts`의 `fontSize`/`lineHeight`/`typography`를 아래로:

| variant | 현재 size/line | 제안 size/line | 용도 |
|---|---|---|---|
| hero | 42/46 | **34/40** | 캐시 잔액 큰 숫자(여전히 시선 1순위지만 과하지 않게) |
| display | 28/34 | **26/32** | 로그인 타이틀 등 |
| title | 22/30 | **19/26** | 화면/카드 제목 |
| heading | 18/24 | **16/22** | 섹션 제목 |
| subheading | 16/22 | **15/20** | 리스트 행 제목 |
| body | 15/23 | **14/21** | 본문 |
| label | 14/18 | **13/17** | 버튼/칩 |
| caption | 13/18 | **12/16** | 부제/설명 |
| micro | 11/15 | **11/15** | 태그/뱃지(유지) |

- 자간(letterSpacing)은 큰 글자일수록 음수로 더 조여 단단하게(예: title -0.4, heading -0.3).
- 위계 원칙: hero/title/숫자 = **Bold**, heading/subheading/label = **SemiBold**, body/caption = **Regular**. (이미 그렇게 매핑돼 있으니 크기만 줄이면 됨.)
- **검증**: 홈/퀴즈/지갑/설정을 에뮬레이터에서 캡처해 "제목 vs 본문 vs 부제"가 또렷이 구분되는지 본다.

### 3.2 여백 리듬 정리
- 섹션 간 간격이 다소 큼. 화면 좌우 패딩은 유지(`px-xl`=16)하되, 섹션 간 `gap-2xl`(20) → 상황에 따라 `gap-xl`(16)로 조이고, 카드 내부 패딩도 한 단계 절제.
- "여백을 줄여 빽빽하게"가 아니라 **불필요하게 뜬 공간만 정리**해 밀도를 알라미 수준으로. 카드/행 높이가 들쭉날쭉하지 않게 통일.

### 3.3 설정 화면 — 줄 구분 리스트로 전환 ⭐ (핵심 요구)
**현재**(`src/screens/main/SettingsScreen.tsx`): 행(`Row`)들이 `Card variant="flat"` 박스 안에 그룹별로 갇혀 있음(둥근 면 + 그룹마다 별도 카드).
**목표**(알라미 스샷): **박스 없이** 풀-블리드 가로 **구분선**으로 행을 나누고, 각 행은 **제목(+선택 부제) + 오른쪽 `>`**. 진입 가능한 항목은 `>`로 표시, 값 표시형은 값만.

작업:
1. **새 공용 컴포넌트 2개 추가** (`src/components/`, index.ts에 export):
   - `ListRow`:
     - props: `title: string`, `subtitle?: string`, `value?: string`, `leftIcon?: IconName`(설정에선 아이콘 **생략 권장** — 알라미는 텍스트 위주), `onPress?: () => void`, `showChevron?: boolean`(기본: `onPress` 있으면 true), `danger?: boolean`, `last?: boolean`.
     - 레이아웃: 좌측 `title`(subheading) + 그 아래 `subtitle`(caption, text-tertiary) / 우측 `value`(body, text-tertiary) + `chevron-right`(text-tertiary, size 18).
     - 높이감: `py-lg`~`py-xl`로 넉넉히(터치 타깃 ≥ 56px). 마지막 행이 아니면 하단 `border-b border-border-tertiary` (헤어라인). **구분선은 행 풀폭**(좌우 패딩 안에서 풀폭).
     - press 피드백: `PressableScale` 또는 `active:opacity-60`.
   - `ListSection`:
     - props: `title?: string`(그룹 라벨, caption/ text-tertiary, 위 여백), `children`(ListRow들).
     - 그룹 사이는 **카드 박스가 아니라 큰 여백**(예: `mt-2xl`)으로 구분. 필요하면 그룹 배경을 `bg-bg-primary` 한 면으로 깔되 라운드는 최소(0~sm)로 — 알라미는 거의 풀폭 면.
2. **SettingsScreen 재구성**: 기존 `Card`+`Row` 그룹들을 `ListSection`+`ListRow`로 교체.
   - 프로필: 상단에 카드형 1개는 유지 가능(아바타+이름+이메일+`>`로 프로필 진입 느낌). 단 과한 라운드/그림자 줄이기.
   - "학습 설정" 그룹: `JLPT 급수` 행(값=현재 급수, onPress=바텀시트).
   - "앱 정보" 그룹: 버전(값만), 이용약관(`>`), 개인정보처리방침(`>`).
   - "개발자"(DEBUG): 디자인 시스템(`>`).
   - **로그아웃**: 아래 §3.4.
3. 바텀시트(급수 선택 Modal)는 유지하되 타이포/여백만 3.1·3.2에 맞춰 정리.

### 3.4 "나가기/로그아웃" 버튼 깔끔하게
- 현재 로그아웃은 별도 flat 카드 안의 danger Row. → **알라미식으로 절제**: 리스트 맨 아래 단독 행(또는 화면 하단)에 **텍스트 위주의 차분한 로그아웃**(danger 색은 텍스트에만, 박스/아이콘 강조 최소). 누르면 기존 confirm Alert 유지.
- 더불어 **닫기(X)/뒤로 버튼 일관화**: `QuizScreen`·`BoxOpenScreen` 등의 닫기 `X`(현재 `Icon name="close"`)를 터치 타깃 44×44 확보 + 위치/크기 통일. (설정엔 X가 없지만, 앱 전체 "나가기" 어포던스를 알라미처럼 일관되게.)

### 3.5 하단 탭 바 "이쁘게" + 안전영역
- **safe-area**(레이아웃 계획서 §2-A와 동일): `BottomTabNavigator.tsx`에서 `useSafeAreaInsets().bottom`을 `height`/`paddingBottom`에 더해 제스처바 위로. **탭이 안 눌리던 문제 해결**.
- 디테일: 아이콘 24, 라벨 11(또는 3.1 후 micro와 정렬), 활성=`brand`(살짝 굵게 strokeWidth 2.4)·비활성=`text-tertiary`, 상단 헤어라인(`border-border-tertiary`), 면=`bg-primary`. 아이콘-라벨 간격·상하 패딩 균형 맞춰 "떠 보이지 않게" 정돈.

### 3.6 배너 광고 전역화 (레이아웃 계획서 §2-B와 동일)
- 홈에만 있던 `BannerAd`를 **탭 네비게이터 아래 전역 1곳**(탭바 밑, 화면 맨 하단, 하단 safe-area 패딩)으로 이동. `HomeScreen`의 개별 배너(288–299줄) 제거. 로드 실패 시 영역 숨김 유지.
- 순서(위→아래): 화면 → 탭바 → 배너 → safe-area.

### 3.7 상단 캐시 카드 그라데이션 깨짐 (레이아웃 계획서 §2-C와 동일)
- `Gradient.tsx`의 퍼센트 사이즈를 `onLayout` 측정 픽셀로 교체(우측 seam 제거). 자세한 건 레이아웃 계획서 참고.

---

## 4. "알라미 느낌" 디자인 원칙 (작업 내내 적용)
1. **박스보다 줄**: 그룹을 둥근 카드로 가두기보다, 풀폭 면 + 헤어라인 구분선으로 정돈(특히 설정/리스트형).
2. **위계는 크기+굵기**: 한 화면에 큰 글자 남발 금지. 제목만 굵게, 나머지는 가볍게.
3. **진입 어포던스 명확**: 누르면 다른 화면 가는 행엔 반드시 우측 `>`. 값 표시형엔 값만.
4. **여백은 일정한 리듬**: 행 높이·섹션 간격을 토큰 값으로 통일(들쭉날쭉 금지).
5. **색은 기능적으로만**: 민트=주액션/활성, 옐로=캐시/리워드, 회색 다단계=중립. 포인트색 남용 금지.
6. **터치 타깃 ≥ 44px**, 안전영역 항상 고려.

---

## 5. 작업 순서 (권장)
1. `tokens.ts` 타이포 스케일 다운(3.1) + 여백 점검(3.2) → 전 화면 영향 크니 먼저.
2. `BottomTabNavigator` safe-area + 정돈(3.5).
3. `Gradient` onLayout 수정(3.7).
4. 배너 전역화(3.6) — 네비 래퍼 + 홈 배너 제거.
5. `ListRow`/`ListSection` 신규 + `SettingsScreen` 재구성(3.3) + 로그아웃 정리(3.4).
6. 닫기/뒤로 버튼 일관화(3.4 후반).
7. 홈/지갑/퀴즈/상자개봉도 3.1·3.2·4 원칙으로 가볍게 정돈(과하지 않게).

## 6. 검증 (완료 기준)
- 에뮬레이터(`-gpu swiftshader_indirect`, cold boot — 실행은 [`로컬-실행-가이드.md`](로컬-실행-가이드.md))로 로그인→홈→퀴즈→지갑→설정 캡처.
- 체크리스트:
  - [ ] 하단 탭(지갑/설정)이 제스처바와 안 겹치고 잘 눌린다.
  - [ ] 배너 광고가 모든 메인 화면에서 안 잘리고 탭바 아래 한 줄로 깔린다.
  - [ ] 상단 캐시 카드 그라데이션에 seam(깨진 띠)이 없다.
  - [ ] 설정이 박스가 아니라 줄 구분 리스트 + `>`로 보인다.
  - [ ] 제목/본문/부제 글자 크기 위계가 또렷하고 전반적으로 "큰 느낌"이 사라졌다.
  - [ ] 라이트(민트) 테마 유지, 하드코딩 색 없음, 토큰만 사용.
- 코드: NativeWind className이 유효 토큰으로 해석되는지(존재하지 않는 클래스=무시되어 스타일 깨짐) 확인.

## 7. 범위 밖 (이번엔 안 함)
- 다크 테마 전환/토글, 온보딩/모드선택 신규 플로우, 백엔드/캐시 로직, 기프티콘 실제 연동, 신규 화면 추가.
