/**
 * CropOverlay — 사진 위에서 번역할 부분을 사각형으로 고른다.
 *
 * 사진을 contain으로 깔고, 선택 영역 밖은 4방향으로 어둡게 덮어(스포트라이트)
 * 선택 부분만 밝게 남긴다. 사각형은 브랜드색 테두리 + 모서리 핸들.
 *
 * 제스처는 오버레이 전체에 Pan 하나만 둔다: 시작 지점이 모서리 근처면 그 모서리를
 * 리사이즈, 안쪽이면 이동. 사각형은 항상 "표시된 이미지 영역" 안으로만 제한한다
 * (레터박스 여백을 고르면 실제 crop이 선택보다 작아지는 문제 방지). 클램프 수식은
 * UI 스레드(worklet)에서 인라인 Math로 처리한다(외부 함수 호출 크래시 방지).
 */
import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import type { Rect } from '../../../lib/translate/cropImage';
import { useThemeColors } from '../../../theme/ThemeProvider';

interface Props {
  uri: string;
  viewW: number;
  viewH: number;
  image: { width: number; height: number };
  onRectChange: (r: Rect) => void;
}

const MIN = 64;
const HIT = 40; // 모서리 리사이즈로 인식하는 거리
const DIM = 'rgba(0,0,0,0.55)';

export function CropOverlay({ uri, viewW, viewH, image, onRectChange }: Props): React.JSX.Element {
  const c = useThemeColors();

  // 표시된 이미지 영역(contain 레터박스 보정) — 사각형은 이 안으로만.
  const scale = Math.min(viewW / image.width, viewH / image.height);
  const shownW = image.width * scale;
  const shownH = image.height * scale;
  const areaX = (viewW - shownW) / 2;
  const areaY = (viewH - shownH) / 2;
  const areaR = areaX + shownW;
  const areaB = areaY + shownH;

  const x = useSharedValue(areaX + shownW * 0.1);
  const y = useSharedValue(areaY + shownH * 0.28);
  const w = useSharedValue(shownW * 0.8);
  const h = useSharedValue(shownH * 0.34);
  // 제스처 시작 시 스냅샷 + 모드(1=이동, 2=TL, 3=TR, 4=BL, 5=BR)
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);
  const mode = useSharedValue(0);

  const emit = React.useCallback(
    (rx: number, ry: number, rw: number, rh: number) => {
      onRectChange({ x: rx, y: ry, width: rw, height: rh });
    },
    [onRectChange],
  );

  React.useEffect(() => {
    emit(x.value, y.value, w.value, h.value);
  }, [emit, x, y, w, h]);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      sx.value = x.value;
      sy.value = y.value;
      sw.value = w.value;
      sh.value = h.value;
      const left = x.value;
      const top = y.value;
      const right = x.value + w.value;
      const bottom = y.value + h.value;
      const nearL = Math.abs(e.x - left) < HIT;
      const nearR = Math.abs(e.x - right) < HIT;
      const nearT = Math.abs(e.y - top) < HIT;
      const nearB = Math.abs(e.y - bottom) < HIT;
      if (nearT && nearL) {
        mode.value = 2;
      } else if (nearT && nearR) {
        mode.value = 3;
      } else if (nearB && nearL) {
        mode.value = 4;
      } else if (nearB && nearR) {
        mode.value = 5;
      } else if (e.x >= left && e.x <= right && e.y >= top && e.y <= bottom) {
        mode.value = 1;
      } else {
        mode.value = 0;
      }
    })
    .onUpdate((e) => {
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const tx = e.translationX;
      const ty = e.translationY;
      if (mode.value === 1) {
        x.value = clamp(sx.value + tx, areaX, areaR - w.value);
        y.value = clamp(sy.value + ty, areaY, areaB - h.value);
      } else if (mode.value === 5) {
        // BR: 좌상단 고정
        w.value = clamp(sw.value + tx, MIN, areaR - x.value);
        h.value = clamp(sh.value + ty, MIN, areaB - y.value);
      } else if (mode.value === 2) {
        // TL: 우하단 고정
        const right = sx.value + sw.value;
        const bottom = sy.value + sh.value;
        const nx = clamp(sx.value + tx, areaX, right - MIN);
        const ny = clamp(sy.value + ty, areaY, bottom - MIN);
        x.value = nx;
        y.value = ny;
        w.value = right - nx;
        h.value = bottom - ny;
      } else if (mode.value === 3) {
        // TR: 좌하단 고정(좌측 x 고정, 상단 y 이동, 폭 증가)
        const left = sx.value;
        const bottom = sy.value + sh.value;
        const ny = clamp(sy.value + ty, areaY, bottom - MIN);
        y.value = ny;
        h.value = bottom - ny;
        w.value = clamp(sw.value + tx, MIN, areaR - left);
      } else if (mode.value === 4) {
        // BL: 우상단 고정(우측·상단 고정, x 이동, 높이 증가)
        const right = sx.value + sw.value;
        const nx = clamp(sx.value + tx, areaX, right - MIN);
        x.value = nx;
        w.value = right - nx;
        h.value = clamp(sh.value + ty, MIN, areaB - sy.value);
      }
    })
    .onEnd(() => {
      runOnJS(emit)(x.value, y.value, w.value, h.value);
    });

  const dimTop = useAnimatedStyle(() => ({ height: y.value }));
  const dimBottom = useAnimatedStyle(() => ({ top: y.value + h.value }));
  const dimLeft = useAnimatedStyle(() => ({ top: y.value, height: h.value, width: x.value }));
  const dimRight = useAnimatedStyle(() => ({ top: y.value, height: h.value, left: x.value + w.value }));
  const boxStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
  }));

  const corner = { position: 'absolute' as const, width: 22, height: 22, borderColor: c.brand };

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: viewW, height: viewH, backgroundColor: '#000' }}>
        <Animated.Image source={{ uri }} style={{ width: viewW, height: viewH }} resizeMode="contain" />

        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: DIM }, dimTop]} pointerEvents="none" />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: DIM }, dimBottom]} pointerEvents="none" />
        <Animated.View style={[{ position: 'absolute', left: 0, backgroundColor: DIM }, dimLeft]} pointerEvents="none" />
        <Animated.View style={[{ position: 'absolute', right: 0, backgroundColor: DIM }, dimRight]} pointerEvents="none" />

        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', borderWidth: 1.5, borderColor: c.brand, borderRadius: 12 }, boxStyle]}>
          <View style={[corner, { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }]} />
          <View style={[corner, { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }]} />
          <View style={[corner, { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }]} />
          <View style={[corner, { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default CropOverlay;
