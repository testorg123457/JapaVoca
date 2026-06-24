/**
 * PressableScale — 누르면 살짝 작아지는(꾹 눌리는) Pressable.
 *
 * 토스·배민·Duolingo의 버튼/카드가 "누를 맛"이 나는 이유: press 시 즉각적인 scale +
 * 미세한 투명도 피드백이 있기 때문. 색만 바뀌는 기본 Pressable과 체감이 다르다.
 * Reanimated로 메인 스레드에서 부드럽게 처리한다(JS 프레임 드랍 없이).
 *
 * 버튼/카드/탭 등 누르는 모든 곳의 공용 기반. disabled면 애니메이션을 끈다.
 */
import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** 눌렀을 때 줄어드는 비율(기본 0.97). 카드처럼 큰 면은 0.98 권장. */
  pressedScale?: number;
  /** 눌렀을 때 투명도(기본 0.92). */
  pressedOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  pressedScale = 0.97,
  pressedOpacity = 0.92,
  disabled,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withTiming(pressedScale, { duration: 90 });
          opacity.value = withTiming(pressedOpacity, { duration: 90 });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 140 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}

export default PressableScale;
