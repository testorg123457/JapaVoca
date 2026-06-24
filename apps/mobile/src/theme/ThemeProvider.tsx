/**
 * ThemeProvider — 다크 모드 단일 스위치.
 *
 * useColorScheme(시스템 라이트/다크)에 맞춰 tokens.ts의 semantic 색을 css 변수로
 * 주입한다. 앱 트리 최상단을 감싸므로 모든 className 색(var(--color-*))이 모드에
 * 따라 한 곳에서 전환된다.
 *
 * 인라인 스타일에서 색이 필요하면 useThemeColors()로 현재 모드의 semantic 세트를
 * 가져온다. 컴포넌트는 가능하면 className(semantic 토큰)을 우선 사용할 것.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { View, useColorScheme } from 'react-native';
import { vars } from 'nativewind';

import { colorVarName, semantic, type ColorScheme, type SemanticColorToken } from './tokens';

/** 토큰명 → 색 문자열. light/dark 가 값(리터럴)이 달라도 동일 형태로 다룬다. */
type SemanticColors = Record<SemanticColorToken, string>;

function buildVars(scheme: ColorScheme) {
  const set = semantic[scheme];
  const entries = Object.entries(set).map(([token, value]) => [colorVarName(token), value]);
  return vars(Object.fromEntries(entries));
}

const ThemeContext = createContext<{ scheme: ColorScheme; colors: SemanticColors }>({
  scheme: 'light',
  colors: semantic.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const cssVars = useMemo(() => buildVars(scheme), [scheme]);
  const value = useMemo(() => ({ scheme, colors: semantic[scheme] }), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, cssVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/** 현재 모드의 semantic 색 세트(인라인 스타일용). */
export function useThemeColors(): SemanticColors {
  return useContext(ThemeContext).colors;
}

/** 현재 색 스킴('light' | 'dark'). StatusBar 등 분기용. */
export function useColorSchemeMode(): ColorScheme {
  return useContext(ThemeContext).scheme;
}

export default ThemeProvider;
