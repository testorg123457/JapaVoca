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
import SettingsScreen from '../screens/main/SettingsScreen';
import AccountSettingsScreen from '../screens/main/AccountSettingsScreen';
import LockSettingsScreen from '../screens/main/LockSettingsScreen';
import LockThemeScreen from '../screens/main/LockThemeScreen';
import TermsDetailScreen from '../screens/onboarding/TermsDetailScreen';
import ExchangeScreen from '../screens/main/ExchangeScreen';
import LedgerScreen from '../screens/main/LedgerScreen';
import GifticonWalletScreen from '../screens/main/GifticonWalletScreen';
import GifticonDetailScreen from '../screens/main/GifticonDetailScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import InquiryScreen from '../screens/main/InquiryScreen';
import ReferralRedeemScreen from '../screens/main/ReferralRedeemScreen';
import ReferralScreen from '../screens/main/ReferralScreen';
import StudySettingsScreen from '../screens/main/StudySettingsScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';
import DisplaySettingsScreen from '../screens/main/DisplaySettingsScreen';
import BookmarkScreen from '../screens/main/BookmarkScreen';
import JapaneseTranslateScreen from '../screens/main/JapaneseTranslateScreen';
import TranslateCropScreen from '../screens/main/TranslateCropScreen';
import TranslateResultScreen from '../screens/main/TranslateResultScreen';

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
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="StudySettings" component={StudySettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} />
      <Stack.Screen name="LockSettings" component={LockSettingsScreen} />
      <Stack.Screen name="LockTheme" component={LockThemeScreen} />
      <Stack.Screen name="TermsDetail" component={TermsDetailScreen} />
      <Stack.Screen name="Exchange" component={ExchangeScreen} />
      <Stack.Screen name="Ledger" component={LedgerScreen} />
      <Stack.Screen name="GifticonWallet" component={GifticonWalletScreen} />
      <Stack.Screen name="GifticonDetail" component={GifticonDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Inquiry" component={InquiryScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="ReferralRedeem" component={ReferralRedeemScreen} />
      <Stack.Screen name="JapaneseTranslate" component={JapaneseTranslateScreen} />
      <Stack.Screen name="TranslateCrop" component={TranslateCropScreen} />
      <Stack.Screen name="TranslateResult" component={TranslateResultScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarkScreen} />
    </Stack.Navigator>
  );
}
