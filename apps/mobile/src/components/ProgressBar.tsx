/**
 * ProgressBar — 진행감 표시 바(부드러운 애니메이션).
 *
 * Duolingo/Memrise처럼 진행감을 명확히 보여주는 건 학습 앱의 동기 장치. 값이 바뀌면
 * 메인 스레드에서 부드럽게 채워진다(Reanimated). 트랙은 옅은 면, 채움은 브랜드 민트.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  className?: string;
}

export function ProgressBar({ progress, height = 8, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const w = useSharedValue(clamped);

  useEffect(() => {
    w.value = withTiming(clamped, { duration: 450 });
  }, [clamped, w]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View className={`overflow-hidden rounded-full bg-bg-tertiary ${className}`} style={{ height }}>
      <Animated.View className="h-full rounded-full bg-brand" style={fillStyle} />
    </View>
  );
}

export default ProgressBar;
