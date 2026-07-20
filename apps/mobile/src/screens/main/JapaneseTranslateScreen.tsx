/**
 * JapaneseTranslateScreen — 일본어 번역.
 *
 * 카메라로 일본어(간판·메뉴·책 등)를 촬영해 뜻을 보여주는 화면.
 * 현재는 진입점·기본 레이아웃만. 촬영/OCR/번역 로직은 추후.
 */
import React from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';

export default function JapaneseTranslateScreen(): React.JSX.Element {
  const c = useThemeColors();

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
            일본어가 적힌 간판·메뉴·책을 촬영하면{'\n'}뜻을 알려드려요.
          </AppText>
        </View>
        <Button title="사진 촬영 (준비 중)" leftIcon="camera" disabled className="mt-md" />
      </View>
    </View>
  );
}
