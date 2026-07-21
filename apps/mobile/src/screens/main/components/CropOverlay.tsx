/**
 * CropOverlay — 사진 위에 드래그로 이동하는 선택 사각형(범위 선택용).
 *
 * 사진을 contain으로 깔고 전체를 살짝 어둡게 덮은 뒤, 그 위에 앱 브랜드색
 * 테두리 사각형을 그려 선택 영역을 표시한다. 드래그마다 clampRect로 경계 안에
 * 가둔다. 확정은 부모가 rect로 처리. (선택 영역만 밝히는 4-패치 dim은 추후 다듬기.)
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { clampRect, type Rect } from '../../../lib/translate/cropImage';
import { useThemeColors } from '../../../theme/ThemeProvider';

interface Props {
  uri: string;
  viewW: number;
  viewH: number;
  onRectChange: (r: Rect) => void;
}

const MIN = 56;

export function CropOverlay({ uri, viewW, viewH, onRectChange }: Props): React.JSX.Element {
  const c = useThemeColors();
  const bounds = { width: viewW, height: viewH };
  const x = useSharedValue(viewW * 0.15);
  const y = useSharedValue(viewH * 0.3);
  const w = useSharedValue(viewW * 0.7);
  const h = useSharedValue(viewH * 0.28);
  const start = useSharedValue({ x: 0, y: 0 });

  const emit = React.useCallback(
    (rx: number, ry: number, rw: number, rh: number) => {
      onRectChange({ x: rx, y: ry, width: rw, height: rh });
    },
    [onRectChange],
  );

  // 초기 사각형 1회 보고(사용자가 안 움직여도 확정 가능하게).
  React.useEffect(() => {
    emit(x.value, y.value, w.value, h.value);
  }, [emit, x, y, w, h]);

  const drag = Gesture.Pan()
    .onBegin(() => {
      start.value = { x: x.value, y: y.value };
    })
    .onUpdate((e) => {
      const n = clampRect(
        {
          x: start.value.x + e.translationX,
          y: start.value.y + e.translationY,
          width: w.value,
          height: h.value,
        },
        bounds,
        MIN,
      );
      x.value = n.x;
      y.value = n.y;
    })
    .onEnd(() => {
      runOnJS(emit)(x.value, y.value, w.value, h.value);
    });

  const boxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    borderWidth: 2,
    borderColor: c.brand,
    borderRadius: 12,
  }));

  return (
    <View style={{ width: viewW, height: viewH, backgroundColor: '#000' }}>
      <Image source={{ uri }} style={{ width: viewW, height: viewH }} resizeMode="contain" />
      {/* 선택 영역 밖 살짝 어둡게 — 선택 부분 강조 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} pointerEvents="none" />
      <GestureDetector gesture={drag}>
        <Animated.View style={boxStyle} />
      </GestureDetector>
    </View>
  );
}

export default CropOverlay;
