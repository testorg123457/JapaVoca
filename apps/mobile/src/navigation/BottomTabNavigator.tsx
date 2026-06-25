/**
 * 하단 탭 — 홈/지갑/설정 + 그 아래 전역 배너 광고.
 *
 * 이모지(🏠💰⚙️) 대신 일관된 SVG 라인 아이콘(Icon). 활성=Ink(검정, 살짝 굵게),
 * 비활성=tertiary. 라벨은 Pretendard Medium. 면은 흰색 + 0.5px 헤어라인 보더.
 * 퀴즈/상자 개봉은 형제 스크린(MainStack)으로 전체화면이 올라오므로 탭바를 숨길 필요 없음.
 *
 * 레이아웃(위→아래): 화면 콘텐츠 → 탭바 → 배너광고 → 하단 safe-area.
 *  - 탭바는 고정 높이(safe-area inset을 직접 안 더함). 대신 맨 아래 배너 영역이
 *    하단 safe-area 패딩을 소유해(배너 로드 실패 시에도 스페이서가 남음) 탭바가
 *    제스처바 위로 올라온다 → 지갑/설정 탭이 안 눌리던 문제 해결.
 *  - 배너는 모든 메인 화면(홈/지갑/설정)에서 동일하게 한 줄 깔리고 절대 잘리지 않음.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';

import { fontFamily, hairline } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import { Icon, type IconName } from '../components';
import type { BottomTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import WalletScreen from '../screens/main/WalletScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const ICON: Record<keyof BottomTabParamList, IconName> = {
  Home: 'home',
  Wallet: 'wallet',
  Settings: 'settings',
};

/**
 * 전역 배너 — 탭바 바로 아래, 화면 맨 하단. 하단 safe-area 패딩을 소유한다.
 * 로드 실패 시 배너만 숨기고 영역(safe-area 스페이서 + 상단 헤어라인)은 유지해
 * 탭바가 항상 제스처바 위에 머물게 한다.
 */
function GlobalBanner(): React.JSX.Element {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [adFailed, setAdFailed] = useState(false);
  return (
    <View
      className="items-center"
      style={{
        paddingBottom: insets.bottom,
        backgroundColor: c['bg-primary'],
        borderTopColor: c['border-tertiary'],
        borderTopWidth: hairline,
      }}>
      {!adFailed && (
        <BannerAd
          unitId={Config.ADMOB_BANNER_HOME_ID || TestIds.BANNER}
          size={BannerAdSize.BANNER}
          onAdFailedToLoad={() => setAdFailed(true)}
        />
      )}
    </View>
  );
}

function MainTabs(): React.JSX.Element {
  const c = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // 활성 탭은 메인색(vermilion) 대신 Ink(검정) — 메인색은 주액션/hero에만.
        tabBarActiveTintColor: c['text-primary'],
        tabBarInactiveTintColor: c['text-tertiary'],
        tabBarStyle: {
          backgroundColor: c['bg-primary'],
          borderTopColor: c['border-tertiary'],
          borderTopWidth: hairline,
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
          marginTop: 2,
          letterSpacing: -0.2,
        },
        tabBarIcon: ({ focused, color }) => (
          <Icon name={ICON[route.name]} size={24} color={color} strokeWidth={focused ? 2.4 : 2} />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: '지갑' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

export default function BottomTabNavigator(): React.JSX.Element {
  return (
    <View style={{ flex: 1 }}>
      <MainTabs />
      <GlobalBanner />
    </View>
  );
}
