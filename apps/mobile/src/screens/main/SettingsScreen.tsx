/**
 * SettingsScreen — 설정 (헤더 우측 버튼으로 진입).
 *
 * 박스 카드 대신 행(row)+구분선 리스트(ListSection/ListRow). 각 항목: 아이콘 + 라벨 + 화살표.
 * 난이도(급수)·내역은 실제 동작(기존 훅 연결), 나머지(알림/계정/잠금화면/문의)는 일단 진입/안내만.
 *
 * 급수 변경 PATCH /api/auth/me, 로그아웃 AuthContext.signOut(토큰 삭제 + AuthStack 리셋).
 * 비즈니스 로직은 기존 훅 그대로 — 화면은 호출만.
 */
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon, ListRow, ListSection, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile } from '../../api/hooks';
import { useAuth } from '../../store/AuthContext';
import type { MainStackScreenProps } from '../../navigation/types';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const APP_VERSION = 'v0.0.1';
const SUPPORT_MAIL = 'mailto:support@japavoca.app';

function comingSoon() {
  Alert.alert('준비 중', '곧 제공될 기능이에요.');
}

export default function SettingsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Settings'>['navigation']>();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const { signOut } = useAuth();
  const [levelModal, setLevelModal] = useState(false);

  function selectLevel(level: string) {
    setLevelModal(false);
    if (level !== me.data?.selected_jlpt_level) {
      updateProfile.mutate(
        { selected_jlpt_level: level },
        { onError: () => Alert.alert('오류', '급수 변경에 실패했어요.') },
      );
    }
  }

  function confirmLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  }

  function openSupport() {
    Linking.openURL(SUPPORT_MAIL).catch(() => Alert.alert('문의하기', 'support@japavoca.app 로 문의해주세요.'));
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 프로필 — 풀폭 흰 면 */}
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
              {me.data?.nickname ?? '게스트'}
            </AppText>
            <AppText variant="caption" className="text-text-tertiary">
              {me.data?.email ?? ''}
            </AppText>
          </View>
          <Tag label="Google" variant="neutral" />
        </View>

        {/* 학습 */}
        <ListSection title="학습">
          <ListRow
            leftIcon="book"
            title="난이도 설정 (JLPT 급수)"
            value={me.data?.selected_jlpt_level ?? '미설정'}
            onPress={() => setLevelModal(true)}
            showChevron
            last
          />
        </ListSection>

        {/* 캐시 */}
        <ListSection title="캐시">
          <ListRow
            leftIcon="wallet"
            title="캐시 내역"
            onPress={() => navigation.navigate('Ledger')}
            last
          />
        </ListSection>

        {/* 알림 · 계정 */}
        <ListSection title="알림 · 계정">
          <ListRow leftIcon="bell" title="알림" onPress={comingSoon} />
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

      {/* 급수 선택 바텀시트 */}
      <Modal
        visible={levelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelModal(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(15,18,22,0.55)' }}
          onPress={() => setLevelModal(false)}>
          <Pressable className="rounded-t-xl bg-bg-primary px-xl pb-3xl pt-lg" onPress={() => {}}>
            <View className="mb-lg items-center">
              <View className="h-1 w-10 rounded-full bg-bg-tertiary" />
            </View>
            <AppText variant="title" className="mb-md text-text-primary">
              JLPT 급수 선택
            </AppText>
            {JLPT_LEVELS.map((level, i) => {
              const active = level === me.data?.selected_jlpt_level;
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
