/**
 * AccountSettingsScreen — 계정 설정.
 *
 * 신원/계정 영역: 화면 표시(테마) · 계정 연결(구글/카카오) · 약관·정책 · 회원 탈퇴.
 * (알림/캐시내역 등 기능 영역은 설정 메인에 독립 섹션으로 둔다.)
 */
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { AppHeader, AppText, ListRow, ListSection } from '../../components';
import { useThemeColors, useThemeMode } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../store/theme';
import { useMe } from '../../api/hooks';
import { deleteAccount, linkAccount } from '../../api/auth';
import { useAuth } from '../../store/AuthContext';
import type { MainStackScreenProps } from '../../navigation/types';

/** 테마 모드 선택 행 — [ 시스템 | 라이트 | 다크 ] 세그먼트. 선택됨만 brand. */
const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
];

function ThemeModeRow() {
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

export default function AccountSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<MainStackScreenProps<'AccountSettings'>['navigation']>();
  const me = useMe();
  const m = me.data;
  const { signIn, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
  }, []);

  // 게스트 → 구글 연결. id_token을 받아 현재(게스트) JWT로 link 호출.
  // switched=true면 이미 가입된 구글 계정으로 전환(게스트 진행분 폐기).
  async function handleLinkGoogle() {
    if (linking) {
      return;
    }
    setLinking(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) {
        return;
      }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('no id token');
      }
      const { tokens, switched } = await linkAccount('google', response.data.idToken);
      signIn(tokens.access, tokens.refresh);
      await queryClient.invalidateQueries();
      Alert.alert(
        switched ? '기존 구글 계정으로 로그인' : '구글 연결 완료',
        switched
          ? '이미 가입된 구글 계정이 있어 그 계정으로 로그인했어요. (게스트 진행분은 합쳐지지 않아요)'
          : '게스트 계정이 구글 계정으로 연결됐어요. 이제 기프티콘 교환도 가능해요.',
      );
    } catch {
      Alert.alert('연결 실패', '구글 연결에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLinking(false);
    }
  }

  function handleLinkKakao() {
    Alert.alert(
      '카카오 연결 준비 중',
      '카카오 네이티브 SDK/앱키 설정 후 활성화됩니다. (백엔드는 이미 준비됨)',
    );
  }

  function confirmWithdraw() {
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠어요?\n계정과 모든 데이터가 삭제되고, 보유한 캐시는 소멸돼 복구할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            if (withdrawing) {
              return;
            }
            setWithdrawing(true);
            try {
              await deleteAccount();
              signOut();
            } catch {
              setWithdrawing(false);
              Alert.alert('탈퇴 실패', '잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="계정 설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 화면 표시 — 테마 모드 */}
        <ListSection title="화면 표시">
          <ThemeModeRow />
        </ListSection>

        {/* 계정 연결 */}
        <ListSection title="계정 연결">
          {m?.is_guest ? (
            <>
              <ListRow
                leftIcon="google"
                title="구글로 연결"
                value={linking ? '연결 중…' : undefined}
                onPress={handleLinkGoogle}
                showChevron
              />
              <ListRow leftIcon="kakao" title="카카오로 연결" onPress={handleLinkKakao} showChevron last />
            </>
          ) : (
            <ListRow
              leftIcon={m?.provider === 'kakao' ? 'kakao' : 'google'}
              title={m?.provider === 'kakao' ? '카카오 계정' : '구글 계정'}
              value="연결됨"
              showChevron={false}
              last
            />
          )}
        </ListSection>

        {/* 약관 · 정책 */}
        <ListSection title="약관 · 정책">
          <ListRow
            leftIcon="document"
            title="이용약관"
            onPress={() => navigation.navigate('TermsDetail', { kind: 'terms' })}
          />
          <ListRow
            leftIcon="shield"
            title="개인정보처리방침"
            onPress={() => navigation.navigate('TermsDetail', { kind: 'privacy' })}
            last
          />
        </ListSection>

        {/* 회원 탈퇴 */}
        <ListSection>
          <ListRow
            leftIcon="logout"
            title="회원 탈퇴"
            value={withdrawing ? '처리 중…' : undefined}
            onPress={confirmWithdraw}
            danger
            last
          />
        </ListSection>
      </ScrollView>
    </View>
  );
}
