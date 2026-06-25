/**
 * Gradient — react-native-svg 기반 선형 그라데이션 면(absolute fill).
 *
 * hero(캐시 잔액 카드 등)에 단색 대신 미세한 그라데이션을 깔면 깊이감이 생겨
 * 프리미엄하게 보인다. 콘텐츠 뒤에 깔도록 absolute fill로 동작하므로, 부모에
 * overflow-hidden + radius를 주고 이 컴포넌트를 첫 자식으로 둔 뒤 콘텐츠를 얹는다.
 *
 * ⚠️ react-native-svg의 width/height="100%"는 New Architecture(Fabric)에서 첫
 *    레이아웃 측정과 어긋나 직사각형이 부모 폭을 못 채워 우측에 seam(끊긴 띠)이
 *    생긴다. 그래서 onLayout으로 부모 크기를 px로 측정해 숫자값을 넘긴다(측정 전엔
 *    렌더하지 않음).
 */
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientProps {
  /** [시작색, 끝색] */
  colors: [string, string];
  /** 'vertical'(기본) | 'diagonal' */
  direction?: 'vertical' | 'diagonal';
}

export function Gradient({ colors, direction = 'vertical' }: GradientProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const end = direction === 'diagonal' ? { x2: '1', y2: '1' } : { x2: '0', y2: '1' };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size && size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2={end.x2} y2={end.y2}>
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#g)" />
        </Svg>
      ) : null}
    </View>
  );
}

export default Gradient;
