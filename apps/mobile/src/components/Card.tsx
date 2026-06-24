/**
 * Card — 공용 카드 (배달의민족 배시시 톤).
 *
 * 흰 면 + 0.5px 보더 + radius lg(18) + 넉넉한 패딩. 그림자는 "옅고 넓게"(tokens.shadow)라
 * 면이 공기처럼 살짝 떠 보인다. variant로 위계를 만든다 — 전부 같은 무게면 위계가 없다.
 *
 * variant:
 *  - default  : 기본 카드(그림자 sm)
 *  - elevated : 더 띄움(그림자 md) — 강조 카드
 *  - flat     : 그림자 없이 보더만 — 리스트/조용한 면
 *  - brand    : 민트 면(그림자 md) — hero/강조. 내부 텍스트는 text-on-brand 사용.
 *
 * onPress를 주면 누를 때 살짝 들어가는 PressableScale로 동작한다(탭 가능한 카드).
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { hairline, shadowStyle } from '../theme/tokens';
import PressableScale from './PressableScale';

type Variant = 'default' | 'elevated' | 'flat' | 'brand';

export interface CardProps extends ViewProps {
  className?: string;
  variant?: Variant;
  /** @deprecated variant="elevated" 와 동일(하위 호환). */
  elevated?: boolean;
  /** 주면 탭 가능한 카드(누르면 0.98로 들어감). */
  onPress?: () => void;
}

const BOX: Record<Variant, string> = {
  default: 'bg-bg-primary border-border-secondary',
  elevated: 'bg-bg-primary border-border-secondary',
  flat: 'bg-bg-primary border-border-secondary',
  brand: 'bg-brand',
};

export function Card({
  className = '',
  variant = 'default',
  elevated = false,
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const v: Variant = elevated ? 'elevated' : variant;
  const hasBorder = v !== 'brand';
  const shadow =
    v === 'flat' ? null : shadowStyle(v === 'elevated' || v === 'brand' ? 'md' : 'sm');

  const boxStyle = [hasBorder ? { borderWidth: hairline } : null, shadow, style];
  const classes = `${BOX[v]} rounded-lg p-xl ${className}`;

  if (onPress) {
    return (
      <PressableScale onPress={onPress} pressedScale={0.98} className={classes} style={boxStyle}>
        {children}
      </PressableScale>
    );
  }

  return (
    <View className={classes} style={boxStyle} {...rest}>
      {children}
    </View>
  );
}

export default Card;
