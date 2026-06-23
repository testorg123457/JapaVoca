/**
 * AppText — 타이포 토큰을 적용하는 텍스트 컴포넌트.
 *
 * 색상은 NativeWind className(예: text-text-strong, text-brand)으로 지정하고,
 * 폰트(패밀리/사이즈/자간)는 tokens.ts의 typography 스타일 객체로 적용합니다.
 * (Tailwind 기본 font-weight 유틸과의 className 충돌을 피하기 위함)
 */
import React from 'react';
import { Text, type TextProps } from 'react-native';

import { typography } from '../theme/tokens';

type Variant = keyof typeof typography; // 'display' | 'title' | 'body' | 'caption'

export interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text style={[typography[variant], style]} {...rest} />;
}

export default AppText;
