/**
 * CashBadge — 캐시/코인 표시용 pill 뱃지 (Arco풍).
 *
 * 기본: brand-subtle 면 + brand 텍스트 + 코인 아이콘.
 * accent(잭팟/강조): amber-subtle 면 + amber 텍스트.
 */
import React from 'react';
import { View } from 'react-native';

import { typography } from '../theme/tokens';
import AppText from './AppText';

export interface CashBadgeProps {
  amount: string;
  /** 잭팟/강조용 앰버 스타일 */
  gold?: boolean;
  className?: string;
}

export function CashBadge({ amount, gold = false, className = '' }: CashBadgeProps) {
  return (
    <View
      className={`flex-row items-center rounded-pill px-md py-sm ${
        gold ? 'bg-amber-subtle' : 'bg-brand-subtle'
      } ${className}`}>
      <AppText
        variant="caption"
        className={gold ? 'text-amber' : 'text-brand'}
        style={{ fontFamily: typography.title.fontFamily }}>
        {gold ? '🎰 ' : '🪙 '}
        {amount}
      </AppText>
    </View>
  );
}

export default CashBadge;
