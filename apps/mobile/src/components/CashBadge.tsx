/**
 * CashBadge — 캐시/코인 표시용 pill 뱃지.
 *
 * 이모지 🪙 대신 SVG 코인 아이콘으로 교체(일관된 룩). 솔리드 옐로 대신 옅은 크림
 * 틴트 + 골드 코인으로 정제된 인상 — 노랑은 코인과 hero에서 포인트로만 쓴다.
 *
 * variant: cash(골드 코인, 기본) · brand(민트 반짝임)
 */
import React from 'react';
import { View } from 'react-native';

import { fontFamily, yellow } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon from './Icon';

type Variant = 'cash' | 'brand';

export interface CashBadgeProps {
  amount: string;
  variant?: Variant;
  /** @deprecated variant='cash' 와 동일(하위 호환). */
  gold?: boolean;
  className?: string;
}

const BOX: Record<Variant, string> = {
  cash: 'bg-amber-subtle',
  brand: 'bg-brand-subtle',
};

const TEXT: Record<Variant, string> = {
  cash: 'text-text-primary',
  brand: 'text-brand-active',
};

export function CashBadge({ amount, variant = 'cash', className = '' }: CashBadgeProps) {
  const c = useThemeColors();
  const iconColor = variant === 'cash' ? yellow[400] : c.brand;
  return (
    <View
      className={`flex-row items-center rounded-full px-md py-xs ${BOX[variant]} ${className}`}
      style={{ gap: 5 }}>
      <Icon name={variant === 'cash' ? 'coin' : 'sparkles'} size={15} color={iconColor} />
      <AppText variant="label" className={TEXT[variant]} style={{ fontFamily: fontFamily.bold }}>
        {amount}
      </AppText>
    </View>
  );
}

export default CashBadge;
