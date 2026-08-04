/**
 * AccountSettingsScreen — 계정 설정.
 *
 * 신원/계정 영역만 담는다: 계정 연결(구글/카카오) · 약관·정책 · 회원 탈퇴.
 * 설정 첫 화면의 **프로필 블록을 탭하면** 여기로 온다.
 *
 * ⚠️ 예전에 얹혀 있던 두 가지를 뺐다(2026-08-04) — 계정과 무관해서다.
 *    · 친구 초대 → `Referral`(설정 > 리워드). 캐시가 걸린 리워드 기능이다.
 *    · 테마 모드 → `DisplaySettings`(설정 > 앱 > 화면·소리). 앱 표시 설정이다.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { AppHeader, ConfirmSheet, ListRow, ListSection, useToast } from '../../components';
import { useMe } from '../../api/hooks';
import { loginWithKakaoAccount } from '@react-native-seoul/kakao-login';
import { deleteAccount, linkAccount } from '../../api/auth';
import { useAuth } from '../../store/AuthContext';
import type { MainStackScreenProps } from '../../navigation/types';

export default function AccountSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<MainStackScreenProps<'AccountSettings'>['navigation']>();
  const me = useMe();
  const m = me.data;
  const { signIn, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { showToast } = useToast();

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
      // 직전 계정을 끊어야 매번 계정 선택 화면이 뜬다(안 하면 캐시된 계정으로 바로 연결됨).
      await GoogleSignin.signOut().catch(() => {});
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
      showToast(
        switched
          ? '이미 가입된 구글 계정으로 로그인했어요'
          : '구글 계정을 연결했어요. 이제 기프티콘도 교환할 수 있어요',
      );
    } catch {
      showToast('구글 계정을 연결하지 못했어요', 'error');
    } finally {
      setLinking(false);
    }
  }

  async function handleLinkKakao() {
    if (linking) {
      return;
    }
    setLinking(true);
    try {
      const result = await loginWithKakaoAccount();
      const { tokens, switched } = await linkAccount('kakao', result.accessToken);
      signIn(tokens.access, tokens.refresh);
      await queryClient.invalidateQueries();
      showToast(
        switched
          ? '이미 가입된 카카오 계정으로 로그인했어요'
          : '카카오 계정을 연결했어요. 이제 기프티콘도 교환할 수 있어요',
      );
    } catch (err) {
      // 사용자 취소(-1 / -1002)는 조용히 무시.
      const code = (err as { code?: number })?.code;
      if (code === -1 || code === -1002) {
        return;
      }
      showToast('카카오 계정을 연결하지 못했어요', 'error');
    } finally {
      setLinking(false);
    }
  }

  async function doWithdraw() {
    if (withdrawing) {
      return;
    }
    setWithdrawOpen(false);
    setWithdrawing(true);
    try {
      await deleteAccount();
      signOut();
    } catch {
      showToast('탈퇴하지 못했어요', 'error');
      setWithdrawing(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="계정 설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 계정 연결 — 게스트만. 이미 연결된 유저에겐 '연결됨' 한 줄이 무의미해 섹션을 숨긴다. */}
        {m?.is_guest && (
          <ListSection title="계정 연결">
            <ListRow
              leftIcon="google"
              title="구글로 연결"
              value={linking ? '연결 중…' : undefined}
              onPress={handleLinkGoogle}
              showChevron
            />
            <ListRow leftIcon="kakao" title="카카오로 연결" onPress={handleLinkKakao} showChevron last />
          </ListSection>
        )}

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
            onPress={() => setWithdrawOpen(true)}
            danger
            last
          />
        </ListSection>
      </ScrollView>

      <ConfirmSheet
        visible={withdrawOpen}
        title="회원 탈퇴"
        message={'정말 탈퇴하시겠어요?\n계정과 모든 데이터가 삭제되고, 보유한 캐시는 소멸돼 복구할 수 없어요.'}
        cancelText="취소"
        confirmText="탈퇴"
        danger
        onCancel={() => setWithdrawOpen(false)}
        onConfirm={doWithdraw}
      />
    </View>
  );
}
