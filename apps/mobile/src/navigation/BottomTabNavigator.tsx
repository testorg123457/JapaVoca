/**
 * 하단 탭 — 홈/지갑/설정.
 *
 * 아이콘은 임시 이모지. 색은 tokens.ts 참조(배경 흰색, 활성 brand).
 * 퀴즈/상자 개봉은 이 탭의 형제 스크린(MainStack)으로 전체화면이 올라오므로
 * 여기서 tabBarStyle 을 숨길 필요가 없다.
 */
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '../theme/tokens';
import type { BottomTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import WalletScreen from '../screens/main/WalletScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const ICON: Record<keyof BottomTabParamList, string> = {
  Home: '🏠',
  Wallet: '💰',
  Settings: '⚙️',
};

export default function BottomTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textWeak,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
            {ICON[route.name]}
          </Text>
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: '지갑' }} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '설정' }}
      />
    </Tab.Navigator>
  );
}
