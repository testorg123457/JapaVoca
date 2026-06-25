/**
 * SettingsScreen — 설정.
 *
 * 행+구분선 리스트(카드 X). 실제 동작: 단어/한자 급수(별도), 푸시 토글, 캐시/구매 내역,
 * 알림 화면, 로그아웃. 일부(계정/잠금화면)는 안내 스텁.
 * 비즈니스 로직은 기존 훅(useUpdateProfile/useAuth) 그대로 — 화면은 호출만.
 */
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon, ListRow, ListSection, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile, type ProfileUpdate } from '../../api/hooks';
import { useAuth } from '../../store/AuthContext';
import type { MainStackScreenProps } from '../../navigation/types';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const APP_VERSION = 'v0.0.1';
const SUPPORT_MAIL = 'mailto:support@japavoca.app?subject=[JapaVoca]%20문의';

type LevelTarget = 'jlpt_level_word' | 'jlpt_level_kanji' | null;

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
  const { signOut } = useAuth();
  const [levelTarget, setLevelTarget] = useState<LevelTarget>(null);

  const patch = (data: ProfileUpdate) =>
    updateProfile.mutate(data, { onError: () => Alert.alert('오류', '설정 변경에 실패했어요.') });

  function selectLevel(level: string) {
    const target = levelTarget;
    setLevelTarget(null);
    if (target) {
      patch({ [target]: level });
    }
  }

  function confirmLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  }

  function openSupport() {
    Linking.openURL(SUPPORT_MAIL).catch(() =>
      Alert.alert('문의하기', 'support@japavoca.app 로 문의해주세요.'),
    );
  }

  const m = me.data;

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
              {m?.email ?? ''}
            </AppText>
          </View>
          <Tag label={m?.provider === 'kakao' ? 'Kakao' : 'Google'} variant="neutral" />
        </View>

        {/* 학습 — 단어/한자 급수 별도 */}
        <ListSection title="학습 급수">
          <ListRow
            leftIcon="book"
            title="단어 급수"
            value={m?.jlpt_level_word ?? '미설정'}
            onPress={() => setLevelTarget('jlpt_level_word')}
            showChevron
          />
          <ListRow
            leftIcon="pencil"
            title="한자 급수"
            value={m?.jlpt_level_kanji ?? '미설정'}
            onPress={() => setLevelTarget('jlpt_level_kanji')}
            showChevron
            last
          />
        </ListSection>

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

      {/* 급수 선택 바텀시트 (단어/한자 공용) */}
      <Modal
        visible={levelTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelTarget(null)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(15,18,22,0.55)' }}
          onPress={() => setLevelTarget(null)}>
          <Pressable className="rounded-t-xl bg-bg-primary px-xl pb-3xl pt-lg" onPress={() => {}}>
            <View className="mb-lg items-center">
              <View className="h-1 w-10 rounded-full bg-bg-tertiary" />
            </View>
            <AppText variant="title" className="mb-md text-text-primary">
              {levelTarget === 'jlpt_level_kanji' ? '한자' : '단어'} 급수 선택
            </AppText>
            {JLPT_LEVELS.map((level, i) => {
              const current =
                levelTarget === 'jlpt_level_kanji' ? m?.jlpt_level_kanji : m?.jlpt_level_word;
              const active = level === current;
              return (
                <Pressable
                  key={level}
                  className={`flex-row items-center justify-between py-lg active:opacity-60 ${
                    i === JLPT_LEVELS.length - 1 ? '' : 'border-b border-border-tertiary'
                  }`}
                  onPress={() => selectLevel(level)}>
                  <AppText variant="subheading" className={active ? 'text-brand' : 'text-text-primary'}>
                    {level}
                  </AppText>
                  {active && <Icon name="check" size={20} color={c.brand} strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
