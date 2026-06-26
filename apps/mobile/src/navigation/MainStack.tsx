/**
 * 로그인 후 스택 — 단일 스크롤 홈 + 그 위로 올라오는 퀴즈/상자 개봉.
 *
 * 하단 탭(BottomTab)을 제거하고 Home 을 메인으로 둔다. 지갑/설정은 홈의 섹션으로
 * 흡수됐다. Home 과 Quiz/BoxOpen 을 형제 스크린으로 두어 퀴즈·상자 개봉이
 * 홈을 덮는 전체화면으로 표시된다.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { MainStackParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import LockQuizScreen from '../screens/quiz/LockQuizScreen';
import BoxOpenScreen from '../screens/quiz/BoxOpenScreen';
import KanaScreen from '../screens/main/KanaScreen';
import AttendanceScreen from '../screens/main/AttendanceScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ExchangeScreen from '../screens/main/ExchangeScreen';
import LedgerScreen from '../screens/main/LedgerScreen';
import ExchangeHistoryScreen from '../screens/main/ExchangeHistoryScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import InquiryScreen from '../screens/main/InquiryScreen';
import StyleGuideScreen from '../screens/StyleGuideScreen';
import GestureDebugScreen from '../screens/GestureDebugScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="LockQuiz"
        component={LockQuizScreen}
        options={{ animation: 'fade', gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
      <Stack.Screen
        name="BoxOpen"
        component={BoxOpenScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="Kana" component={KanaScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Exchange" component={ExchangeScreen} />
      <Stack.Screen name="Ledger" component={LedgerScreen} />
      <Stack.Screen name="ExchangeHistory" component={ExchangeHistoryScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Inquiry" component={InquiryScreen} />
      {__DEV__ && (
        <Stack.Screen
          name="StyleGuide"
          component={StyleGuideScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
      )}
      {__DEV__ && <Stack.Screen name="GestureDebug" component={GestureDebugScreen} />}
    </Stack.Navigator>
  );
}
