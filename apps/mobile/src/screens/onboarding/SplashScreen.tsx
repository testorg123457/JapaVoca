/**
 * 앱 실행 스플래시 — 게이트 상태 확정 전 잠깐 보임(깜빡임 방지).
 *
 * 디자인: 민트 배경을 대각선으로 갈라 상단을 흰 영역으로 만들고, 그 흰 영역
 * 왼쪽아래에 브랜드 로고(컬러). 좌하단에 서비스명(흰색), 하단 중앙에 로딩 점.
 * 네이티브 BootSplash(민트)에서 이 화면으로 자연스럽게 이어지도록 배경을 민트로 통일.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polygon } from 'react-native-svg';

import { AppText } from '../../components';
import { mint } from '../../theme/tokens';

const logo = require('../../assets/logo.png');

/** 흰 영역 대각 밑변 비율 — 왼쪽이 더 내려온다(좌 55% / 우 40%). */
const WHITE_LEFT = 0.55;
const WHITE_RIGHT = 0.4;

function LoadingDots(): React.JSX.Element {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0.28))).current;

  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 360, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.28, duration: 360, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.delay((vals.length - 1 - i) * 150),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [vals]);

  return (
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 9, height: 9, borderRadius: 4.5,
            backgroundColor: 'rgba(255,255,255,0.92)',
            opacity: v,
            transform: [{ scale: v.interpolate({ inputRange: [0.28, 1], outputRange: [0.8, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}

export default function SplashScreen(): React.JSX.Element {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const logoSize = W * 0.48;

  return (
    <View style={{ flex: 1, backgroundColor: mint[500] }}>
      {/* 대각 흰 영역 + 이음선 헤어라인 */}
      <Svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Polygon
          points={`0,0 ${W},0 ${W},${H * WHITE_RIGHT} 0,${H * WHITE_LEFT}`}
          fill="#FFFFFF"
        />
        <Line
          x1={0} y1={H * WHITE_LEFT} x2={W} y2={H * WHITE_RIGHT}
          stroke={mint[600]} strokeWidth={1} opacity={0.45}
        />
      </Svg>

      {/* 로고 — 흰 영역 왼쪽아래 */}
      <Image
        source={logo}
        resizeMode="contain"
        style={{ position: 'absolute', left: 26, top: H * 0.24, width: logoSize, height: logoSize }}
      />

      {/* 서비스명 + 로딩 — 좌하단. 글자 위, 로딩은 글자 아래(사이 간격). */}
      <View style={{ position: 'absolute', left: 28, bottom: insets.bottom + 40, alignItems: 'flex-start' }}>
        <AppText
          variant="title"
          style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 26, lineHeight: 32 }}>
          일본어 한자 보카
        </AppText>
        <View style={{ marginTop: 14 }}>
          <LoadingDots />
        </View>
      </View>
    </View>
  );
}
