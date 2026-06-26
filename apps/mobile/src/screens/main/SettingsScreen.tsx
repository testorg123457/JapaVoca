/**
 * SettingsScreen — 설정.
 *
 * 행+구분선 리스트(카드 X). 실제 동작: 단어/한자 급수(별도), 푸시 토글, 캐시/구매 내역,
 * 알림 화면, 로그아웃. 일부(계정/잠금화면)는 안내 스텁.
 * 비즈니스 로직은 기존 훅(useUpdateProfile/useAuth) 그대로 — 화면은 호출만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { AppHeader, AppText, Icon, ListRow, ListSection, StudySelector, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile, type ProfileUpdate } from '../../api/hooks';
import { linkAccount } from '../../api/auth';
import { useAuth } from '../../store/AuthContext';
import { isStudyValid, type StudySelection } from '../onboarding/studyContent';
import type { MainStackScreenProps } from '../../navigation/types';

const APP_VERSION = 'v0.0.1';
const SUPPORT_EMAIL = '0211ilyoil@gmail.com';
const SUPPORT_MAIL = `mailto:${SUPPORT_EMAIL}?subject=[JapaVoca]%20문의`;

function comingSoon() {
  Alert.alert('준비 중', '곧 제공될 기능이에요.');
}

/** 우측에 스위치가 있는 설정 행(ListRow 레이아웃과 동일 톤). */
function ToggleRow({
  title,
  value,
  onValueChange,
  last,
}: {
  title: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View
      className={`flex-row items-center justify-between px-xl py-md ${last ? '' : 'border-b border-border-tertiary'}`}
      style={{ minHeight: 56 }}>
      <AppText variant="subheading" className="text-text-primary">
        {title}
      </AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c['border-secondary'], true: c.brand }}
        thumbColor={c['bg-primary']}
      />
    </View>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Settings'>['navigation']>();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const { signIn, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [studySel, setStudySel] = useState<StudySelection | null>(null);
  const studyInitialized = useRef(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
  }, []);

  const m = me.data;

  // me 로드 후 딱 한 번만 초기화(useRef 플래그로 이후 변경에 의한 재초기화 방지).
  useEffect(() => {
    if (m && !studyInitialized.current) {
      studyInitialized.current = true;
      setStudySel({
        mode: (m.study_mode as StudySelection['mode']) ?? null,
        level: (m.study_level as StudySelection['level']) ?? null,
        hiragana: m.study_kana_hiragana,
        katakana: m.study_kana_katakana,
      });
    }
  }, [m]);

  function changeStudy(next: StudySelection) {
    const prev = studySel;
    setStudySel(next);
    if (isStudyValid(next)) {
      updateProfile.mutate(
        { study_mode: next.mode, study_level: next.level,
          study_kana_hiragana: next.hiragana, study_kana_katakana: next.katakana },
        { onError: () => {
          Alert.alert('오류', '설정 변경에 실패했어요.');
          setStudySel(prev);
        }},
      );
    }
  }

  const patch = (data: ProfileUpdate) =>
    updateProfile.mutate(data, { onError: () => Alert.alert('오류', '설정 변경에 실패했어요.') });

  // 게스트 → 구글 연결. 구글 로그인으로 id_token을 받아 현재(게스트) JWT로 link 호출.
  // 충돌(이미 가입된 구글) 시 서버가 기존 계정으로 전환(switched) → 새 토큰으로 교체 후
  // 전체 캐시 무효화(계정이 바뀔 수 있으므로).
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

  function confirmLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  }

  function openSupport() {
    Linking.openURL(SUPPORT_MAIL).catch(() =>
      Alert.alert('문의하기', `${SUPPORT_EMAIL} 로 문의해주세요.`),
    );
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 프로필 */}
        <View
          className="flex-row items-center border-y border-border-tertiary bg-bg-primary px-xl py-lg"
          style={{ gap: 14 }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 52, height: 52, backgroundColor: c['bg-tertiary'] }}>
            <Icon name="user" size={28} color={c['text-secondary']} />
          </View>
          <View className="flex-1 gap-xs">
            <AppText variant="title" className="text-text-primary">
              {m?.nickname ?? '게스트'}
            </AppText>
            <AppText variant="caption" className="text-text-tertiary">
              {m?.is_guest ? '게스트 계정 · 연결하면 교환 가능' : m?.email ?? ''}
            </AppText>
          </View>
          <Tag
            label={m?.provider === 'kakao' ? 'Kakao' : m?.is_guest ? 'Guest' : 'Google'}
            variant={m?.is_guest ? 'amber' : 'neutral'}
          />
        </View>

        {/* 계정 연결 — 게스트만. 구글/카카오 연결 시 같은 계정이 실계정으로 승격 */}
        {m?.is_guest ? (
          <ListSection title="계정 연결">
            <ListRow
              leftIcon="google"
              title="구글로 연결"
              value={linking ? '연결 중…' : undefined}
              onPress={handleLinkGoogle}
              showChevron
            />
            <ListRow
              leftIcon="kakao"
              title="카카오로 연결"
              onPress={handleLinkKakao}
              showChevron
              last
            />
          </ListSection>
        ) : null}

        {/* 학습 트랙 */}
        <View className="px-xl">
          <AppText variant="label" className="text-text-tertiary" style={{ marginBottom: 12 }}>
            학습
          </AppText>
          {studySel ? <StudySelector value={studySel} onChange={changeStudy} /> : null}
        </View>

        {/* 캐시 · 내역 */}
        <ListSection title="캐시 · 내역">
          <ListRow leftIcon="wallet" title="캐시 내역" onPress={() => navigation.navigate('Ledger')} />
          <ListRow leftIcon="gift" title="구매 내역" onPress={() => navigation.navigate('ExchangeHistory')} last />
        </ListSection>

        {/* 알림 */}
        <ListSection title="알림">
          <ListRow leftIcon="bell" title="알림 보기" onPress={() => navigation.navigate('Notifications')} />
          <ToggleRow
            title="푸시 알림"
            value={m?.push_enabled ?? true}
            onValueChange={(v) => patch({ push_enabled: v })}
          />
          <ToggleRow
            title="학습 리마인더"
            value={m?.push_quiz_reminder ?? true}
            onValueChange={(v) => patch({ push_quiz_reminder: v })}
          />
          <ToggleRow
            title="마케팅 · 이벤트 알림"
            value={m?.push_marketing ?? false}
            onValueChange={(v) => patch({ push_marketing: v })}
            last
          />
        </ListSection>

        {/* 계정 */}
        <ListSection title="계정">
          <ListRow leftIcon="user" title="계정 설정" onPress={comingSoon} />
          <ListRow leftIcon="lock" title="잠금화면 설정" onPress={comingSoon} last />
        </ListSection>

        {/* 지원 */}
        <ListSection title="지원">
          <ListRow leftIcon="mail" title="문의하기" onPress={openSupport} />
          <ListRow title="버전" value={APP_VERSION} showChevron={false} />
          {__DEV__ ? (
            <ListRow title="디자인 시스템" onPress={() => navigation.navigate('StyleGuide')} last />
          ) : null}
        </ListSection>

        {/* 로그아웃 */}
        <Pressable onPress={confirmLogout} className="items-center py-lg active:opacity-60">
          <AppText variant="label" className="text-danger">
            로그아웃
          </AppText>
        </Pressable>
      </ScrollView>

    </View>
  );
}
