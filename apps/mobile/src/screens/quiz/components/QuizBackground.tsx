import React, { useState } from 'react';
import { ImageBackground, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

export function QuizBackground(): React.JSX.Element {
  const theme = useQuizTheme();
  const bg = theme.shape.background;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p?.w === width && p?.h === height ? p : { w: width, h: height }));
  };

  // solid: 단색 면만
  if (bg.kind === 'solid') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]} pointerEvents="none" />;
  }

  // image: 내장 이미지 풀배경 + 가독성용 오버레이
  if (bg.kind === 'image') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ImageBackground
          source={bg.source}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]}>
          {bg.overlay ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.overlay }]} />
          ) : null}
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]} onLayout={onLayout} pointerEvents="none">
      {size && size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {bg.kind === 'gradient' && (
              <LinearGradient id="qbg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bg.from} />
                <Stop offset="1" stopColor={bg.to} />
              </LinearGradient>
            )}
            {bg.kind === 'glow' && (
              <RadialGradient id="qglow" cx="50%" cy="2%" rx="82%" ry="44%" fx="50%" fy="2%">
                <Stop offset="0" stopColor={bg.glow} stopOpacity="0.32" />
                <Stop offset="1" stopColor={bg.glow} stopOpacity="0" />
              </RadialGradient>
            )}
            <RadialGradient id="qvig" cx="50%" cy="116%" rx="120%" ry="52%" fx="50%" fy="116%">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {bg.kind === 'gradient' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qbg)" />}
          {bg.kind === 'glow' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qglow)" />}
          {theme.scheme === 'dark' && <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qvig)" />}
        </Svg>
      ) : null}
    </View>
  );
}
