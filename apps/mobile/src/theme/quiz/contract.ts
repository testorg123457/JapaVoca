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
