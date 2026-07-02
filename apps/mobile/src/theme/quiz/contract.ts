import type React from 'react';
import type { ImageSourcePropType } from 'react-native';

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
  /** 문제 텍스트가 사진 배경 위에서 항상 읽히도록 뒤에 스크림 박스를 깔지 여부. */
  needsTextScrim: boolean;
  background:
    | { kind: 'solid' }
    | { kind: 'gradient'; from: string; to: string }
    | { kind: 'glow'; glow: string }
    /** 내장 이미지 배경. overlay는 가독성용 반투명 면(rgba), 없으면 미적용. */
    | { kind: 'image'; source: ImageSourcePropType; overlay?: string };
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
