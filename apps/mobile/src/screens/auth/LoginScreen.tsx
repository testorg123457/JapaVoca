/**
 * 로그인 화면.
 *
 * 구글 소셜 로그인 → 백엔드에 ID 토큰 전달 → JWT 수신 → MMKV 저장 →
 * AuthContext 갱신까지의 흐름을 담당한다. 로그인 성공 시 RootNavigator가
 * isLoggedIn 변화를 감지해 MainStack으로 전환한다(이 화면이 직접 navigate
 * 하지 않음).
 *
 * 디자인: 브랜드 마크 + 한 줄 가치 제안 hero, 하단에 구글 버튼(멀티컬러 G)과
 * 약관 안내, DEBUG 개발용 로그인. press 촉감(PressableScale).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { AppText, Gradient, Icon, PressableScale } from '../../components';
import { gradients, shadowStyle } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { devLogin, googleLogin } from '../../api/auth';
import { useAuth } from '../../store/AuthContext';

export default function LoginScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (__DEV__ && !Config.GOOGLE_WEB_CLIENT_ID) {
      console.warn(
        '[LoginScreen] GOOGLE_WEB_CLIENT_ID가 설정되지 않았습니다 — .env를 확인하세요. ' +
          'webClientId 없이는 ID 토큰을 받지 못해 로그인이 실패합니다.',
      );
    }
    GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
  }, []);

  async function handleGoogleLogin() {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (isCancelledResponse(response)) {
        return; // 사용자가 팝업을 닫음 — 조용히 무시.
      }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('Google sign-in did not return an ID token');
      }

      const { access, refresh } = await googleLogin(response.data.idToken);
      signIn(access, refresh);
    } catch {
      Alert.alert('로그인 실패', '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  // 카카오 로그인 — 백엔드(/api/auth/kakao/)는 준비됨. 클라 카카오 SDK + 네이티브
  // 앱키 설정이 선결조건(docs/계획 폴더/03-구현순서-선결조건.md)이라, SDK 연결 전까지는
  // 안내만 한다. SDK 도입 후: const token = await KakaoLogin.login(); 의 accessToken을
  // api/auth.kakaoLogin(token) 으로 보내 signIn(access, refresh) 하면 된다.
  function handleKakaoLogin() {
    Alert.alert(
      '카카오 로그인 준비 중',
      '카카오 네이티브 SDK/앱키 설정 후 활성화됩니다. (백엔드는 이미 준비됨)',
    );
  }

  // DEBUG 전용 — 구글 OAuth 없이 테스트 유저로 로그인 (실 서비스 빌드엔 없음).
  async function handleDevLogin() {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const { access, refresh } = await devLogin();
      signIn(access, refresh);
    } catch {
      Alert.alert('Dev 로그인 실패', '백엔드(DEBUG)가 켜져 있는지 확인하세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      {/* Hero */}
      <View className="flex-[3] items-center justify-center gap-xl px-2xl">
        <View
          className="overflow-hidden rounded-2xl"
          style={{
            width: 92,
            height: 92,
            shadowColor: c.brand,
            shadowOpacity: 0.35,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}>
          <Gradient colors={gradients.brand} direction="diagonal" />
          <View className="flex-1 items-center justify-center">
            <Icon name="book" size={48} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
        <View className="items-center gap-sm">
          <AppText variant="display" className="text-text-primary">
            일본어 한자 보카
          </AppText>
          <AppText variant="body" className="text-text-secondary">
            퀴즈 풀고 캐시 받자 🪙
          </AppText>
        </View>
      </View>

      {/* 액션 */}
      <View className="flex-[2] items-center justify-start gap-md px-2xl">
        <PressableScale
          onPress={handleGoogleLogin}
          disabled={loading}
          className="w-full flex-row items-center justify-center rounded-md bg-bg-primary"
          style={{
            height: 54,
            gap: 8,
            borderWidth: 1,
            borderColor: c['border-secondary'],
            ...shadowStyle('sm'),
          }}>
          {loading ? (
            <ActivityIndicator color={c.brand} />
          ) : (
            <>
              <Icon name="google" size={20} />
              <AppText variant="label" className="text-text-primary" style={{ fontSize: 16 }}>
                구글로 시작하기
              </AppText>
            </>
          )}
        </PressableScale>
        <PressableScale
          onPress={handleKakaoLogin}
          disabled={loading}
          className="w-full flex-row items-center justify-center rounded-md"
          style={{ height: 54, gap: 8, backgroundColor: '#FEE500', ...shadowStyle('sm') }}>
          <AppText variant="label" style={{ fontSize: 16, color: '#191600' }}>
            카카오로 시작하기
          </AppText>
        </PressableScale>
        <AppText variant="caption" className="text-text-tertiary text-center">
          로그인하면 이용약관에 동의하는 것으로 간주됩니다
        </AppText>

        {__DEV__ && (
          <PressableScale
            onPress={handleDevLogin}
            disabled={loading}
            className="mt-sm w-full items-center justify-center rounded-md"
            style={{ height: 48, borderWidth: 1, borderColor: c['border-tertiary'] }}>
            <AppText variant="caption" className="text-text-tertiary">
              개발용 로그인 (DEBUG)
            </AppText>
          </PressableScale>
        )}
      </View>
    </SafeAreaView>
  );
}
