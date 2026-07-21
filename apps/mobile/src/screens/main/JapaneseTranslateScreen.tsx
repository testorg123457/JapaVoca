/**
 * JapaneseTranslateScreen — 일본어 번역 진입.
 *
 * 카메라로 촬영하거나 사진에서 골라, 서버(AI)로 OCR+번역한다.
 * 카메라 → 결과로 바로, 사진 → 범위 선택(크롭) → 결과.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Button, Icon, useToast } from '../../components';
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

  async function onCamera() {
    setBusy(true);
    try {
      const img = await pickFromCamera();
      if (img) {
        navigation.navigate('TranslateResult', { uri: img.uri });
      }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onGallery() {
    setBusy(true);
    try {
      const img = await pickFromGallery();
      if (img) {
        navigation.navigate('TranslateCrop', { image: img });
      }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="일본어 번역" showBack />
      <View className="flex-1 items-center justify-center px-xl" style={{ gap: 18 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 88, height: 88, backgroundColor: c['brand-subtle'] }}>
          <Icon name="camera" size={40} color={c.brand} />
        </View>
        <View className="items-center" style={{ gap: 8 }}>
          <AppText variant="title" className="text-text-primary">
            카메라로 번역하기
          </AppText>
          <AppText variant="body" className="text-center text-text-tertiary">
            일본어가 적힌 간판·메뉴·책을 촬영하거나{'\n'}사진에서 번역할 부분을 골라 보세요.
          </AppText>
        </View>
        <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
          <Button title="카메라로 촬영" leftIcon="camera" onPress={onCamera} loading={busy} />
          <Button title="사진에서 선택" variant="soft" onPress={onGallery} disabled={busy} />
        </View>
      </View>
    </View>
  );
}
