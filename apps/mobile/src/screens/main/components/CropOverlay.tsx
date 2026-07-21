/**
 * CropOverlay — 사진 위에서 번역할 부분을 사각형으로 고른다.
 *
 * 사진을 contain으로 깔고, 선택 영역 밖은 어둡게 덮어(스포트라이트) 선택 부분만
 * 밝게 남긴다. 프레임은 진짜 크롭 툴처럼 **흰색 얇은 테두리 + 3분할 격자 + 굵은
 * 흰 모서리 브래킷**으로 — 브랜드색을 입히지 않아 사진 위에서 깔끔하게 읽힌다.
 * 오버레이는 임의의 사진 위에 올라가므로 색은 흰색/검정 알파로 고정한다(테마 무관).
 *
 * 제스처는 오버레이 전체에 Pan 하나: 시작 지점이 모서리 근처면 그 모서리를 리사이즈,
 * 안쪽이면 이동. 사각형은 항상 "표시된 이미지 영역" 안으로만 제한한다(레터박스 방지).
 * 클램프 수식은 UI 스레드(worklet)에서 인라인 Math로 처리한다.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import type { Rect } from '../../../lib/translate/cropImage';

interface Props {
  uri: string;
  viewW: number;
  viewH: number;
  image: { width: number; height: number };
  onRectChange: (r: Rect) => void;
}

const MIN = 64;
const HIT = 40; // 모서리 리사이즈로 인식하는 거리
const DIM = 'rgba(0,0,0,0.6)';
// 파스텔 민트(채도 낮은 연민트) — 사진 위에서 부드럽게 읽힘.
const LINE = 'rgba(158,231,201,0.95)';
const GRID = 'rgba(158,231,201,0.30)';
const BRACKET = 26; // 모서리 브래킷 길이
const BW = 3; // 브래킷 두께

export function CropOverlay({ uri, viewW, viewH, image, onRectChange }: Props): React.JSX.Element {
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
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);
  const mode = useSharedValue(0); // 1=이동, 2=TL, 3=TR, 4=BL, 5=BR

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
        w.value = clamp(sw.value + tx, MIN, areaR - x.value);
        h.value = clamp(sh.value + ty, MIN, areaB - y.value);
      } else if (mode.value === 2) {
        const right = sx.value + sw.value;
        const bottom = sy.value + sh.value;
        const nx = clamp(sx.value + tx, areaX, right - MIN);
        const ny = clamp(sy.value + ty, areaY, bottom - MIN);
        x.value = nx;
        y.value = ny;
        w.value = right - nx;
        h.value = bottom - ny;
      } else if (mode.value === 3) {
        const left = sx.value;
        const bottom = sy.value + sh.value;
        const ny = clamp(sy.value + ty, areaY, bottom - MIN);
        y.value = ny;
        h.value = bottom - ny;
        w.value = clamp(sw.value + tx, MIN, areaR - left);
      } else if (mode.value === 4) {
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

  const bracket = { position: 'absolute' as const, width: BRACKET, height: BRACKET, borderColor: LINE };

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
          style={[{ position: 'absolute', borderWidth: 1, borderColor: LINE }, boxStyle]}>
          {/* 3분할 격자 */}
          <View style={[styles.vline, { left: '33.333%' }]} />
          <View style={[styles.vline, { left: '66.666%' }]} />
          <View style={[styles.hline, { top: '33.333%' }]} />
          <View style={[styles.hline, { top: '66.666%' }]} />

          {/* 굵은 흰 모서리 브래킷 */}
          <View style={[bracket, { top: -1, left: -1, borderTopWidth: BW, borderLeftWidth: BW }]} />
          <View style={[bracket, { top: -1, right: -1, borderTopWidth: BW, borderRightWidth: BW }]} />
          <View style={[bracket, { bottom: -1, left: -1, borderBottomWidth: BW, borderLeftWidth: BW }]} />
          <View style={[bracket, { bottom: -1, right: -1, borderBottomWidth: BW, borderRightWidth: BW }]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  vline: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: GRID },
  hline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GRID },
});

export default CropOverlay;
