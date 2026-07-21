/**
 * TranslateCropScreen — 사진에서 번역할 범위를 골라 잘라낸다.
 *
 * 갤러리에서 고른 사진을 CropOverlay로 표시, 사용자가 사각형을 옮겨 확정하면
 * 그 좌표를 원본 픽셀로 변환해 crop 후 결과 화면으로 넘긴다.
 */
import React, { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppHeader, Button } from '../../components';
import CropOverlay from './components/CropOverlay';
import { cropToRect, toPixelRect, type Rect } from '../../lib/translate/cropImage';
import type { MainStackScreenProps } from '../../navigation/types';

export default function TranslateCropScreen({
  route,
  navigation,
}: MainStackScreenProps<'TranslateCrop'>): React.JSX.Element {
  const { image } = route.params;
  const { width } = useWindowDimensions();
  const viewH = Math.round(width * 1.1);
  const rectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const pixel = toPixelRect(rectRef.current, { width, height: viewH }, image);
      const cropped = await cropToRect(image.uri, pixel);
      navigation.replace('TranslateResult', { uri: cropped });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역할 부분 선택" showBack />
      <CropOverlay
        uri={image.uri}
        viewW={width}
        viewH={viewH}
        onRectChange={(r) => {
          rectRef.current = r;
        }}
      />
      <View className="px-xl" style={{ paddingTop: 16 }}>
        <Button title="이 부분 번역" onPress={confirm} loading={busy} />
      </View>
    </View>
  );
}
