/**
 * 로그인 화면.
 *
 * 구글 소셜 로그인 → 백엔드에 ID 토큰 전달 → JWT 수신 → MMKV 저장 →
 * AuthContext 갱신까지의 흐름을 담당한다. 로그인 성공 시 RootNavigator가
 * isLoggedIn 변화를 감지해 MainStack으로 전환한다(이 화면이 직접 navigate
 * 하지 않음).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { AppText } from '../../components';
import { googleLogin } from '../../api/auth';
import { useAuth } from '../../store/AuthContext';

export default function LoginScreen(): React.JSX.Element {
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

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-[2] items-center justify-center gap-sm">
        <AppText variant="display" className="text-text-strong">
          일본어 한자 보카
        </AppText>
        <AppText variant="body" className="text-text-weak">
          퀴즈 풀고 캐시 받자
        </AppText>
      </View>

      <View className="flex-1 items-center justify-start gap-md px-2xl">
        <Pressable
          onPress={handleGoogleLogin}
          disabled={loading}
          className="w-full flex-row items-center justify-center gap-sm rounded-pill bg-bg py-lg active:opacity-80"
          style={{
            shadowColor: '#191F28',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
          {loading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <View className="h-5 w-5 items-center justify-center rounded-pill bg-brand-soft">
                <AppText style={{ fontSize: 12, fontWeight: '700' }} className="text-brand">
                  G
                </AppText>
              </View>
              <AppText variant="body" className="text-text-strong">
                구글로 시작하기
              </AppText>
            </>
          )}
        </Pressable>
        <AppText variant="caption" className="text-text-weak">
          로그인하면 이용약관에 동의하는 것으로 간주됩니다
        </AppText>
      </View>
    </View>
  );
}
