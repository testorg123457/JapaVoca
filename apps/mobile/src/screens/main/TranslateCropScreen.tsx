/**
 * TranslateCropScreen — 사진에서 번역할 범위를 골라 잘라낸다.
 *
 * 갤러리에서 고른 사진을 CropOverlay로 표시, 사용자가 사각형을 옮기거나 크기를 바꿔
 * 확정하면 그 좌표를 원본 픽셀로 변환해 crop 후 결과 화면으로 넘긴다.
 */
import React, { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppHeader, AppText, Button, useToast } from '../../components';
import CropOverlay from './components/CropOverlay';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { cropToRect, toPixelRect, type Rect } from '../../lib/translate/cropImage';
import { classifyTranslateError, errorMessage } from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

export default function TranslateCropScreen({
  route,
  navigation,
}: MainStackScreenProps<'TranslateCrop'>): React.JSX.Element {
  const c = useThemeColors();
  const { showToast } = useToast();
  const { image } = route.params;
  const { width } = useWindowDimensions();
  const viewH = Math.round(width * 1.15);
  const rectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const pixel = toPixelRect(rectRef.current, { width, height: viewH }, image);
      const cropped = await cropToRect(image.uri, pixel);
      navigation.replace('TranslateResult', { uri: cropped });
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역할 부분 선택" showBack />

      <View className="flex-1 items-center justify-center">
        <CropOverlay
          uri={image.uri}
          viewW={width}
          viewH={viewH}
          image={image}
          onRectChange={(r) => {
            rectRef.current = r;
          }}
        />
      </View>

      {/* 하단 바 — 힌트 + 확정 */}
      <View
        className="bg-bg-primary px-xl"
        style={{ paddingTop: 16, paddingBottom: 28, borderTopWidth: hairline, borderTopColor: c['border-tertiary'] }}>
        <AppText variant="caption" className="text-text-tertiary" style={{ textAlign: 'center', marginBottom: 12 }}>
          모서리를 끌어 크기를 맞추고, 안쪽을 끌어 옮기세요
        </AppText>
        <Button title="이 부분 번역" onPress={confirm} loading={busy} />
      </View>
    </View>
  );
}
