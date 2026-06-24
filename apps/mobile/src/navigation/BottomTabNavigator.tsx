/**
 * 하단 탭 — 홈/지갑/설정.
 *
 * 이모지(🏠💰⚙️) 대신 일관된 SVG 라인 아이콘(Icon). 활성=브랜드 민트(살짝 굵게),
 * 비활성=tertiary. 라벨은 Pretendard Medium. 면은 흰색 + 0.5px 헤어라인 보더.
 * 퀴즈/상자 개봉은 형제 스크린(MainStack)으로 전체화면이 올라오므로 탭바를 숨길 필요 없음.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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

export default function BottomTabNavigator(): React.JSX.Element {
  const c = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c['text-tertiary'],
        tabBarStyle: {
          backgroundColor: c['bg-primary'],
          borderTopColor: c['border-tertiary'],
          borderTopWidth: hairline,
          height: 62,
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
