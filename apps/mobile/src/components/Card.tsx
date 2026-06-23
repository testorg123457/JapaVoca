/**
 * Card — NativeWind 기반 공용 카드.
 * 토스st: 넉넉한 라운드(rounded-xl) + 부드러운 그림자.
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { shadowStyle } from '../theme/tokens';

export interface CardProps extends ViewProps {
  className?: string;
  /** 부드러운 카드 그림자 적용 여부 (기본 true) */
  elevated?: boolean;
}

export function Card({ className = '', elevated = true, style, children, ...rest }: CardProps) {
  return (
    <View
      className={`bg-bg rounded-xl p-xl ${className}`}
      style={[elevated ? shadowStyle('card') : undefined, style]}
      {...rest}>
      {children}
    </View>
  );
}

export default Card;
