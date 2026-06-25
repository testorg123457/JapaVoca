/**
 * CashBadge — 캐시/코인 표시용 pill 뱃지.
 *
 * 이모지 🪙 대신 SVG 코인 아이콘으로 교체(일관된 룩).
 *
 * variant:
 *  - cash(기본): 솔리드 옐로(yellow-400) 면 + Ink 텍스트/코인 — 캐시 잔액 강조.
 *  - earn: 옅은 vermilion(vermilion-50) 면 + vermilion-600 텍스트 — 적립(+) 표시.
 */
import React from 'react';
import { View } from 'react-native';

import { fontFamily, gray } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon from './Icon';

type Variant = 'cash' | 'earn';

export interface CashBadgeProps {
  amount: string;
  variant?: Variant;
  /** @deprecated variant='cash' 와 동일(하위 호환). */
  gold?: boolean;
  className?: string;
}

const BOX: Record<Variant, string> = {
  cash: 'bg-yellow-400',
  earn: 'bg-brand-subtle',
};

const TEXT: Record<Variant, string> = {
  cash: 'text-text-primary',
  earn: 'text-brand-active',
};

export function CashBadge({ amount, variant = 'cash', className = '' }: CashBadgeProps) {
  const c = useThemeColors();
  const iconColor = variant === 'cash' ? gray[900] : c['brand-active'];
  return (
    <View
      className={`flex-row items-center rounded-full px-md py-xs ${BOX[variant]} ${className}`}
      style={{ gap: 5 }}>
      <Icon name={variant === 'cash' ? 'coin' : 'arrow-up-right'} size={15} color={iconColor} />
      <AppText variant="label" className={TEXT[variant]} style={{ fontFamily: fontFamily.bold }}>
        {amount}
      </AppText>
    </View>
  );
}

export default CashBadge;
