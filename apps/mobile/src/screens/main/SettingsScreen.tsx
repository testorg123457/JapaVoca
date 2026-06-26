/**
 * SettingsScreen — 설정.
 *
 * 행+구분선 리스트(카드 X). 실제 동작: 단어/한자 급수(별도), 푸시 토글, 캐시/구매 내역,
 * 알림 화면, 로그아웃. 일부(계정/잠금화면)는 안내 스텁.
 * 비즈니스 로직은 기존 훅(useUpdateProfile/useAuth) 그대로 — 화면은 호출만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon, ListRow, ListSection, StudySelector, Tag, ToggleRow } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile, useUnreadInquiryCount, type ProfileUpdate } from '../../api/hooks';
import { useAuth } from '../../store/AuthContext';
import { isStudyValid, type StudySelection } from '../onboarding/studyContent';
import type { MainStackScreenProps } from '../../navigation/types';

const APP_VERSION = 'v0.0.1';

export default function SettingsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Settings'>['navigation']>();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const unreadInquiry = useUnreadInquiryCount();
  const hasUnreadInquiry = (unreadInquiry.data?.count ?? 0) > 0;
  const { signOut } = useAuth();
  const [studySel, setStudySel] = useState<StudySelection | null>(null);
  const studyInitialized = useRef(false);

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

  function confirmLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
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
            <AppText variant="body" className="text-text-tertiary">
              {m?.is_guest ? '게스트 계정 · 연결하면 교환 가능' : m?.email ?? ''}
            </AppText>
          </View>
          <Tag
            label={m?.provider === 'kakao' ? 'Kakao' : m?.is_guest ? 'Guest' : 'Google'}
            variant={m?.is_guest ? 'amber' : 'neutral'}
          />
        </View>

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
          <ListRow
            leftIcon="user"
            title="계정 설정"
            onPress={() => navigation.navigate('AccountSettings')}
          />
          <ListRow
            leftIcon="lock"
            title="잠금화면 설정"
            onPress={() => navigation.navigate('LockSettings')}
            last
          />
        </ListSection>

        {/* 지원 */}
        <ListSection title="지원">
          <ListRow
            leftIcon="mail"
            title="문의하기"
            onPress={() => navigation.navigate('Inquiry')}
            rightDot={hasUnreadInquiry}
            last
          />
        </ListSection>

        {/* 로그아웃 */}
        <Pressable onPress={confirmLogout} className="items-center py-lg active:opacity-60">
          <AppText variant="subheading" className="text-danger">
            로그아웃
          </AppText>
        </Pressable>

        {/* 버전 — 맨 아래 */}
        <AppText variant="caption" className="text-center text-text-tertiary">
          {APP_VERSION}
        </AppText>
      </ScrollView>

    </View>
  );
}
