/**
 * 제스처 격리 디버그 화면 (DEBUG 전용).
 *
 * Pressable도, 모달도 없는 순수 드래그 박스. RNGH Pan + Reanimated 가 이 앱에서
 * 동작하는지 단독 확인용.
 *  - 박스가 손가락을 따라 움직이는가?  → translateX/Y 렌더링 OK
 *  - 상단 숫자(dx/dy)가 바뀌는가?       → 제스처 콜백(onUpdate) 발화 OK
 * 둘 다 OK인데 LockQuiz만 안 되면 → 원인은 LockQuiz의 Pressable/레이아웃.
 * 숫자가 안 바뀌면 → 제스처 콜백 자체가 안 도는 것(RNGH/worklets 통합 문제).
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function GestureDebugScreen(): React.JSX.Element {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [info, setInfo] = useState('박스를 드래그해 보세요');

  const pan = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      runOnJS(setInfo)('began');
    })
    .onUpdate((e) => {
      'worklet';
      // 순수 UI-스레드 이동만(매 프레임 runOnJS 호출은 렉을 유발하므로 제거).
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      x.value = withSpring(0);
      y.value = withSpring(0);
      runOnJS(setInfo)('ended');
    });

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: '#0C0D10', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 40 }}>{info}</Text>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              width: 130,
              height: 130,
              borderRadius: 20,
              backgroundColor: '#35B98A',
              alignItems: 'center',
              justifyContent: 'center',
            },
            boxStyle,
          ]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>드래그</Text>
        </Animated.View>
      </GestureDetector>
      <Text style={{ color: '#6A6E78', fontSize: 13, marginTop: 40 }}>
        박스가 손가락 따라 움직이는지 / 위 숫자가 바뀌는지 확인
      </Text>
    </GestureHandlerRootView>
  );
}
