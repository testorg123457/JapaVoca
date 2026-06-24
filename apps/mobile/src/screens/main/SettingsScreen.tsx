/**
 * 설정 화면 — 프로필, 학습 급수 변경, 앱 정보, 로그아웃.
 *
 * 급수 변경은 PATCH /api/auth/me 로 서버에 반영하고 me 캐시를 갱신한다.
 * 로그아웃은 AuthContext.signOut(토큰 삭제 + 상태 전환)으로 RootNavigator가
 * AuthStack 으로 리셋되게 한다(이 화면이 직접 네비게이션하지 않음).
 *
 * 디자인: 아바타가 있는 프로필 카드 + 아이콘/쉐브론이 달린 설정 리스트 행 + 바텀시트.
 */
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText, Card, Icon, Tag, type IconName } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile } from '../../api/hooks';
import { useAuth } from '../../store/AuthContext';
import type { BottomTabScreenPropsFor } from '../../navigation/types';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const APP_VERSION = 'v0.0.1';
// TODO: 실제 약관/개인정보 URL로 교체.
const TERMS_URL = 'https://japavoca.app/terms';
const PRIVACY_URL = 'https://japavoca.app/privacy';

function openLink(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없어요.'));
}

/** 섹션 제목(작은 라벨). */
function GroupLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" className="text-text-tertiary ml-xs">
      {children}
    </AppText>
  );
}

/** 설정 리스트 행 — 좌측 아이콘 + 라벨 + 우측(값/쉐브론). */
function Row({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  danger = false,
  isLast = false,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
  isLast?: boolean;
}) {
  const c = useThemeColors();
  const labelColor = danger ? 'text-danger' : 'text-text-primary';
  const iconColor = danger ? c.danger : c['text-secondary'];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center justify-between py-lg ${onPress ? 'active:opacity-60' : ''} ${
        isLast ? '' : 'border-b border-border-tertiary'
      }`}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {icon ? <Icon name={icon} size={20} color={iconColor} /> : null}
        <AppText variant="body" className={labelColor}>
          {label}
        </AppText>
      </View>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        {value ? (
          <AppText variant="body" className="text-text-tertiary">
            {value}
          </AppText>
        ) : null}
        {showChevron && onPress ? (
          <Icon name="chevron-right" size={18} color={c['text-tertiary']} strokeWidth={2.2} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<BottomTabScreenPropsFor<'Settings'>['navigation']>();
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

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top']}>
      <ScrollView contentContainerClassName="gap-2xl px-xl py-2xl" showsVerticalScrollIndicator={false}>
        {/* 프로필 */}
        <Card className="flex-row items-center" style={{ gap: 14 }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 56, height: 56, backgroundColor: c['brand-subtle'] }}>
            <Icon name="user" size={30} color={c.brand} />
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
        </Card>

        {/* 학습 설정 */}
        <View className="gap-md">
          <GroupLabel>학습 설정</GroupLabel>
          <Card variant="flat" className="py-sm">
            <Row
              icon="book"
              label="JLPT 급수"
              value={me.data?.selected_jlpt_level ?? '미설정'}
              onPress={() => setLevelModal(true)}
              isLast
            />
          </Card>
        </View>

        {/* 앱 정보 */}
        <View className="gap-md">
          <GroupLabel>앱 정보</GroupLabel>
          <Card variant="flat" className="py-sm">
            <Row icon="shield" label="버전" value={APP_VERSION} showChevron={false} />
            <Row icon="document" label="이용약관" onPress={() => openLink(TERMS_URL)} />
            <Row icon="document" label="개인정보처리방침" onPress={() => openLink(PRIVACY_URL)} isLast />
          </Card>
        </View>

        {/* 개발자 (DEBUG 전용) */}
        {__DEV__ && (
          <View className="gap-md">
            <GroupLabel>개발자</GroupLabel>
            <Card variant="flat" className="py-sm">
              <Row
                icon="sparkles"
                label="디자인 시스템"
                onPress={() => navigation.navigate('StyleGuide')}
                isLast
              />
            </Card>
          </View>
        )}

        {/* 로그아웃 */}
        <View className="gap-md">
          <Card variant="flat" className="py-sm">
            <Row icon="logout" label="로그아웃" onPress={confirmLogout} showChevron={false} danger isLast />
          </Card>
        </View>
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
    </SafeAreaView>
  );
}
