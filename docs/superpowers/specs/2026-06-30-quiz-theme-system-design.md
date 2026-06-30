# 잠금화면 퀴즈 테마 시스템 — 설계 문서

작성일: 2026-06-30

## 한 줄 요약

잠금화면 퀴즈(+추후 복습)의 디자인을 **테마 전용 폴더에 파일 하나 추가/수정만으로 교체**할 수 있는
시스템을 만든다. 현재 디자인을 첫 테마(`classic`)로 토큰화하고, 라이트 데모 테마(`paper`) 하나를
함께 넣어 전환이 실제로 동작함을 검증한다. 설정의 "잠금화면 디자인" 진입점(현재 "준비 중" 알럿)을
실제 테마 선택 화면으로 연결한다.

## 목표

- 테마 = 색 + 형태(모양). 코드 한 곳(테마 폴더)만 건드려 새 테마 추가.
- 현재 잠금화면 디자인을 **외형 변경 없이** `classic` 테마로 이전(회귀 0).
- 설정 → 잠금화면 → "잠금화면 디자인"에서 테마를 고르면 다음 퀴즈부터 반영.

## 확정된 결정 (브레인스토밍 결과)

| 결정 | 값 |
|---|---|
| 테마 계약 범위 | **색 + 형태 파라미터**. 컴포넌트 통째 교체는 "문(door)"만 열어두고 v1 미구현 |
| 적용 범위 | **잠금화면 퀴즈 + 복습 화면**만. 앱 내 `KanaQuiz`·앱 전역 테마는 무관 |
| 성격 | **설정 선택** 프리셋. 리워드 잠금해제는 계약에 자리(`unlock?`)만 두고 v1 미구현 |
| v1 동봉 테마 | `classic`(현재 다크 디자인) + `paper`(라이트 데모) 2개 |

## 비목표 (이번 범위 밖)

- 복습 화면 구현(별도 기능 — `docs/복습-화면-계획.md`). 단, 추후 같은 테마 시스템 위에 얹는다.
- 새 테마 추가(페이퍼 외). 인프라만 완성되면 파일 드롭으로 가능.
- 리워드/기프티콘 잠금해제, 폰트 교체, 컴포넌트 통째 교체 — 전부 계약의 "문"으로만 존재.
- 앱 전역 light/dark 시스템 변경(그대로 둠).

---

## 아키텍처

퀴즈 테마는 앱 전역 light/dark와 **독립된 축**이다. 별도 폴더·Provider·store로 격리한다.

```
src/theme/quiz/
├── contract.ts            QuizTheme 타입(계약) + 헬퍼 타입
├── withAlpha.ts           hex + 투명도 → rgba 유틸(틴트 배경 파생용)
├── themes/
│   ├── index.ts           레지스트리: 모든 테마를 모아 { id: theme } 맵 + 목록 export
│   ├── classic.ts         현재 잠금화면 디자인(다크) — 기본 테마
│   └── paper.ts           라이트 데모 테마
├── QuizThemeProvider.tsx  선택된 테마를 Context로 주입(+ 자식)
└── useQuizTheme.ts        useQuizTheme(): QuizTheme 훅

src/store/quizTheme.ts     선택 테마 id 영속(MMKV). 기본 'classic'.
```

**새 테마 추가 절차(목표 UX):**
1. `themes/내테마.ts` 파일 생성 — `QuizTheme` 객체 1개 export.
2. `themes/index.ts`에 import 1줄 추가(같은 폴더 안).
→ 끝. 설정 화면 목록·전환·렌더가 자동으로 따라온다.

> Metro 번들러의 진짜 파일 자동탐색(`require.context`)은 RN에서 불안정하므로,
> `index.ts`의 명시적 import 1줄을 채택한다. 추가 작업은 전부 `theme/quiz/` 폴더 안에서 끝나므로
> "그 폴더만 건드린다"는 목표를 만족한다.

### 데이터 흐름

```
store/quizTheme (선택 id, MMKV)
        │ 읽기
        ▼
QuizThemeProvider ──Context──► useQuizTheme() ──► ChoiceCard / QuizBackground / AnswerReveal …
        ▲
        │ setQuizThemeId(id)
LockThemeScreen(설정 내 테마 선택) ── 사용자가 카드 탭
```

- `LockQuizScreen`(및 자식)을 `QuizThemeProvider`로 감싼다.
- 컴포넌트는 색·형태를 **오직 `useQuizTheme()`로만** 읽는다(하드코딩 금지, 기존 `LOCK` 제거).
- 테마 변경은 즉시 Context 갱신 + MMKV 저장. 다음 잠금화면 진입 시 새 테마로 렌더.

---

## 계약: `QuizTheme` 타입 (contract.ts)

```ts
import type React from 'react';

/** 🚪 리워드 문 — v1은 free만. 추후 'gifticon'|'cash' 등 추가. */
export type ThemeUnlock = { kind: 'free' };

export type QuizThemeColors = {
  bg: string;            // 기본 배경(불투명 — 잠금화면 풀배경)
  surface: string;       // 선택지/카드 면
  surfaceAlt: string;    // 해설 카드·보조 면
  line: string;          // 보더·헤어라인
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  brand: string;         // 주액션·진행·강조
  brandSoft: string;     // 보조 브랜드 톤(듣기 버튼 등 밝은 강조)
  onBrand: string;       // brand 면 위 글자
  correct: string;       // 정답(초록 계열)
  wrong: string;         // 오답(빨강 계열)
  amber: string;         // 캐시·상자·북마크
};

export type QuizThemeShape = {
  radius: { choice: number; card: number; button: number };
  choiceStyle: 'fill' | 'outline' | 'soft';  // 4지선다 버튼 채움 방식
  choiceLayout: 'grid2x2' | 'list';          // 4지선다 배치
  borderWidth: number;
  background:
    | { kind: 'solid' }
    | { kind: 'gradient'; from: string; to: string }
    | { kind: 'glow'; glow: string };        // 상단 스포트라이트(현 디자인)
};

export type ChoiceCardProps = {
  text: string;
  visual: 'default' | 'correct' | 'wrong' | 'dimmed';
  disabled: boolean;
  onPress: () => void;
};

export type QuizTheme = {
  id: string;             // 파일명과 일치, 고유
  name: string;           // 설정 표시명(한글)
  scheme: 'light' | 'dark'; // 상태바 글자색 대비
  unlock?: ThemeUnlock;   // 🚪 없으면 무료
  colors: QuizThemeColors;
  shape: QuizThemeShape;

  // ── 🚪 미래의 문 (v1 미사용, 자리만) ──
  fontFamily?: string;                                   // 폰트 교체(번들 필요)
  components?: { ChoiceCard?: React.ComponentType<ChoiceCardProps> };
};

/** 테마 정의 헬퍼(타입 추론·미래 검증 지점). */
export function defineQuizTheme(t: QuizTheme): QuizTheme { return t; }
```

**틴트 배경 규칙:** `correctBg`/`brandBg` 같은 반투명 틴트는 계약에 두지 않고,
컴포넌트에서 `withAlpha(theme.colors.correct, 0.12)`처럼 **base 색 + 투명도로 파생**한다.
→ 계약을 13~14개 역할로 슬림하게 유지.

**호스트의 컴포넌트 교체 문 사용법(미래):**
```tsx
const Choice = theme.components?.ChoiceCard ?? DefaultChoiceCard;
```
v1은 항상 `DefaultChoiceCard`. 필드는 존재하지만 어떤 테마도 채우지 않는다.

---

## 테마 1: `classic` (현재 디자인 토큰화)

현재 `LockQuizScreen`의 하드코딩 `LOCK` 팔레트를 그대로 옮긴다. **외형 변경 없음**.

```ts
// themes/classic.ts (요지)
defineQuizTheme({
  id: 'classic', name: '클래식', scheme: 'dark',
  colors: {
    bg: '#0C0D10', surface: '#1E222A', surfaceAlt: '#252930',
    line: 'rgba(255,255,255,0.07)',
    textPrimary: '#EDEEF0', textSecondary: '#9A9EA7', textTertiary: '#6A6E78',
    brand: '#35B98A', brandSoft: '#7FE6BE', onBrand: '#FFFFFF',
    correct: '#33C97A', wrong: '#FF5A45', amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill', choiceLayout: 'grid2x2', borderWidth: 1,
    background: { kind: 'glow', glow: '#1F9660' },  // 현 상단 민트 글로우
  },
});
```

> 정확한 값·틴트 파생은 마이그레이션 시 **현재 화면과 픽셀 대조**하며 확정한다(성공 기준).

## 테마 2: `paper` (라이트 데모)

전환이 눈에 보이도록 확실히 다른 라이트 테마. 값은 `tokens.ts` 라이트 팔레트에서.

```ts
// themes/paper.ts (요지)
defineQuizTheme({
  id: 'paper', name: '페이퍼', scheme: 'light',
  colors: {
    bg: '#F7F6F3', surface: '#FFFFFF', surfaceAlt: '#F2F2F4',
    line: '#E5E5E8',
    textPrimary: '#1A1A1A', textSecondary: '#5C5C62', textTertiary: '#7E7E85',
    brand: '#1F9660', brandSoft: '#0F7048', onBrand: '#FFFFFF',
    correct: '#2AC171', wrong: '#E8432D', amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'soft', choiceLayout: 'grid2x2', borderWidth: 1,
    background: { kind: 'solid' },
  },
});
```

**잠금화면 제약 충족:** `bg`가 불투명 풀배경이라 배경화면 위에 떠도 가독성 OK.
`scheme: 'light'` → 상태바 글자 어둡게(Provider가 처리).

---

## 마이그레이션: `LockQuizScreen` (1192줄) 분해

테마가 건드리는 부분만 **타겟 추출**(전체 재작성 아님). 추출 대상은 각자 `useQuizTheme()` 소비:

| 추출 컴포넌트 | 현재 위치 | 테마가 바꾸는 것 |
|---|---|---|
| `ChoiceCard` | LockQuizScreen 내부 | `choiceStyle`·`radius.choice`·`borderWidth`·정답/오답 색 |
| `QuizBackground` | 현 `LockBackground`(SVG) | `shape.background`(solid/gradient/glow) |
| `AnswerReveal` | LockQuizScreen 내부 | 해설 카드 색·라운드·정답/오답 |
| `AudioButton` | LockQuizScreen 내부 | `brand`/`brandSoft` (듣기 강조) |

- `LockQuizView` 최상단을 `QuizThemeProvider`로 감싼다.
- 시계·상자뱃지·밀어서잠금해제 등 **크롬은 테마 색만 참조**(구조 유지).
- 기존 모듈 레벨 하드코딩 `const LOCK = {...}` **삭제**. 모든 `LOCK.x` → `theme.colors.x` / `theme.shape.x`.

> 부수효과(의도된 개선): 1192줄 단일 파일이 테마 경계로 자연 분해되어 유지보수성↑.
> 단, 이번 범위는 "테마가 닿는 컴포넌트"만 추출. 그 외 대규모 리팩터는 하지 않는다.

---

## 설정 진입점

### `LockSettingsScreen` (수정)

- `comingSoon()` 알럿 **제거**.
- "잠금화면 디자인" `ListRow` `onPress` → `navigation.navigate('LockTheme')`.
- subtitle을 현재 선택 테마명으로(예: "현재: 클래식").

### `LockThemeScreen` (신규) — 테마 선택

- **일반 앱 디자인 시스템**(라이트, `AppHeader`, 토큰) 사용. 퀴즈 테마는 **프리뷰로만** 표시.
- 레지스트리 목록을 카드형으로 렌더: 각 카드 = 테마 색 스와치 미니 프리뷰 + 이름 + 선택 시 체크.
- 탭 → `setQuizThemeId(id)` 저장 + 즉시 선택 표시 갱신.
- 네비게이션: `MainStackParamList`에 `LockTheme: undefined` 추가, `MainStack.tsx`에 `Stack.Screen` 등록.

---

## 영향받는 파일 정리

| 파일 | 작업 |
|---|---|
| `src/theme/quiz/contract.ts` | 신규 — 계약 타입 |
| `src/theme/quiz/withAlpha.ts` | 신규 — 투명도 유틸 |
| `src/theme/quiz/themes/classic.ts` | 신규 — 현재 디자인 |
| `src/theme/quiz/themes/paper.ts` | 신규 — 라이트 데모 |
| `src/theme/quiz/themes/index.ts` | 신규 — 레지스트리 |
| `src/theme/quiz/QuizThemeProvider.tsx` | 신규 — Provider |
| `src/theme/quiz/useQuizTheme.ts` | 신규 — 훅 |
| `src/store/quizTheme.ts` | 신규 — 선택 id 영속 |
| `src/screens/quiz/LockQuizScreen.tsx` | 수정 — LOCK 제거·테마 소비·컴포넌트 추출·Provider 래핑 |
| `src/screens/main/LockThemeScreen.tsx` | 신규 — 테마 선택 화면 |
| `src/screens/main/LockSettingsScreen.tsx` | 수정 — comingSoon 제거·진입 연결 |
| `src/navigation/types.ts` | 수정 — `LockTheme` 라우트 |
| `src/navigation/MainStack.tsx` | 수정 — `LockTheme` 등록 |

---

## 성공 기준

1. `classic` 적용 시 잠금화면 퀴즈가 **현재와 시각적으로 동일**(회귀 0) — 기기 대조.
2. 설정 → 잠금화면 디자인 → `페이퍼` 선택 후 잠금화면 진입 시 **라이트 테마로 렌더**(배경·선택지·정답/오답 색·라운드 변화 확인).
3. 다시 `클래식` 선택 시 원복.
4. `npx tsc --noEmit` 통과, 안드로이드 빌드 성공.
5. 코드상 `LockQuizScreen`에 하드코딩 `LOCK` 객체가 **존재하지 않음**(전부 테마 소비).

## 알려진 한계 / 미래의 문

- **컴포넌트 통째 교체**: 계약 `components?` 필드만 존재. 카드형↔리스트형 등 구조가 완전히 다른 스킨이 필요해지면 그때 기본 호스트가 `theme.components?.X ?? DefaultX`로 분기(이미 그렇게 설계). 새 요소가 계약에 없으면 계약 1회 확장.
- **폰트 교체**: `fontFamily?` 자리만. 실제 적용은 .otf 번들링 필요.
- **리워드 잠금해제**: `unlock?` 자리만. 서버 소유상태·해금 플로우는 추후.
- **복습 화면**: 본 spec 밖. 구현 시 같은 `QuizThemeProvider` 아래에 두어 테마를 공유.
- **`choiceLayout: 'list'`**: 계약에는 있으나 v1 두 테마는 모두 `grid2x2`. `ChoiceCard`/배치 컴포넌트가 두 레이아웃을 모두 지원하도록 구현(테마만 추가하면 동작).
