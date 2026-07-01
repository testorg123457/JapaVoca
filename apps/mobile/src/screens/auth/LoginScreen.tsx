import React, { useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { loginWithKakaoAccount } from '@react-native-seoul/kakao-login';
import LottieView from 'lottie-react-native';

import { AppText, ConfirmSheet } from '../../components';
import { mint } from '../../theme/tokens';
import { useAuth } from '../../store/AuthContext';


function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function KakaoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1.5C4.858 1.5 1.5 4.082 1.5 7.278c0 2.035 1.352 3.822 3.393 4.848l-.868 3.22c-.076.28.25.504.495.34L8.39 13.2c.2.018.404.027.61.027 4.142 0 7.5-2.582 7.5-5.778S13.142 1.5 9 1.5z"
        fill="#191600"
      />
    </Svg>
  );
}

export default function LoginScreen(): React.JSX.Element {
  const { startOnboarding } = useAuth();
  const [loadingMethod, setLoadingMethod] = useState<'google' | 'kakao' | 'guest' | null>(null);
  const [guestSheetVisible, setGuestSheetVisible] = useState(false);
  const isLoading = loadingMethod !== null;

  useEffect(() => {
    GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
  }, []);

  async function handleGoogleLogin() {
    if (isLoading) { return; }
    setLoadingMethod('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => {});
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) { return; }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('ID 토큰 없음');
      }
      startOnboarding({ method: 'google', idToken: response.data.idToken });
    } catch {
      Alert.alert('로그인 실패', '다시 시도해주세요.');
    } finally {
      setLoadingMethod(null);
    }
  }

  async function handleKakaoLogin() {
    if (isLoading) { return; }
    setLoadingMethod('kakao');
    try {
      const result = await loginWithKakaoAccount();
      startOnboarding({ method: 'kakao', accessToken: result.accessToken });
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === -1 || code === -1002) { return; }
      Alert.alert('로그인 실패', '다시 시도해주세요.');
    } finally {
      setLoadingMethod(null);
    }
  }

  function handleGuestLogin() {
    if (isLoading) { return; }
    setGuestSheetVisible(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={{ flex: 1, flexDirection: 'column' }} edges={['top', 'bottom']}>

        {/* ── Hero 영역 ── */}
        <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8, overflow: 'hidden' }}>

          {/* 우상단 민트 원형 accent */}
          <View
            style={{
              position: 'absolute',
              top: -120,
              right: -120,
              width: 360,
              height: 360,
              borderRadius: 180,
              backgroundColor: mint[100],
            }}
          />

          {/* 우상단 Lottie 장식 — 모서리에서 거리를 두고 배치 */}
          <LottieView
            source={require('../../assets/message-sent-animation.json')}
            autoPlay
            loop
            style={{ position: 'absolute', top: 40, right: 30, width: 175, height: 175, zIndex: 1 }}
          />

          {/* 타이포 — 남은 공간 아래 정렬 */}
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 28, zIndex: 1 }}>
            <AppText style={{ fontSize: 13, fontWeight: '500', color: '#B0B8B2', letterSpacing: 2 }}>
              Japanese · Kanji
            </AppText>
            <AppText style={{ fontSize: 44, fontWeight: '900', color: '#0A1409', letterSpacing: -2, lineHeight: 52, marginTop: 6 }}>
              {'일본어\n한자\n'}
              <AppText style={{ fontSize: 44, fontWeight: '900', color: mint[500], letterSpacing: -2, lineHeight: 52 }}>
                보카
              </AppText>
            </AppText>
            <AppText style={{ fontSize: 14, color: '#9EA89F', marginTop: 14, lineHeight: 22 }}>
              매일 퀴즈를 풀고{'\n'}캐시를 적립하세요
            </AppText>
          </View>
        </View>

        {/* ── 버튼 영역 ── */}
        <View style={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 }}>

          {/* 구글 */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading}
            activeOpacity={0.75}>
            <View style={{
              height: 52,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: '#E4E7E4',
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: loadingMethod === 'google' ? 0.6 : 1,
            }}>
              <GoogleIcon />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111111' }}>
                {loadingMethod === 'google' ? '로그인 중...' : '구글로 계속하기'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 카카오 */}
          <TouchableOpacity
            onPress={handleKakaoLogin}
            disabled={isLoading}
            activeOpacity={0.75}
            style={{ marginTop: 10 }}>
            <View style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: '#FEE500',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: loadingMethod === 'kakao' ? 0.6 : 1,
            }}>
              <KakaoIcon />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#191600' }}>
                {loadingMethod === 'kakao' ? '로그인 중...' : '카카오로 계속하기'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#EDEEEC' }} />
            <Text style={{ fontSize: 12, color: '#C8CCC9', marginHorizontal: 12 }}>또는</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#EDEEEC' }} />
          </View>

          {/* 게스트 */}
          <TouchableOpacity
            onPress={handleGuestLogin}
            disabled={isLoading}
            activeOpacity={0.6}
            style={{ height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 13, color: '#B8BCB9' }}>게스트로 시작하기</Text>
          </TouchableOpacity>

          {/* 약관 */}
          <Text style={{ fontSize: 10.5, color: '#CACFCC', textAlign: 'center', lineHeight: 16, marginTop: 4 }}>
            시작하면 이용약관에 동의하는 것으로 간주됩니다
          </Text>
        </View>

      </SafeAreaView>

      <ConfirmSheet
        visible={guestSheetVisible}
        title="게스트로 시작하기 전에"
        message={
          '게스트는 이 기기에만 저장돼요.\n\n' +
          '• 앱을 삭제하거나 기기를 바꾸면 캐시·학습 기록이 사라져요.\n' +
          '• 게스트는 기프티콘 교환이 제한돼요.\n\n' +
          '설정에서 구글·카카오 계정을 연결하면 기록을 보관할 수 있어요.'
        }
        cancelText="취소"
        confirmText="동의하고 시작"
        onCancel={() => setGuestSheetVisible(false)}
        onConfirm={() => {
          setGuestSheetVisible(false);
          setTimeout(() => startOnboarding({ method: 'guest' }), 260);
        }}
      />
    </View>
  );
}
