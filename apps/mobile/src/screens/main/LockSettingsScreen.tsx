/**
 * LockSettingsScreen — 잠금화면 학습 설정.
 *
 * - "화면 켤 때 퀴즈 띄우기": 네이티브 LockScreen 모듈 on/off(포그라운드 서비스).
 * - "잠금화면 디자인": 잠금화면 퀴즈 화면의 테마/레이아웃 변경(준비 중).
 *
 * 잠금화면 모듈이 없는 환경(iOS/빌드 전)에서는 안내만 노출한다.
 */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { AppHeader, AppText, ListRow, ListSection, ToggleRow } from '../../components';
import {
  disableLockScreen,
  enableLockScreen,
  isLockScreenEnabled,
  lockScreenAvailable,
} from '../../lib/lockScreen';

function comingSoon() {
  Alert.alert('준비 중', '곧 제공될 기능이에요.');
}

export default function LockSettingsScreen(): React.JSX.Element {
  const [lockEnabled, setLockEnabled] = useState(false);

  useEffect(() => {
    isLockScreenEnabled().then(setLockEnabled);
  }, []);

  function toggleLockScreen(next: boolean) {
    setLockEnabled(next);
    if (next) {
      enableLockScreen();
      Alert.alert(
        '잠금화면 학습 켜짐',
        '화면을 켜거나 잠금을 해제할 때 퀴즈가 떠요.\n삼성 기기는 설정에서 "자동 실행"·배터리 최적화 제외가 필요할 수 있어요.',
      );
    } else {
      disableLockScreen();
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="잠금화면 설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {lockScreenAvailable ? (
          <>
            <ListSection title="잠금화면 학습">
              <ToggleRow
                title="화면 켤 때 퀴즈 띄우기"
                value={lockEnabled}
                onValueChange={toggleLockScreen}
                last
              />
            </ListSection>

            <ListSection title="꾸미기">
              <ListRow
                leftIcon="sparkles"
                title="잠금화면 디자인"
                subtitle="배경·테마 바꾸기"
                onPress={comingSoon}
                last
              />
            </ListSection>
          </>
        ) : (
          <View className="px-xl">
            <AppText variant="body" className="text-text-tertiary">
              이 기기에서는 잠금화면 학습을 사용할 수 없어요.
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
