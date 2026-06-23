/**
 * CashBadge — 캐시/코인 표시용 pill 뱃지.
 * 토스st: 완전 둥근(rounded-pill) 말랑한 칩.
 */
import React from 'react';
import { View } from 'react-native';

import { typography } from '../theme/tokens';
import AppText from './AppText';

export interface CashBadgeProps {
  amount: string;
  /** 잭팟/강조용 골드 스타일 */
  gold?: boolean;
  className?: string;
}

export function CashBadge({ amount, gold = false, className = '' }: CashBadgeProps) {
  return (
    <View
      className={`flex-row items-center rounded-pill px-md py-sm ${
        gold ? 'bg-gold' : 'bg-brand-soft'
      } ${className}`}>
      <AppText
        variant="caption"
        className={gold ? 'text-text-strong' : 'text-brand'}
        style={{ fontFamily: typography.title.fontFamily }}>
        {gold ? '🎰 ' : '🪙 '}
        {amount}
      </AppText>
    </View>
  );
}

export default CashBadge;
