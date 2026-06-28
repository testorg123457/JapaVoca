/**
 * 온보딩 — 학습 트랙 선택(풀스크린). StudySelector + 하단 CTA.
 *
 * 두 가지 모드:
 * 1. pending 모드 — 유저 미생성. "시작" 버튼 시 유저 생성 + 약관 제출 + 학습 설정을
 *    순서대로 실행 후 signInFresh()로 완료. 게이트가 즉시 'ready'가 되어 Main 진입.
 * 2. 일반 모드 — 이미 로그인됨. 학습 설정만 PATCH하고 onComplete()로 게이트 재계산.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Config from 'react-native-config';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, StudySelector } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile } from '../../api/hooks';
import { guestLogin, googleLogin, kakaoLogin } from '../../api/auth';
import { CONSENT_QUERY_KEY } from '../../api/consent';
import { isStudyValid, type StudySelection } from './studyContent';
import { useOnboardingActions } from '../../navigation/OnboardingStack';
import { useAuth } from '../../store/AuthContext';
import { getOrCreateGuestUid } from '../../store/auth';
import { getPendingConsent, clearPendingConsent, setCachedConsentStatus } from '../../store/onboarding';

export default function StudySelectScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { onComplete } = useOnboardingActions();
  const { pendingAuth, signInFresh } = useAuth();
  const isPendingMode = pendingAuth !== null;
  const me = useMe();
  const update = useUpdateProfile();
  const queryClient = useQueryClient();
  const [sel, setSel] = useState<StudySelection>({
    mode: null,
    level: null,
    hiragana: false,
    katakana: false,
  });
  const [localPending, setLocalPending] = useState(false);

  const valid = isStudyValid(sel);
  const isDisabled = !valid || localPending || update.isPending;

  async function onStart() {
    if (isDisabled) {
      return;
    }

    if (isPendingMode && pendingAuth) {
      setLocalPending(true);
      try {
        // 1. 유저 생성
        let access: string;
        let refresh: string;
        if (pendingAuth.method === 'guest') {
          const tokens = await guestLogin(getOrCreateGuestUid());
          access = tokens.access;
          refresh = tokens.refresh;
        } else if (pendingAuth.method === 'kakao') {
          const tokens = await kakaoLogin(pendingAuth.accessToken);
          access = tokens.access;
          refresh = tokens.refresh;
        } else {
          const tokens = await googleLogin(pendingAuth.idToken);
          access = tokens.access;
          refresh = tokens.refresh;
        }

        const authHeader = { Authorization: `Bearer ${access}` };

        // 2. 약관 동의 제출
        const pendingConsent = getPendingConsent();
        if (pendingConsent) {
          const consentRes = await axios.post(
            `${Config.API_BASE_URL}/api/auth/consent/`,
            { ...pendingConsent, phone_number: null },
            { headers: authHeader },
          );
          // 게이트가 즉시 'ready'를 계산할 수 있도록 쿼리 캐시와 MMKV를 미리 채운다.
          queryClient.setQueryData(CONSENT_QUERY_KEY, consentRes.data);
          setCachedConsentStatus(consentRes.data);
        }

        // 3. 학습 설정
        const meRes = await axios.patch(
          `${Config.API_BASE_URL}/api/auth/me/`,
          {
            study_mode: sel.mode,
            study_level: sel.level,
            study_kana_hiragana: sel.hiragana,
            study_kana_katakana: sel.katakana,
          },
          { headers: authHeader },
        );
        queryClient.setQueryData(['me'], meRes.data);

        // 4. 완료 — consent/me 캐시를 살린 채로 로그인 상태 전환
        clearPendingConsent();
        signInFresh(access, refresh);
      } catch {
        Alert.alert('저장 실패', '잠시 후 다시 시도해주세요.');
      } finally {
        setLocalPending(false);
      }
      return;
    }

    // 일반 모드 — 이미 로그인된 상태
    try {
      await update.mutateAsync({
        study_mode: sel.mode,
        study_level: sel.level,
        study_kana_hiragana: sel.hiragana,
        study_kana_katakana: sel.katakana,
      });
      onComplete();
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해주세요.');
    }
  }

  // 일반 모드에서만 me 로딩을 기다린다.
  if (!isPendingMode && !me.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-bg-secondary items-center justify-center"
        edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={c.brand} />
      </SafeAreaView>
    );
  }

  const modeLabel: Record<string, string> = { kanji: '한자', kanji_word: '한자단어', kana_word: '가나단어', kana: '가나' };
  const ctaLabel = sel.mode
    ? `${modeLabel[sel.mode]} ${sel.level ?? ''}`.trim() + ' 시작하기'
    : '시작하기';

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerClassName="px-2xl pt-3xl pb-2xl"
        showsVerticalScrollIndicator={false}>
        <AppText
          variant="micro"
          className="text-text-tertiary"
          style={{ letterSpacing: 1.5 }}>
          학습 설정
        </AppText>
        <AppText
          variant="display"
          className="text-text-primary"
          style={{ marginTop: 12, lineHeight: 34 }}>
          어디서부터{'\n'}시작할까요?
        </AppText>
        <AppText
          variant="body"
          className="text-text-secondary"
          style={{ marginTop: 8, marginBottom: 28 }}>
          한 가지를 골라 시작해요. 설정에서 언제든 바꿀 수 있어요.
        </AppText>
        <StudySelector value={sel} onChange={setSel} />
      </ScrollView>
      <View className="px-2xl pt-md pb-lg">
        <Button
          title={ctaLabel}
          size="lg"
          onPress={onStart}
          disabled={isDisabled}
          loading={localPending || update.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
