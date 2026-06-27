/**
 * 로그인 화면.
 *
 * 로그인 방식을 선택하면 즉시 유저를 생성하지 않고 온보딩(약관→권한→학습)을 먼저
 * 진행한다. 유저는 StudySelect "시작" 버튼을 눌렀을 때 생성된다.
 * 구글: ID 토큰을 여기서 받아 pendingAuth에 저장 → 온보딩 → StudySelect에서 서버 호출.
 * 게스트: 바로 pendingAuth 설정 → 온보딩 → StudySelect에서 서버 호출.
 *
 * 디자인: 브랜드 마크 + 한 줄 가치 제안 hero, 하단에 구글 버튼(멀티컬러 G)과
 * 약관 안내, 게스트로 시작하기. press 촉감(PressableScale).
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
import { useAuth } from '../../store/AuthContext';

export default function LoginScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { startOnboarding } = useAuth();
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
        return;
      }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('Google sign-in did not return an ID token');
      }

      // ID 토큰 획득 후 온보딩 시작 — 유저 생성은 StudySelect 완료 후.
      startOnboarding({ method: 'google', idToken: response.data.idToken });
    } catch {
      Alert.alert('로그인 실패', '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  // 카카오 로그인 — 백엔드(/api/auth/kakao/)는 준비됨. 클라 카카오 SDK + 네이티브
  // 앱키 설정이 선결조건이라, SDK 연결 전까지는 안내만 한다.
  function handleKakaoLogin() {
    Alert.alert(
      '카카오 로그인 준비 중',
      '카카오 네이티브 SDK/앱키 설정 후 활성화됩니다. (백엔드는 이미 준비됨)',
    );
  }

  // 게스트로 시작 — 먼저 데이터 유실 경고를 띄우고, 확인 시 온보딩을 시작한다.
  function handleGuestLogin() {
    if (loading) {
      return;
    }
    Alert.alert(
      '게스트로 시작하기 전에',
      '게스트는 이 기기에만 저장돼요.\n\n' +
        '• 앱을 삭제하거나 기기를 바꾸면 모아둔 캐시·학습 기록·출석이 모두 사라질 수 있어요.\n' +
        '• 게스트는 기프티콘 교환이 제한돼요.\n\n' +
        '나중에 설정에서 구글·카카오 계정을 연결하면 지금까지의 기록을 그대로 안전하게 보관할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '동의하고 시작', style: 'destructive', onPress: startGuest },
      ],
    );
  }

  function startGuest() {
    startOnboarding({ method: 'guest' });
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

        <PressableScale
          onPress={handleGuestLogin}
          disabled={loading}
          className="mt-sm w-full items-center justify-center rounded-md bg-bg-tertiary"
          style={{ height: 50, borderWidth: 1.5, borderColor: c['border-secondary'] }}>
          <AppText variant="label" className="text-text-primary" style={{ fontSize: 15 }}>
            게스트로 시작하기
          </AppText>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}
