/**
 * DisplaySettingsScreen — 화면 · 소리.
 *
 * "앱이 어떻게 보이고 들리는가"를 한 곳에 모은다. 예전엔 테마가 계정 설정 안(3단계),
 * 효과음이 설정 첫 화면(2단계)에 흩어져 있었다 — 같은 성격인데 깊이가 달랐다.
 *
 * ⚠️ 효과음은 **기기 설정(MMKV)** 이라 서버 프로필과 무관하다. MMKV는 반응형이 아니므로
 *    초기값만 읽어 로컬 state로 들고 간다.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, ListSection, ToggleRow } from '../../components';
import { useThemeColors, useThemeMode } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../store/theme';
import { isSfxEnabled, setSfxEnabled } from '../../store/sfx';
import { preloadSfx } from '../../lib/sfx';

/** 테마 모드 선택 — [ 시스템 | 라이트 | 다크 ] 세그먼트. 선택됨만 brand. */
const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
];

function ThemeModeRow(): React.JSX.Element {
  const c = useThemeColors();
  const { mode, setMode } = useThemeMode();
  return (
    <View className="px-xl py-md" style={{ minHeight: 56, justifyContent: 'center' }}>
      <View className="flex-row rounded-md p-xs" style={{ backgroundColor: c['bg-tertiary'], gap: 4 }}>
        {THEME_OPTIONS.map((opt) => {
          const active = mode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              className="flex-1 items-center rounded-sm py-md active:opacity-70"
              style={{ backgroundColor: active ? c.brand : 'transparent' }}>
              <AppText
                variant="subheading"
                style={{ color: active ? c['on-brand'] : c['text-secondary'] }}>
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DisplaySettingsScreen(): React.JSX.Element {
  const [sfxOn, setSfxOn] = useState(isSfxEnabled);

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="화면 · 소리" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        <ListSection title="테마">
          <ThemeModeRow />
        </ListSection>

        <ListSection title="소리">
          <ToggleRow
            title="정답 · 오답 효과음"
            value={sfxOn}
            onValueChange={(v) => {
              setSfxOn(v);
              setSfxEnabled(v);
              if (v) { preloadSfx(); }
            }}
            last
          />
        </ListSection>
      </ScrollView>
    </View>
  );
}
