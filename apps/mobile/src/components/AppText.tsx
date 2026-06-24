/**
 * AppText — 타이포 토큰을 적용하는 텍스트 컴포넌트.
 *
 * 폰트(패밀리/사이즈/자간/줄높이)는 tokens.ts의 typography 스타일 객체로,
 * 색은 semantic 토큰 className(기본 text-text-primary)으로 적용한다.
 * 다른 색이 필요하면 className으로 덮어쓴다(예: text-text-secondary, text-brand).
 */
import React from 'react';
import { Text, type TextProps } from 'react-native';

import { typography } from '../theme/tokens';

type Variant = keyof typeof typography; // 'display' | 'title' | 'heading' | 'body' | 'caption'

export interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function AppText({ variant = 'body', style, className = '', ...rest }: AppTextProps) {
  return (
    <Text className={`text-text-primary ${className}`} style={[typography[variant], style]} {...rest} />
  );
}

export default AppText;
