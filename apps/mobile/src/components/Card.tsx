/**
 * Card — NativeWind 기반 공용 카드 (배달의민족 배시시 스타일).
 *
 * 흰 면 + gray-200(#E0E0E0) 0.5px 보더 + radius lg(16) + 넉넉한 패딩(xl 16).
 * 기본 그림자 sm(배민식 약간 무게감), elevated 면 md.
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { hairline, shadowStyle } from '../theme/tokens';

export interface CardProps extends ViewProps {
  className?: string;
  /** 더 띄워 보이는 그림자(md). 기본은 sm. */
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, style, children, ...rest }: CardProps) {
  return (
    <View
      className={`bg-bg-primary border-border-secondary rounded-lg p-xl ${className}`}
      style={[{ borderWidth: hairline }, shadowStyle(elevated ? 'md' : 'sm'), style]}
      {...rest}>
      {children}
    </View>
  );
}

export default Card;
