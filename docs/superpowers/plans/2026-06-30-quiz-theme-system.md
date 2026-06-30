# 잠금화면 퀴즈 테마 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 잠금화면 퀴즈 디자인을 테마 폴더 파일 하나로 교체 가능한 시스템으로 만들고, 현재 디자인을 `classic` 테마로 토큰화하며, 라이트 데모 `paper`와 설정 진입점을 연결한다.

**Architecture:** 퀴즈 테마는 앱 전역 light/dark와 독립된 축. `src/theme/quiz/`에 계약(`contract.ts`)·레지스트리(`themes/`)·Provider·훅을 두고, `LockQuizScreen`의 하드코딩 `LOCK` 팔레트(66곳)를 `useQuizTheme()` 소비로 교체한다. 선택 테마 id는 MMKV에 영속하고, 설정의 `LockThemeScreen`에서 고른다.

**Tech Stack:** React Native(TS), MMKV, react-native-svg, react-native-tts, Jest(순수 로직만).

## Global Constraints

- 적용 범위: **잠금화면 퀴즈 + (추후)복습**만. 앱 내 `KanaQuiz`·앱 전역 light/dark는 건드리지 않는다.
- 계약 범위: **색 + 형태 파라미터**만. `unlock?`/`fontFamily?`/`components?`는 타입에 자리만 두고 v1 미구현.
- v1 동봉 테마: `classic`(현재 다크 그대로) + `paper`(라이트 데모). `DEFAULT_THEME_ID = 'classic'`.
- 색·형태는 **테마 객체에서만** 읽는다(`useQuizTheme()`). 마이그레이션 후 `LockQuizScreen`에 `const LOCK` 객체가 남아있으면 안 된다.
- 흰색 반투명 오버레이(`rgba(255,255,255,x)`)는 라이트 테마에서 안 보이므로 **테마 색으로 매핑**한다(`theme.colors.line` 또는 `withAlpha(theme.colors.textTertiary, x)`).
- 회귀 기준: `classic` 적용 시 현재 잠금화면과 **시각적으로 동일**(정답/오답 글자 톤이 단일 색으로 통일되는 미세 차이는 의도된 정리로 허용).
- 테스트는 순수 로직만(레포 패턴: `__tests__/*.test.ts`, `import` 함수 단위). RN 컴포넌트 렌더 테스트·MMKV 모킹은 하지 않는다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. (사용자 규칙상 실제 `git commit`은 사용자가 직접 실행 — 각 Task의 commit 스텝은 메시지 제안용.)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/theme/quiz/contract.ts` | `QuizTheme` 등 계약 타입 + `defineQuizTheme` |
| `src/theme/quiz/withAlpha.ts` | `#RRGGBB` + alpha → `rgba()` 순수 유틸 |
| `src/theme/quiz/themes/classic.ts` | 현재 다크 디자인 테마 |
| `src/theme/quiz/themes/paper.ts` | 라이트 데모 테마 |
| `src/theme/quiz/themes/index.ts` | 레지스트리(`themesById`/`themeList`/`getTheme`/`resolveThemeId`/`DEFAULT_THEME_ID`) |
| `src/theme/quiz/QuizThemeProvider.tsx` | 선택 테마를 Context 주입 |
| `src/theme/quiz/useQuizTheme.ts` | `useQuizTheme(): QuizTheme` |
| `src/store/quizTheme.ts` | 선택 테마 id 영속(MMKV) |
| `src/screens/quiz/components/ChoiceCard.tsx` | 테마 소비 4지선다 버튼 + 순수 `choiceCardStyle` |
| `src/screens/quiz/components/QuizBackground.tsx` | 테마 소비 배경(solid/gradient/glow) |
| `src/screens/quiz/components/AudioButton.tsx` | 테마 소비 듣기 버튼(TTS 로직 이전) |
| `src/screens/quiz/LockQuizScreen.tsx` | `LOCK` 제거·테마 소비·Provider 래핑·추출 컴포넌트 사용 |
| `src/screens/main/LockThemeScreen.tsx` | 테마 선택 화면(라이트 앱 디자인) |
| `src/screens/main/LockSettingsScreen.tsx` | `comingSoon` 제거·진입 연결 |
| `src/navigation/types.ts` | `LockTheme` 라우트 추가 |
| `src/navigation/MainStack.tsx` | `LockTheme` 등록 |
| `__tests__/quizTheme.withAlpha.test.ts` | withAlpha 테스트 |
| `__tests__/quizTheme.registry.test.ts` | 레지스트리 테스트 |
| `__tests__/quizTheme.choiceCard.test.ts` | choiceCardStyle 테스트 |

---

## Task 1: 테마 계약 + withAlpha 유틸

**Files:**
- Create: `src/theme/quiz/contract.ts`
- Create: `src/theme/quiz/withAlpha.ts`
- Test: `__tests__/quizTheme.withAlpha.test.ts`

**Interfaces:**
- Produces: `QuizTheme`, `QuizThemeColors`, `QuizThemeShape`, `ChoiceVisual`, `ChoiceCardProps`, `ThemeUnlock`, `defineQuizTheme(t: QuizTheme): QuizTheme`, `withAlpha(hex: string, alpha: number): string`.

- [ ] **Step 1: withAlpha 실패 테스트 작성**

`__tests__/quizTheme.withAlpha.test.ts`:
```ts
import { withAlpha } from '../src/theme/quiz/withAlpha';

describe('withAlpha', () => {
  it('#RRGGBB + alpha → rgba', () => {
    expect(withAlpha('#33C97A', 0.12)).toBe('rgba(51,201,122,0.12)');
    expect(withAlpha('#FFFFFF', 0.1)).toBe('rgba(255,255,255,0.1)');
  });
  it('# 없이도 동작', () => {
    expect(withAlpha('000000', 1)).toBe('rgba(0,0,0,1)');
  });
  it('잘못된 hex는 입력을 그대로 반환', () => {
    expect(withAlpha('rgba(1,2,3,0.5)', 0.2)).toBe('rgba(1,2,3,0.5)');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest quizTheme.withAlpha -i`
Expected: FAIL (`Cannot find module '../src/theme/quiz/withAlpha'`)

- [ ] **Step 3: withAlpha 구현**

`src/theme/quiz/withAlpha.ts`:
```ts
/**
 * '#RRGGBB' + 투명도 → 'rgba(r,g,b,a)'. 테마 base 색에서 틴트 배경/보더를 파생할 때 사용.
 * 입력이 6자리 hex가 아니면(이미 rgba 등) 그대로 반환한다.
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) { return hex; }
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest quizTheme.withAlpha -i`
Expected: PASS (3 tests)

- [ ] **Step 5: 계약 타입 작성**

`src/theme/quiz/contract.ts`:
```ts
import type React from 'react';

/** 🚪 리워드 문 — v1은 free만. 추후 'gifticon'|'cash' 등. */
export type ThemeUnlock = { kind: 'free' };

export type QuizThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  brand: string;
  brandSoft: string;
  onBrand: string;
  correct: string;
  wrong: string;
  amber: string;
};

export type QuizThemeShape = {
  radius: { choice: number; card: number; button: number };
  choiceStyle: 'fill' | 'outline' | 'soft';
  choiceLayout: 'grid2x2' | 'list';
  borderWidth: number;
  background:
    | { kind: 'solid' }
    | { kind: 'gradient'; from: string; to: string }
    | { kind: 'glow'; glow: string };
};

export type ChoiceVisual = 'default' | 'correct' | 'wrong' | 'dimmed';

export type ChoiceCardProps = {
  text: string;
  visual: ChoiceVisual;
  disabled: boolean;
  onPress: () => void;
};

export type QuizTheme = {
  id: string;
  name: string;
  scheme: 'light' | 'dark';
  unlock?: ThemeUnlock;
  colors: QuizThemeColors;
  shape: QuizThemeShape;
  // 🚪 미래의 문 (v1 미사용)
  fontFamily?: string;
  components?: { ChoiceCard?: React.ComponentType<ChoiceCardProps> };
};

/** 테마 정의 헬퍼(타입 추론·미래 검증 지점). */
export function defineQuizTheme(t: QuizTheme): QuizTheme { return t; }
```

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/theme/quiz/contract.ts src/theme/quiz/withAlpha.ts __tests__/quizTheme.withAlpha.test.ts
git commit -m "feat(theme): 퀴즈 테마 계약 타입 + withAlpha 유틸"
```

---

## Task 2: 테마 2종 + 레지스트리

**Files:**
- Create: `src/theme/quiz/themes/classic.ts`
- Create: `src/theme/quiz/themes/paper.ts`
- Create: `src/theme/quiz/themes/index.ts`
- Test: `__tests__/quizTheme.registry.test.ts`

**Interfaces:**
- Consumes: `QuizTheme`, `defineQuizTheme` (Task 1).
- Produces: `DEFAULT_THEME_ID = 'classic'`, `themesById: Record<string, QuizTheme>`, `themeList: QuizTheme[]`, `getTheme(id: string): QuizTheme`, `resolveThemeId(raw: string | undefined): string`.

- [ ] **Step 1: classic 테마 작성**

`src/theme/quiz/themes/classic.ts` — 현재 `LockQuizScreen`의 `LOCK` 값을 그대로 옮긴다:
```ts
import { defineQuizTheme } from '../contract';

/** 현재 잠금화면 디자인(다크 글로우). 기본 테마. */
export default defineQuizTheme({
  id: 'classic',
  name: '클래식',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#0C0D10',
    surface: '#1E222A',
    surfaceAlt: '#252930',
    line: 'rgba(255,255,255,0.07)',
    textPrimary: '#EDEEF0',
    textSecondary: '#9A9EA7',
    textTertiary: '#6A6E78',
    brand: '#35B98A',
    brandSoft: '#7FE6BE',
    onBrand: '#FFFFFF',
    correct: '#33C97A',
    wrong: '#FF5A45',
    amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    background: { kind: 'glow', glow: '#1F9660' },
  },
});
```

- [ ] **Step 2: paper 테마 작성**

`src/theme/quiz/themes/paper.ts`:
```ts
import { defineQuizTheme } from '../contract';

/** 라이트 데모 테마. 솔리드 배경 + 소프트 선택지. */
export default defineQuizTheme({
  id: 'paper',
  name: '페이퍼',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F2F4',
    line: '#E5E5E8',
    textPrimary: '#1A1A1A',
    textSecondary: '#5C5C62',
    textTertiary: '#7E7E85',
    brand: '#1F9660',
    brandSoft: '#0F7048',
    onBrand: '#FFFFFF',
    correct: '#2AC171',
    wrong: '#E8432D',
    amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'soft',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    background: { kind: 'solid' },
  },
});
```

- [ ] **Step 3: 레지스트리 작성**

`src/theme/quiz/themes/index.ts`:
```ts
import type { QuizTheme } from '../contract';
import classic from './classic';
import paper from './paper';

/** 새 테마 추가 = 위에 import 1줄 + 아래 배열에 1개 추가. */
const ALL: QuizTheme[] = [classic, paper];

export const DEFAULT_THEME_ID = 'classic';

export const themeList: QuizTheme[] = ALL;
export const themesById: Record<string, QuizTheme> = Object.fromEntries(
  ALL.map((t) => [t.id, t]),
);

/** id로 테마를 찾되, 없으면 기본 테마. */
export function getTheme(id: string): QuizTheme {
  return themesById[id] ?? themesById[DEFAULT_THEME_ID];
}

/** 저장값(또는 undefined)을 유효한 테마 id로 정규화. */
export function resolveThemeId(raw: string | undefined): string {
  return raw && themesById[raw] ? raw : DEFAULT_THEME_ID;
}
```

- [ ] **Step 4: 레지스트리 테스트 작성**

`__tests__/quizTheme.registry.test.ts`:
```ts
import {
  DEFAULT_THEME_ID, themeList, themesById, getTheme, resolveThemeId,
} from '../src/theme/quiz/themes';

describe('quiz theme registry', () => {
  it('classic/paper 둘 다 등록', () => {
    expect(themesById.classic).toBeDefined();
    expect(themesById.paper).toBeDefined();
    expect(themeList.map((t) => t.id)).toEqual(['classic', 'paper']);
  });
  it('기본 테마는 classic', () => {
    expect(DEFAULT_THEME_ID).toBe('classic');
    expect(getTheme('없는id').id).toBe('classic');
  });
  it('resolveThemeId: 유효하면 그대로, 아니면 classic', () => {
    expect(resolveThemeId('paper')).toBe('paper');
    expect(resolveThemeId('xxx')).toBe('classic');
    expect(resolveThemeId(undefined)).toBe('classic');
  });
  it('모든 테마는 13개 색 역할을 채운다', () => {
    const keys = ['bg','surface','surfaceAlt','line','textPrimary','textSecondary','textTertiary','brand','brandSoft','onBrand','correct','wrong','amber'];
    for (const t of themeList) {
      for (const k of keys) {
        expect(typeof (t.colors as Record<string, string>)[k]).toBe('string');
      }
    }
  });
});
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx jest quizTheme.registry -i`
Expected: PASS (4 tests)

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/theme/quiz/themes __tests__/quizTheme.registry.test.ts
git commit -m "feat(theme): classic/paper 테마 + 레지스트리"
```

---

## Task 3: 영속 store + Provider + 훅

**Files:**
- Create: `src/store/quizTheme.ts`
- Create: `src/theme/quiz/QuizThemeProvider.tsx`
- Create: `src/theme/quiz/useQuizTheme.ts`

**Interfaces:**
- Consumes: `getTheme`, `resolveThemeId`, `DEFAULT_THEME_ID` (Task 2); `QuizTheme` (Task 1).
- Produces: `getQuizThemeId(): string`, `setQuizThemeId(id: string): void`; `QuizThemeProvider({ children })`; `useQuizTheme(): QuizTheme`.

- [ ] **Step 1: store 작성**

`src/store/quizTheme.ts` (기존 `store/theme.ts` 패턴 준용):
```ts
/**
 * 잠금화면 퀴즈 테마 선택 영속 store — MMKV.
 * 앱 전역 light/dark(store/theme.ts)와 독립된 별도 축.
 */
import { createMMKV } from 'react-native-mmkv';
import { resolveThemeId } from '../theme/quiz/themes';

const storage = createMMKV({ id: 'quizTheme' });
const ID_KEY = 'quizTheme.id';

export function getQuizThemeId(): string {
  return resolveThemeId(storage.getString(ID_KEY));
}

export function setQuizThemeId(id: string): void {
  storage.set(ID_KEY, id);
}
```

- [ ] **Step 2: Provider 작성**

`src/theme/quiz/QuizThemeProvider.tsx`:
```ts
/**
 * QuizThemeProvider — 선택된 퀴즈 테마를 Context로 주입.
 * 마운트 시 store에서 선택 id를 읽어 테마 객체를 고정한다(잠금화면은 진입마다 새로 마운트됨).
 */
import React, { createContext, useMemo } from 'react';
import { StatusBar } from 'react-native';

import type { QuizTheme } from './contract';
import { getTheme, DEFAULT_THEME_ID, themesById } from './themes';
import { getQuizThemeId } from '../../store/quizTheme';

export const QuizThemeContext = createContext<QuizTheme>(
  themesById[DEFAULT_THEME_ID],
);

export function QuizThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useMemo(() => getTheme(getQuizThemeId()), []);
  return (
    <QuizThemeContext.Provider value={theme}>
      <StatusBar barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </QuizThemeContext.Provider>
  );
}
```

- [ ] **Step 3: 훅 작성**

`src/theme/quiz/useQuizTheme.ts`:
```ts
import { useContext } from 'react';
import { QuizThemeContext } from './QuizThemeProvider';
import type { QuizTheme } from './contract';

/** 현재 퀴즈 테마. QuizThemeProvider 하위에서만 의미 있음. */
export function useQuizTheme(): QuizTheme {
  return useContext(QuizThemeContext);
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (아직 소비처 없음 — 컴파일만 확인)

- [ ] **Step 5: Commit**

```bash
git add src/store/quizTheme.ts src/theme/quiz/QuizThemeProvider.tsx src/theme/quiz/useQuizTheme.ts
git commit -m "feat(theme): 퀴즈 테마 store + Provider + 훅"
```

---

## Task 4: 테마 소비 컴포넌트 추출 (ChoiceCard / QuizBackground / AudioButton)

**Files:**
- Create: `src/screens/quiz/components/ChoiceCard.tsx`
- Create: `src/screens/quiz/components/QuizBackground.tsx`
- Create: `src/screens/quiz/components/AudioButton.tsx`
- Test: `__tests__/quizTheme.choiceCard.test.ts`

> 이 Task는 새 파일만 추가한다(아직 `LockQuizScreen`은 인라인 버전 유지 → 무해). Task 5에서 교체.

**Interfaces:**
- Consumes: `useQuizTheme` (Task 3), `withAlpha` (Task 1), `QuizTheme`/`ChoiceCardProps`/`ChoiceVisual` (Task 1).
- Produces:
  - `choiceCardStyle(theme: QuizTheme, visual: ChoiceVisual): { bg: string; border: string; text: string; icon: string | null }`
  - `ChoiceCard(props: ChoiceCardProps & { widthPercent?: string })`
  - `QuizBackground()` — `StyleSheet.absoluteFill` 배경
  - `AudioButton({ text }: { text: string })`

- [ ] **Step 1: choiceCardStyle 실패 테스트 작성**

`__tests__/quizTheme.choiceCard.test.ts`:
```ts
import { choiceCardStyle } from '../src/screens/quiz/components/ChoiceCard';
import classic from '../src/theme/quiz/themes/classic';
import paper from '../src/theme/quiz/themes/paper';

describe('choiceCardStyle', () => {
  it('classic default(fill)는 surface 면', () => {
    const s = choiceCardStyle(classic, 'default');
    expect(s.bg).toBe('#1E222A');
    expect(s.text).toBe('#EDEEF0');
    expect(s.icon).toBeNull();
  });
  it('correct/wrong은 base 색을 글자·아이콘에 사용', () => {
    expect(choiceCardStyle(classic, 'correct').text).toBe('#33C97A');
    expect(choiceCardStyle(classic, 'correct').icon).toBe('#33C97A');
    expect(choiceCardStyle(classic, 'wrong').text).toBe('#FF5A45');
  });
  it('correct 배경은 base + 0.12 알파', () => {
    expect(choiceCardStyle(classic, 'correct').bg).toBe('rgba(51,201,122,0.12)');
  });
  it('paper default(soft)는 brand 소프트 틴트', () => {
    const s = choiceCardStyle(paper, 'default');
    expect(s.bg).toBe('rgba(31,150,96,0.06)');
    expect(s.text).toBe('#1A1A1A');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest quizTheme.choiceCard -i`
Expected: FAIL (`Cannot find module '.../ChoiceCard'`)

- [ ] **Step 3: ChoiceCard 작성**

`src/screens/quiz/components/ChoiceCard.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';

import { AppText, Icon, PressableScale } from '../../../components';
import type { ChoiceCardProps, ChoiceVisual, QuizTheme } from '../../../theme/quiz/contract';
import { withAlpha } from '../../../theme/quiz/withAlpha';
import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

/** 테마 + 시각상태 → 선택지 색. 순수 함수(테스트 대상). */
export function choiceCardStyle(
  theme: QuizTheme,
  visual: ChoiceVisual,
): { bg: string; border: string; text: string; icon: string | null } {
  const c = theme.colors;
  const borderAlpha = theme.scheme === 'dark' ? 0.5 : 0.45;
  if (visual === 'correct') {
    return { bg: withAlpha(c.correct, 0.12), border: withAlpha(c.correct, borderAlpha), text: c.correct, icon: c.correct };
  }
  if (visual === 'wrong') {
    return { bg: withAlpha(c.wrong, 0.12), border: withAlpha(c.wrong, borderAlpha), text: c.wrong, icon: c.wrong };
  }
  if (visual === 'dimmed') {
    return { bg: theme.shape.choiceStyle === 'fill' ? c.bg : 'transparent', border: c.line, text: c.textTertiary, icon: null };
  }
  // default — choiceStyle별
  switch (theme.shape.choiceStyle) {
    case 'outline':
      return { bg: 'transparent', border: c.textTertiary, text: c.textPrimary, icon: null };
    case 'soft':
      return { bg: withAlpha(c.brand, 0.06), border: c.line, text: c.textPrimary, icon: null };
    case 'fill':
    default:
      return { bg: c.surface, border: c.line, text: c.textPrimary, icon: null };
  }
}

export function ChoiceCard({
  text, visual, disabled, onPress, widthPercent = '48.5%',
}: ChoiceCardProps & { widthPercent?: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const s = choiceCardStyle(theme, visual);
  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.985} style={{ width: widthPercent }}>
      <View style={{
        height: 66,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingHorizontal: 14,
        backgroundColor: s.bg,
        borderWidth: theme.shape.borderWidth, borderColor: s.border,
        borderRadius: theme.shape.radius.choice,
      }}>
        {visual === 'correct' && s.icon && <Icon name="check" size={16} color={s.icon} strokeWidth={2.8} />}
        {visual === 'wrong' && s.icon && <Icon name="close" size={16} color={s.icon} strokeWidth={2.8} />}
        <AppText variant="subheading" numberOfLines={1} style={{ color: s.text, fontSize: 18, lineHeight: 24 }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest quizTheme.choiceCard -i`
Expected: PASS (4 tests)

- [ ] **Step 5: QuizBackground 작성**

`src/screens/quiz/components/QuizBackground.tsx` — `theme.shape.background`에 따라 분기. glow는 현재 `LockBackground`의 SVG를 그대로:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

export function QuizBackground(): React.JSX.Element {
  const theme = useQuizTheme();
  const bg = theme.shape.background;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p?.w === width && p?.h === height ? p : { w: width, h: height }));
  };

  // solid: 단색 면만
  if (bg.kind === 'solid') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]} pointerEvents="none" />;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]} onLayout={onLayout} pointerEvents="none">
      {size && size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {bg.kind === 'gradient' && (
              <LinearGradient id="qbg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bg.from} />
                <Stop offset="1" stopColor={bg.to} />
              </LinearGradient>
            )}
            {bg.kind === 'glow' && (
              <RadialGradient id="qglow" cx="50%" cy="2%" rx="82%" ry="44%" fx="50%" fy="2%">
                <Stop offset="0" stopColor={bg.glow} stopOpacity="0.32" />
                <Stop offset="1" stopColor={bg.glow} stopOpacity="0" />
              </RadialGradient>
            )}
            <RadialGradient id="qvig" cx="50%" cy="116%" rx="120%" ry="52%" fx="50%" fy="116%">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {bg.kind === 'gradient' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qbg)" />}
          {bg.kind === 'glow' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qglow)" />}
          {theme.scheme === 'dark' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qvig)" />}
        </Svg>
      ) : null}
    </View>
  );
}
```

> 비고: 현재 `LockBackground`는 bg 그라데이션(#14161B→#0C0D10) + 글로우 + 비네팅 3겹이다. classic은 단색 `bg`(#0C0D10) + 글로우 + 비네팅으로 단순화(상단 약간 밝던 그라데이션 생략 — 시각적으로 거의 동일, 허용된 미세 정리).

- [ ] **Step 6: AudioButton 작성**

`src/screens/quiz/components/AudioButton.tsx` — 현재 `LockQuizScreen`의 `AudioButton`(L152~224) 로직을 그대로 옮기되 색만 테마로:
```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Tts from 'react-native-tts';

import { AppText, Icon } from '../../../components';
import { withAlpha } from '../../../theme/quiz/withAlpha';
import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

// 앱 기동 1회 — ja-JP
Tts.setDefaultLanguage('ja-JP');

export function AudioButton({ text }: { text: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => {
    cancelRef.current = true;
    subRef.current?.remove();
    subRef.current = null;
    Tts.stop();
  }, []);

  const handlePress = useCallback(() => {
    if (speaking) {
      cancelRef.current = true;
      subRef.current?.remove();
      subRef.current = null;
      Tts.stop();
      setSpeaking(false);
      return;
    }
    const readings = text.split('・').map((r) => r.trim()).filter(Boolean);
    if (readings.length === 0) { return; }
    cancelRef.current = false;
    setSpeaking(true);
    const playNext = (index: number) => {
      if (cancelRef.current || index >= readings.length) { setSpeaking(false); return; }
      Tts.speak(readings[index]);
      let sub: { remove: () => void } | null = null;
      const onFinish = () => {
        sub?.remove();
        subRef.current = null;
        if (index + 1 < readings.length) { setTimeout(() => playNext(index + 1), 600); }
        else { setSpeaking(false); }
      };
      sub = Tts.addEventListener('tts-finish', onFinish) as unknown as { remove: () => void };
      subRef.current = sub;
    };
    playNext(0);
  }, [text, speaking]);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: speaking ? withAlpha(theme.colors.brandSoft, 0.13) : withAlpha(theme.colors.textPrimary, 0.05),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: speaking ? theme.colors.brandSoft : theme.colors.line,
      }}
      onPress={handlePress}>
      <Icon name="volume" size={14} color={theme.colors.brandSoft} strokeWidth={2} />
      <AppText variant="caption" style={{ color: theme.colors.brandSoft }}>
        {speaking ? '■' : '듣기'}
      </AppText>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 8: Commit**

```bash
git add src/screens/quiz/components __tests__/quizTheme.choiceCard.test.ts
git commit -m "feat(theme): 테마 소비 ChoiceCard/QuizBackground/AudioButton 추출"
```

---

## Task 5: LockQuizScreen 마이그레이션 (LOCK 제거 → 테마 소비)

**Files:**
- Modify: `src/screens/quiz/LockQuizScreen.tsx`

이 Task는 단일 원자적 변경이다(`LOCK` 제거 + 테마 소비가 함께 들어가야 화면이 안 깨짐).

**Interfaces:**
- Consumes: `QuizThemeProvider` (Task 3), `useQuizTheme` (Task 3), `ChoiceCard`/`QuizBackground`/`AudioButton` (Task 4), `withAlpha` (Task 1).

- [ ] **Step 1: import 교체**

상단에 추가:
```ts
import { QuizThemeProvider } from '../../theme/quiz/QuizThemeProvider';
import { useQuizTheme } from '../../theme/quiz/useQuizTheme';
import { withAlpha } from '../../theme/quiz/withAlpha';
import { ChoiceCard } from './components/ChoiceCard';
import { QuizBackground } from './components/QuizBackground';
import { AudioButton } from './components/AudioButton';
```
삭제: 파일 내 인라인 `function AudioButton`, 인라인 `function ChoiceCard`, 인라인 `function LockBackground`, 모듈 레벨 `const LOCK = {...}`, 모듈 레벨 `Tts.setDefaultLanguage('ja-JP')`(AudioButton으로 이전됨), 그리고 `type ChoiceVisual`(ChoiceCard로 이전).

- [ ] **Step 2: Provider 래핑 — 분리 구조로 변경**

`export default function LockQuizScreen`은 `LockQuizView`를 `QuizThemeProvider`로 감싼다. 그리고 테마를 쓰는 본체는 `LockQuizView` 안에서 `const theme = useQuizTheme()`를 호출해야 하므로, **현재 `LockQuizView`를 `QuizThemeProvider` 안에서 렌더하는 내부 컴포넌트로** 둔다:

```tsx
export default function LockQuizScreen({ navigation }: MainStackScreenProps<'LockQuiz'>): React.JSX.Element {
  return (
    <QuizThemeProvider>
      <LockQuizView
        onUnlock={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onOpenApp={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        onOpenBoxes={(boxes) => navigation.navigate('BoxOpen', { boxes })}
      />
    </QuizThemeProvider>
  );
}
```
> `LockQuizView`는 이미 별도 함수이므로 그 첫 줄에 `const theme = useQuizTheme();`를 추가하면 Provider 하위에서 동작한다(LockApp.tsx 등 다른 진입점도 동일하게 Provider로 감싸야 함 — Step 7 참고).

- [ ] **Step 3: `AnswerReveal`을 테마 소비로 — 시그니처에 theme 주입**

`AnswerReveal`은 별도 함수다. `useQuizTheme()`를 함수 본문 첫 줄에서 호출(Provider 하위에서 렌더되므로 OK):
```tsx
function AnswerReveal({ ... }: { ... }): React.JSX.Element {
  const theme = useQuizTheme();
  const c = theme.colors;
  // 이하 본문의 LOCK.* 를 아래 매핑표대로 c.* / withAlpha(...) 로 치환
  ...
}
```

- [ ] **Step 4: LOCK 키 → 테마 일괄 치환**

본문 전체(`LockQuizView`, `AnswerReveal`, `ComponentTreeModal`, `CooldownTimer` 등 — 각 함수는 자기 본문 첫 줄에 `const theme = useQuizTheme(); const c = theme.colors;` 추가)에서 다음 매핑으로 치환:

| 기존 | 치환 |
|---|---|
| `LOCK.bg` | `c.bg` |
| `LOCK.surface` | `c.surface` |
| `LOCK.surface2` | `c.surface` |
| `LOCK.surface3` | `c.surfaceAlt` |
| `LOCK.line` | `c.line` |
| `LOCK.line2` | `c.line` |
| `LOCK.t1` | `c.textPrimary` |
| `LOCK.t2` | `c.textSecondary` |
| `LOCK.t3` | `c.textTertiary` |
| `LOCK.brand` | `c.brand` |
| `LOCK.brandText` | `c.brandSoft` |
| `LOCK.brandBg` | `withAlpha(c.brand, 0.16)` |
| `LOCK.brandBorder` | `withAlpha(c.brand, 0.38)` |
| `LOCK.amber` | `c.amber` |
| `LOCK.success` | `c.correct` |
| `LOCK.successBg` | `withAlpha(c.correct, 0.12)` |
| `LOCK.successBorder` | `withAlpha(c.correct, 0.5)` |
| `LOCK.danger` | `c.wrong` |
| `LOCK.dangerBg` | `withAlpha(c.wrong, 0.12)` |
| `LOCK.dangerBorder` | `withAlpha(c.wrong, 0.5)` |
| 문자열 리터럴 `'#fff'`(큰 한자·정답텍스트 등) | `c.textPrimary` |
| `'#6FE3A4'`(정답 텍스트) | `c.correct` |
| `'#FF8C7B'`(오답 텍스트) | `c.wrong` |
| `LOCK.amber + '22'` 류(앰버 틴트 배경) | `withAlpha(c.amber, 0.13)` |
| `LOCK.amber + '66'`(앰버 보더) | `withAlpha(c.amber, 0.4)` |
| `LOCK.brand + '22'`(JLPT 뱃지 배경) | `withAlpha(c.brand, 0.13)` |
| 흰색 반투명 `'rgba(255,255,255,0.16)'`(밀어서잠금 바) | `withAlpha(c.textTertiary, 0.5)` |
| 앰버 뱃지 위 다크 텍스트 `'#241b00'` | `'#241b00'` (앰버는 고정 기능색 — 상수 유지) |

> 앰버(`amber`)는 디자인 시스템상 캐시 고정색이라 모든 테마 동일(`#FFCE00`). 그 위 다크 텍스트(`#241b00`)도 상수로 둔다.

- [ ] **Step 5: 인라인 컴포넌트 사용처를 추출본으로 교체**

- `<LockBackground />` → `<QuizBackground />`
- 인라인 `ChoiceCard` 사용부는 import된 `ChoiceCard`가 동일 props(`text`/`visual`/`disabled`/`onPress`)를 받으므로 그대로 동작. (선택지 렌더 루프 변경 없음.)
- `<AudioButton text=... />` 2곳 → import된 `AudioButton` 그대로.

- [ ] **Step 6: 타입체크 + 잔존 LOCK 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `grep -c "LOCK" src/screens/quiz/LockQuizScreen.tsx`
Expected: `0` (LOCK 완전 제거)

- [ ] **Step 7: 다른 진입점(LockApp)도 Provider 하위인지 확인**

Run: `grep -n "LockQuizView\|LockQuizScreen" src/LockApp.tsx`
- `LockApp.tsx`가 `LockQuizView`를 직접 렌더하면 그 부분도 `<QuizThemeProvider>`로 감싼다. `LockQuizScreen`(default export, 이미 Provider 포함)을 쓰면 추가 작업 불필요.
- 수정이 필요하면: `LockQuizView` 직접 사용부를 `<QuizThemeProvider><LockQuizView .../></QuizThemeProvider>`로 감싼다.

- [ ] **Step 8: 빌드 + 기기 회귀 검증 (classic)**

Run: `PATH="$PATH:/Users/elio/Library/Android/sdk/platform-tools" npx react-native run-android`
Expected: BUILD SUCCESSFUL, 잠금화면 퀴즈가 **현재와 동일**(배경 글로우·선택지·정답/오답·해설·듣기·구성모달·쿨다운·밀어서잠금 전부 이전과 같은 모습).

- [ ] **Step 9: Commit**

```bash
git add src/screens/quiz/LockQuizScreen.tsx src/LockApp.tsx
git commit -m "refactor(quiz): LockQuizScreen LOCK 제거 → 퀴즈 테마 소비"
```

---

## Task 6: 설정 진입점 + 테마 선택 화면 + 네비게이션

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/MainStack.tsx`
- Create: `src/screens/main/LockThemeScreen.tsx`
- Modify: `src/screens/main/LockSettingsScreen.tsx`

**Interfaces:**
- Consumes: `themeList` (Task 2), `getQuizThemeId`/`setQuizThemeId` (Task 3), `themesById` (Task 2).

- [ ] **Step 1: 라우트 타입 추가**

`src/navigation/types.ts`의 `MainStackParamList`에 추가(`LockSettings: undefined;` 옆):
```ts
  LockTheme: undefined;
```

- [ ] **Step 2: 네비게이터 등록**

`src/navigation/MainStack.tsx`:
```tsx
import LockThemeScreen from '../screens/main/LockThemeScreen';
```
`<Stack.Screen name="LockSettings" .../>` 아래에:
```tsx
      <Stack.Screen name="LockTheme" component={LockThemeScreen} />
```

- [ ] **Step 3: LockThemeScreen 작성 (라이트 앱 디자인)**

`src/screens/main/LockThemeScreen.tsx`:
```tsx
/**
 * LockThemeScreen — 잠금화면 퀴즈 테마 선택.
 * 이 화면 자체는 일반 앱 디자인 시스템(라이트/다크 토큰)을 따른다.
 * 각 테마는 색 스와치 미니 프리뷰로 보여주고, 탭하면 선택·영속.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Icon, PressableScale } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { themeList } from '../../theme/quiz/themes';
import { getQuizThemeId, setQuizThemeId } from '../../store/quizTheme';

export default function LockThemeScreen(): React.JSX.Element {
  const c = useThemeColors();
  const [selected, setSelected] = useState<string>(getQuizThemeId());

  const choose = (id: string) => {
    setSelected(id);
    setQuizThemeId(id);
  };

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="잠금화면 디자인" showBack />
      <ScrollView contentContainerClassName="gap-lg px-xl py-xl" showsVerticalScrollIndicator={false}>
        <AppText variant="caption" className="text-text-tertiary">
          잠금화면 퀴즈에 적용할 테마를 골라요. 다음 잠금화면부터 반영돼요.
        </AppText>
        {themeList.map((t) => {
          const active = t.id === selected;
          return (
            <PressableScale key={t.id} onPress={() => choose(t.id)}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: radius.lg,
                backgroundColor: c['bg-primary'],
                borderWidth: 1.5,
                borderColor: active ? c.brand : c['border-secondary'],
              }}>
                {/* 미니 프리뷰: 배경 + 선택지 2개 + 브랜드 점 */}
                <View style={{
                  width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
                  backgroundColor: t.colors.bg,
                  borderWidth: 1, borderColor: t.colors.line,
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.surface }} />
                  <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.brand }} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" style={{ color: c['text-primary'] }}>{t.name}</AppText>
                  <AppText variant="caption" style={{ color: c['text-tertiary'] }}>
                    {t.scheme === 'dark' ? '어두운 테마' : '밝은 테마'}
                  </AppText>
                </View>
                {active && <Icon name="check-circle" size={22} color={c.brand} strokeWidth={2} />}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: LockSettingsScreen 진입 연결**

`src/screens/main/LockSettingsScreen.tsx`:
- `comingSoon` 함수(L20~22) **삭제**.
- 컴포넌트 시그니처를 네비게이션 받도록 수정 + `ListRow` 연결:
```tsx
import type { MainStackScreenProps } from '../../navigation/types';

export default function LockSettingsScreen({
  navigation,
}: MainStackScreenProps<'LockSettings'>): React.JSX.Element {
  // ... 기존 본문 ...
```
"꾸미기" 섹션의 `ListRow`:
```tsx
              <ListRow
                leftIcon="sparkles"
                title="잠금화면 디자인"
                subtitle="배경·테마 바꾸기"
                onPress={() => navigation.navigate('LockTheme')}
                last
              />
```
> `import { Alert, ... }`에서 `Alert`가 다른 곳(toggleLockScreen)에서도 쓰이므로 import는 유지.

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 빌드 + 기기 전환 검증**

Run: `PATH="$PATH:/Users/elio/Library/Android/sdk/platform-tools" npx react-native run-android`
Expected: BUILD SUCCESSFUL. 시나리오:
1. 설정 → 잠금화면 설정 → "잠금화면 디자인" 탭(알럿 안 뜸) → 테마 목록.
2. `페이퍼` 선택 → 잠금화면 퀴즈 진입 시 **라이트**(흰 배경·소프트 선택지·둥근 라운드·민트 brand).
3. 다시 `클래식` 선택 → 잠금화면 **다크 원복**.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/types.ts src/navigation/MainStack.tsx src/screens/main/LockThemeScreen.tsx src/screens/main/LockSettingsScreen.tsx
git commit -m "feat(theme): 설정 테마 선택 화면 + 잠금화면 디자인 진입 연결"
```

---

## 전체 검증 (완료 후)

- [ ] `npx jest -i` 전체 통과(withAlpha/registry/choiceCard + 기존 테스트 무회귀).
- [ ] `npx tsc --noEmit` 통과.
- [ ] `grep -rc "const LOCK" src/screens/quiz/LockQuizScreen.tsx` → 0.
- [ ] classic = 현재와 동일, paper 전환 동작, 재선택 원복(기기).
- [ ] 새 테마 추가 절차 확인: `themes/`에 파일 1개 + `index.ts` 배열 1줄 추가 시 설정 목록에 자동 노출되는지(문서상 검증 — 실제 새 테마는 추가 안 함).

## 미래의 문 (이번 plan 밖, 계약에 자리만 있음)

- `components?.ChoiceCard`: 구조가 다른 스킨 필요 시 `theme.components?.ChoiceCard ?? ChoiceCard`로 호스트 분기.
- `fontFamily?`: .otf 번들 후 적용.
- `unlock?`: 리워드 잠금해제 — 서버 소유상태 + 해금 플로우 추가 시.
- 복습 화면: 같은 `QuizThemeProvider` 아래에 두어 테마 공유.
- `choiceLayout: 'list'`: 계약엔 있으나 v1 두 테마는 grid2x2. list 레이아웃 컴포넌트는 해당 테마 추가 시 구현.
