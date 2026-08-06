/**
 * LockSettingsScreen — 잠금화면 학습 설정.
 *
 * - "화면 켤 때 퀴즈 띄우기": 네이티브 LockScreen 모듈 on/off(포그라운드 서비스).
 * - "잠금화면 디자인": 잠금화면 퀴즈 화면의 테마/레이아웃 변경(준비 중).
 *
 * 잠금화면 모듈이 없는 환경(iOS/빌드 전)에서는 안내만 노출한다.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, ConfirmSheet, ListRow, ListSection, ToggleRow } from '../../components';
import { isSfxEnabled, setSfxEnabled } from '../../store/sfx';
import { preloadSfx } from '../../lib/sfx';
import {
  disableLockScreen,
  enableLockScreen,
  isLockScreenEnabled,
  lockScreenAvailable,
} from '../../lib/lockScreen';
import type { MainStackScreenProps } from '../../navigation/types';

export default function LockSettingsScreen({
  navigation,
}: MainStackScreenProps<'LockSettings'>): React.JSX.Element {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockSheetVisible, setLockSheetVisible] = useState(false);
  // 효과음은 기기 설정(MMKV)이라 서버 프로필과 무관하다. MMKV는 반응형이 아니므로
  // 초기값만 읽어 로컬 state로 들고 간다.
  const [sfxOn, setSfxOn] = useState(isSfxEnabled);

  useEffect(() => {
    isLockScreenEnabled().then(setLockEnabled);
  }, []);

  function toggleLockScreen(next: boolean) {
    setLockEnabled(next);
    if (next) {
      enableLockScreen();
      setLockSheetVisible(true);
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

            <View>
              <ListSection title="소리">
                <ToggleRow
                  title="정답 · 오답 효과음"
                  value={sfxOn}
                  onValueChange={(v) => { setSfxOn(v); setSfxEnabled(v); if (v) { preloadSfx(); } }}
                  last
                />
              </ListSection>
              {/* ⚠️ 이 설정은 잠금화면 전용이 아니다. 앱에서 푸는 퀴즈에도 적용되므로
                  "잠금화면에서만 나는 소리"로 오해하지 않도록 한 줄 덧붙인다. */}
              <AppText variant="caption" className="mt-md px-xl text-text-tertiary">
                앱에서 푸는 퀴즈에도 함께 적용돼요.
              </AppText>
            </View>

            <ListSection title="꾸미기">
              <ListRow
                leftIcon="sparkles"
                title="잠금화면 디자인"
                subtitle="배경·테마 바꾸기"
                onPress={() => navigation.navigate('LockTheme')}
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

      <ConfirmSheet
        visible={lockSheetVisible}
        title="잠금화면 학습 켜짐"
        message={'화면을 켜거나 잠금을 해제할 때 퀴즈가 떠요.\n\n삼성 기기는 설정에서 "자동 실행"·배터리 최적화 제외가 필요할 수 있어요.'}
        confirmText="확인"
        onConfirm={() => setLockSheetVisible(false)}
      />
    </View>
  );
}
