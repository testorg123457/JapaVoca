/**
 * GradeFlair — 상자 뒤 등급 연출(글로우 + 반짝임).
 *
 * 화면이 밝아지면서 어두운 무대(방사 조명 + 링 + 비네트)를 못 쓰게 됐다. 그 자리를
 * 대신하는 **밝은 화면용 연출**이다. 세기는 `GRADE_FLAIR` 사다리를 따른다 —
 * 일반은 아무것도 안 켜고, 위로 갈수록 하나씩 얹는다.
 *
 * ⚠️ 라이트/다크 양쪽에서 성립해야 한다. 밝은 배경에선 글로우가 묻히고 어두운 배경에선
 *    번지므로, 다크일 때 세기를 조금 올린다.
 * ⚠️ 반짝임은 **가만히 있지 않는다.** 정지한 별은 장식이지만, 아주 느리게 깜빡이면
 *    "지금 막 열렸다"는 순간이 된다. reduce motion이면 멈춘 채로 둔다.
 */
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { BoxGrade } from '../../../api/hooks';
import { GRADE_COLOR, GRADE_FLAIR } from '../../../lib/boxGrade';
import { useColorSchemeMode } from '../../../theme/ThemeProvider';

/** 반짝임 위치 — 상자 중심 기준 비율(-1~1). 규칙적이지 않게 흩어 둔다. */
const SPARKLE_SPOTS = [
  { x: -0.62, y: -0.5, s: 7 },
  { x: 0.58, y: -0.62, s: 9 },
  { x: 0.72, y: 0.18, s: 6 },
  { x: -0.74, y: 0.1, s: 8 },
  { x: -0.3, y: -0.82, s: 6 },
  { x: 0.28, y: 0.62, s: 7 },
];

function Sparkle({ color, size, delay }: { color: string; size: number; delay: number }) {
  const v = useSharedValue(0.35);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(1, { duration: 1100 + delay, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
      undefined,
      ReduceMotion.Never,
    );
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.7 + v.value * 0.4 }] }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: 1.5,
          transform: [{ rotate: '45deg' }],
        },
        style,
      ]}
    />
  );
}

export function GradeFlair({ grade, boxSize }: { grade: BoxGrade; boxSize: number }): React.JSX.Element | null {
  const scheme = useColorSchemeMode();
  const flair = GRADE_FLAIR[grade];
  const color = GRADE_COLOR[grade];
  const { width: screenW } = useWindowDimensions();

  if (flair.glow <= 0 && flair.sparkles <= 0) {
    return null;
  }

  // 어두운 배경에선 같은 세기가 더 옅게 읽힌다 — 조금 올린다.
  const glow = flair.glow * (scheme === 'dark' ? 1.35 : 1);
  const field = Math.min(screenW, boxSize * 3.4);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: field,
        height: field,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {flair.glow > 0 && (
        <Svg width={field} height={field} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="flair" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={glow} />
              <Stop offset="0.55" stopColor={color} stopOpacity={glow * 0.45} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={field} height={field} fill="url(#flair)" />
        </Svg>
      )}

      {SPARKLE_SPOTS.slice(0, flair.sparkles).map((spot, i) => (
        <View
          key={`${spot.x}-${spot.y}`}
          style={{
            position: 'absolute',
            left: field / 2 + (boxSize * 0.95) * spot.x - spot.s / 2,
            top: field / 2 + (boxSize * 0.95) * spot.y - spot.s / 2,
          }}>
          <Sparkle color={color} size={spot.s} delay={i * 130} />
        </View>
      ))}
    </View>
  );
}

export default GradeFlair;
