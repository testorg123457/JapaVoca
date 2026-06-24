/**
 * Tag — 작은 상태/메타 칩(pill).
 *
 * 화면 곳곳에 흩어져 있던 인라인 rounded-full 칩(스트릭·JLPT·정답/오답 등)을 하나로
 * 통일한다. 색은 "기능적"으로만 — 의미별 variant. 옅은 틴트 면 + 진한 텍스트로 차분하게.
 *
 * variant: brand(민트) · amber(캐시/리워드) · neutral(중립) · success · danger
 */
import React from 'react';
import { View } from 'react-native';

import { fontFamily } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon, { type IconName } from './Icon';

type Variant = 'brand' | 'amber' | 'neutral' | 'success' | 'danger';

export interface TagProps {
  label: string;
  variant?: Variant;
  leftIcon?: IconName;
  className?: string;
}

const BOX: Record<Variant, string> = {
  brand: 'bg-brand-subtle',
  amber: 'bg-amber-subtle',
  neutral: 'bg-bg-tertiary',
  success: 'bg-success-subtle',
  danger: 'bg-danger-subtle',
};

const TEXT: Record<Variant, string> = {
  brand: 'text-brand',
  amber: 'text-amber',
  neutral: 'text-text-secondary',
  success: 'text-success',
  danger: 'text-danger',
};

export function Tag({ label, variant = 'neutral', leftIcon, className = '' }: TagProps) {
  const c = useThemeColors();
  const iconColor: Record<Variant, string> = {
    brand: c.brand,
    amber: c.amber,
    neutral: c['text-secondary'],
    success: c.success,
    danger: c.danger,
  };
  return (
    <View
      className={`flex-row items-center self-start rounded-full px-md py-xs ${BOX[variant]} ${className}`}
      style={{ gap: 4 }}>
      {leftIcon ? <Icon name={leftIcon} size={13} color={iconColor[variant]} strokeWidth={2.2} /> : null}
      <AppText variant="micro" className={TEXT[variant]} style={{ fontFamily: fontFamily.bold, fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

export default Tag;
