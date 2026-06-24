/**
 * Card — NativeWind 기반 공용 카드 (Arco풍).
 *
 * 화이트(라이트)/차콜(다크) 면 + 0.5px 옅은 보더 + radius xl(14) + 넉넉한 패딩.
 * 그림자는 기본적으로 쓰지 않고(면+보더로 구분), 떠 있는 카드에만 elevated로 최소 적용.
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { hairline, shadowStyle } from '../theme/tokens';

export interface CardProps extends ViewProps {
  className?: string;
  /** 은은한 카드 그림자 적용 여부 (기본 false — Arco는 그림자 거의 없음) */
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, style, children, ...rest }: CardProps) {
  return (
    <View
      className={`bg-bg-primary border-border-tertiary rounded-xl p-xl ${className}`}
      style={[{ borderWidth: hairline }, elevated ? shadowStyle('card') : undefined, style]}
      {...rest}>
      {children}
    </View>
  );
}

export default Card;
