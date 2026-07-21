/**
 * JapaneseTranslateScreen — 일본어 번역 진입.
 *
 * 카메라로 촬영하거나 사진에서 골라, 서버(AI)로 OCR+번역한다.
 * 카메라 → 결과로 바로, 사진 → 범위 선택(크롭) → 결과.
 *
 * 좌정렬 인트로 + 두 진입(주=촬영 elevated 타일 / 보조=사진 헤어라인 행).
 * 민트는 주액션(카메라 칩)에만.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon, PressableScale, useToast } from '../../components';
import type { IconName } from '../../components/Icon';
import { hairline, shadowStyle } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { pickFromCamera, pickFromGallery } from '../../lib/translate/imageSource';
import { classifyTranslateError, errorMessage } from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

export default function JapaneseTranslateScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation =
    useNavigation<MainStackScreenProps<'JapaneseTranslate'>['navigation']>();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function run(pick: () => Promise<{ uri: string; width: number; height: number } | null>,
                     onPicked: (img: { uri: string; width: number; height: number }) => void) {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const img = await pick();
      if (img) {
        onPicked(img);
      }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const onCamera = () =>
    run(pickFromCamera, (img) => navigation.navigate('TranslateResult', { uri: img.uri }));
  const onGallery = () =>
    run(pickFromGallery, (img) => navigation.navigate('TranslateCrop', { image: img }));

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="일본어 번역" showBack />

      <View className="px-xl" style={{ paddingTop: 12 }}>
        {/* 인트로 — 좌정렬 */}
        <AppText variant="display" className="text-text-primary">
          일본어를 비춰 보세요
        </AppText>
        <AppText variant="body" className="text-text-secondary" style={{ marginTop: 8, lineHeight: 22 }}>
          간판·메뉴·책 속 일본어를 찍으면{'\n'}바로 뜻을 알려드려요.
        </AppText>

        {/* 주액션 — 카메라(강조 타일) */}
        <PressableScale
          onPress={onCamera}
          disabled={busy}
          pressedScale={0.98}
          className="mt-2xl flex-row items-center rounded-lg bg-bg-primary"
          style={[{ gap: 14, padding: 16, opacity: busy ? 0.6 : 1 }, shadowStyle('sm')]}>
          <ActionChip icon="camera" tone="brand" c={c} />
          <View className="flex-1">
            <AppText variant="subheading" className="text-text-primary">
              카메라로 촬영
            </AppText>
            <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 2 }}>
              지금 바로 찍어서 번역
            </AppText>
          </View>
          <Icon name="chevron-right" size={20} color={c['text-tertiary']} />
        </PressableScale>

        {/* 보조액션 — 사진에서 선택(헤어라인 행) */}
        <PressableScale
          onPress={onGallery}
          disabled={busy}
          pressedScale={0.98}
          className="mt-md flex-row items-center rounded-lg bg-bg-primary"
          style={{ gap: 14, padding: 16, borderWidth: hairline, borderColor: c['border-secondary'], opacity: busy ? 0.6 : 1 }}>
          <ActionChip icon="image" tone="neutral" c={c} />
          <View className="flex-1">
            <AppText variant="subheading" className="text-text-primary">
              사진에서 선택
            </AppText>
            <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 2 }}>
              갤러리에서 번역할 부분 고르기
            </AppText>
          </View>
          <Icon name="chevron-right" size={20} color={c['text-tertiary']} />
        </PressableScale>
      </View>
    </View>
  );
}

/** 진입 타일 좌측 원형 아이콘 칩. brand=주액션, neutral=보조. */
function ActionChip({
  icon,
  tone,
  c,
}: {
  icon: IconName;
  tone: 'brand' | 'neutral';
  c: ReturnType<typeof useThemeColors>;
}): React.JSX.Element {
  const bg = tone === 'brand' ? c['brand-subtle'] : c['bg-tertiary'];
  const fg = tone === 'brand' ? c.brand : c['text-secondary'];
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 48, height: 48, backgroundColor: bg }}>
      <Icon name={icon} size={24} color={fg} />
    </View>
  );
}
