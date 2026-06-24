/**
 * Gradient — react-native-svg 기반 선형 그라데이션 면(absolute fill).
 *
 * hero(캐시 잔액 카드 등)에 단색 대신 미세한 그라데이션을 깔면 깊이감이 생겨
 * 프리미엄하게 보인다. 콘텐츠 뒤에 깔도록 absolute fill로 동작하므로, 부모에
 * overflow-hidden + radius를 주고 이 컴포넌트를 첫 자식으로 둔 뒤 콘텐츠를 얹는다.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientProps {
  /** [시작색, 끝색] */
  colors: [string, string];
  /** 'vertical'(기본) | 'diagonal' */
  direction?: 'vertical' | 'diagonal';
}

export function Gradient({ colors, direction = 'vertical' }: GradientProps) {
  const end = direction === 'diagonal' ? { x2: '1', y2: '1' } : { x2: '0', y2: '1' };
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2={end.x2} y2={end.y2}>
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
    </Svg>
  );
}

export default Gradient;
