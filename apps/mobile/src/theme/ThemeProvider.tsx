/**
 * ThemeProvider — 다크 모드 단일 스위치.
 *
 * 사용자 선택(theme store: 'system'|'light'|'dark')과 시스템 useColorScheme()을 합쳐
 * 실제 색 스킴(light|dark)을 정하고, tokens.ts의 semantic 색을 css 변수로 주입한다.
 * 앱 트리 최상단을 감싸므로 모든 className 색(var(--color-*))이 한 곳에서 전환된다.
 *
 *  - mode === 'system' : OS 다크모드 설정을 따름(기본값).
 *  - mode === 'light' | 'dark' : 사용자가 고정.
 * setMode()로 바꾸면 즉시 반영 + MMKV 영속(theme store).
 *
 * 인라인 스타일에서 색이 필요하면 useThemeColors()로 현재 모드의 semantic 세트를
 * 가져온다. 컴포넌트는 가능하면 className(semantic 토큰)을 우선 사용할 것.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StatusBar, View, useColorScheme } from 'react-native';
import { vars } from 'nativewind';

import { colorVarName, semantic, type ColorScheme, type SemanticColorToken } from './tokens';
import { getThemeMode, setThemeMode, type ThemeMode } from '../store/theme';

/** 토큰명 → 색 문자열. light/dark 가 값(리터럴)이 달라도 동일 형태로 다룬다. */
type SemanticColors = Record<SemanticColorToken, string>;

function buildVars(scheme: ColorScheme) {
  const set = semantic[scheme];
  const entries = Object.entries(set).map(([token, value]) => [colorVarName(token), value]);
  return vars(Object.fromEntries(entries));
}

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: SemanticColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: semantic.light,
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(getThemeMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setThemeMode(next);
  }, []);

  // mode가 system이면 OS를 따르고, 아니면 사용자가 고정한 값.
  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const cssVars = useMemo(() => buildVars(scheme), [scheme]);
  const value = useMemo(
    () => ({ scheme, colors: semantic[scheme], mode, setMode }),
    [scheme, mode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* 헤더 없는 화면(로그인/스플래시 등)을 위한 기본 StatusBar.
          AppHeader가 있는 화면은 그쪽 StatusBar(민트 배경)가 나중에 마운트되며 덮어쓴다. */}
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={value.colors['bg-secondary']}
      />
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

/** 테마 모드(system|light|dark) 읽기/변경. 설정 화면용. */
export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const { mode, setMode } = useContext(ThemeContext);
  return { mode, setMode };
}

export default ThemeProvider;
