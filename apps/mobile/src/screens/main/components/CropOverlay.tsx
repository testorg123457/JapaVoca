/**
 * CropOverlay — 사진 위에서 번역할 부분을 사각형으로 고른다.
 *
 * 사진을 contain으로 깔고, 선택 영역 밖은 4방향으로 어둡게 덮어(스포트라이트)
 * 선택 부분만 밝게 남긴다. 사각형은 브랜드색 테두리 + 모서리 핸들로 "조절 가능"함을
 * 드러낸다. 드래그마다 clampRect로 경계 안에 가두고, 확정은 부모가 rect로 처리.
 */
import React from 'react';
import { View } from 'react-native';
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

const MIN = 64;
const DIM = 'rgba(0,0,0,0.55)';

export function CropOverlay({ uri, viewW, viewH, onRectChange }: Props): React.JSX.Element {
  const c = useThemeColors();
  const bounds = { width: viewW, height: viewH };
  const x = useSharedValue(viewW * 0.12);
  const y = useSharedValue(viewH * 0.32);
  const w = useSharedValue(viewW * 0.76);
  const h = useSharedValue(viewH * 0.24);
  const start = useSharedValue({ x: 0, y: 0 });

  const emit = React.useCallback(
    (rx: number, ry: number, rw: number, rh: number) => {
      onRectChange({ x: rx, y: ry, width: rw, height: rh });
    },
    [onRectChange],
  );

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

  // 선택 밖 4방향 딤(스포트라이트)
  const dimTop = useAnimatedStyle(() => ({ height: y.value }));
  const dimBottom = useAnimatedStyle(() => ({ top: y.value + h.value }));
  const dimLeft = useAnimatedStyle(() => ({ top: y.value, height: h.value, width: x.value }));
  const dimRight = useAnimatedStyle(() => ({
    top: y.value,
    height: h.value,
    left: x.value + w.value,
  }));

  const boxStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
  }));

  const corner = { position: 'absolute' as const, width: 22, height: 22, borderColor: c.brand };

  return (
    <View style={{ width: viewW, height: viewH, backgroundColor: '#000' }}>
      <Animated.Image source={{ uri }} style={{ width: viewW, height: viewH }} resizeMode="contain" />

      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: DIM }, dimTop]} />
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: DIM }, dimBottom]} />
      <Animated.View style={[{ position: 'absolute', left: 0, backgroundColor: DIM }, dimLeft]} />
      <Animated.View style={[{ position: 'absolute', right: 0, backgroundColor: DIM }, dimRight]} />

      <GestureDetector gesture={drag}>
        <Animated.View
          style={[
            { position: 'absolute', borderWidth: 1.5, borderColor: c.brand, borderRadius: 12 },
            boxStyle,
          ]}>
          <View style={[corner, { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }]} />
          <View style={[corner, { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }]} />
          <View style={[corner, { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }]} />
          <View style={[corner, { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default CropOverlay;
