/**
 * 설정 화면 — 프로필, 학습 급수 변경, 앱 정보, 로그아웃.
 *
 * 급수 변경은 PATCH /api/auth/me 로 서버에 반영하고 me 캐시를 갱신한다.
 * 로그아웃은 AuthContext.signOut(토큰 삭제 + 상태 전환)으로 RootNavigator가
 * AuthStack 으로 리셋되게 한다(이 화면이 직접 네비게이션하지 않음).
 */
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card } from '../../components';
import { colors } from '../../theme/tokens';
import { useMe, useUpdateProfile } from '../../api/hooks';
import { useAuth } from '../../store/AuthContext';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const APP_VERSION = 'v0.0.1';
// TODO: 실제 약관/개인정보 URL로 교체.
const TERMS_URL = 'https://japavoca.app/terms';
const PRIVACY_URL = 'https://japavoca.app/privacy';

function openLink(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없어요.'));
}

export default function SettingsScreen(): React.JSX.Element {
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerClassName="gap-2xl px-xl py-2xl">
        {/* 프로필 */}
        <View className="gap-md">
          <AppText variant="caption" className="text-text-weak">
            프로필
          </AppText>
          <Card className="rounded-lg gap-xs">
            <AppText variant="title" className="text-text-strong">
              {me.data?.nickname ?? '게스트'}
            </AppText>
            <AppText variant="caption" className="text-text-weak">
              {me.data?.email ?? ''}
            </AppText>
            <View className="mt-sm self-start rounded-pill bg-brand-soft px-md py-xs">
              <AppText variant="caption" className="text-brand">
                Google 계정 연동됨
              </AppText>
            </View>
          </Card>
        </View>

        {/* 학습 설정 */}
        <View className="gap-md">
          <AppText variant="caption" className="text-text-weak">
            학습 설정
          </AppText>
          <Card className="rounded-lg">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => setLevelModal(true)}>
              <AppText variant="body" className="text-text-strong">
                JLPT 급수
              </AppText>
              <AppText variant="body" className="text-brand">
                {me.data?.selected_jlpt_level ?? '미설정'} ›
              </AppText>
            </Pressable>
          </Card>
        </View>

        {/* 앱 정보 */}
        <View className="gap-md">
          <AppText variant="caption" className="text-text-weak">
            앱 정보
          </AppText>
          <Card className="rounded-lg gap-lg">
            <View className="flex-row items-center justify-between">
              <AppText variant="body" className="text-text-strong">
                버전
              </AppText>
              <AppText variant="body" className="text-text-weak">
                {APP_VERSION}
              </AppText>
            </View>
            <Pressable onPress={() => openLink(TERMS_URL)}>
              <AppText variant="body" className="text-text-strong">
                이용약관 ›
              </AppText>
            </Pressable>
            <Pressable onPress={() => openLink(PRIVACY_URL)}>
              <AppText variant="body" className="text-text-strong">
                개인정보처리방침 ›
              </AppText>
            </Pressable>
          </Card>
        </View>

        {/* 로그아웃 */}
        <Pressable className="items-center py-md" onPress={confirmLogout}>
          <AppText variant="body" className="text-danger">
            로그아웃
          </AppText>
        </Pressable>
      </ScrollView>

      {/* 급수 선택 모달 */}
      <Modal
        visible={levelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelModal(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setLevelModal(false)}>
          <Pressable className="rounded-t-xl bg-bg px-xl py-2xl" onPress={() => {}}>
            <AppText variant="title" className="mb-lg text-text-strong">
              JLPT 급수 선택
            </AppText>
            {JLPT_LEVELS.map((level) => {
              const active = level === me.data?.selected_jlpt_level;
              return (
                <Pressable
                  key={level}
                  className="flex-row items-center justify-between py-md"
                  onPress={() => selectLevel(level)}>
                  <AppText
                    variant="body"
                    className={active ? 'text-brand' : 'text-text-strong'}>
                    {level}
                  </AppText>
                  {active && <AppText style={{ color: colors.brand }}>✓</AppText>}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
