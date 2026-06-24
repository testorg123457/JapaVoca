/**
 * CashBadge — 캐시/코인 표시용 pill 뱃지 (배달의민족 배시시 스타일).
 *
 * variant:
 *  - cash (기본) : yellow-400(#FFCE00) 면 + gray-900 텍스트 — 캐시/리워드 강조
 *  - brand       : brand-subtle(연민트) 면 + brand 텍스트
 * radius full(9999), padding sm(4)/md(8).
 */
import React from 'react';
import { View } from 'react-native';

import { fontFamily } from '../theme/tokens';
import AppText from './AppText';

type Variant = 'cash' | 'brand';

export interface CashBadgeProps {
  amount: string;
  variant?: Variant;
  /** @deprecated variant='cash' 와 동일(하위 호환). */
  gold?: boolean;
  className?: string;
}

const boxByVariant: Record<Variant, string> = {
  cash: 'bg-gold',
  brand: 'bg-brand-subtle',
};

const textByVariant: Record<Variant, string> = {
  cash: 'text-text-primary',
  brand: 'text-brand-active',
};

export function CashBadge({ amount, variant = 'cash', className = '' }: CashBadgeProps) {
  const v = variant;
  return (
    <View
      className={`flex-row items-center rounded-full px-md py-sm ${boxByVariant[v]} ${className}`}>
      <AppText
        variant="caption"
        className={textByVariant[v]}
        style={{ fontFamily: fontFamily.bold }}>
        {v === 'cash' ? '🪙 ' : '💎 '}
        {amount}
      </AppText>
    </View>
  );
}

export default CashBadge;
