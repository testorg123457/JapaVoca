/**
 * 설정 화면 — 프로필, 학습 급수 변경, 앱 정보, 로그아웃.
 *
 * 급수 변경은 PATCH /api/auth/me 로 서버에 반영하고 me 캐시를 갱신한다.
 * 로그아웃은 AuthContext.signOut(토큰 삭제 + 상태 전환)으로 RootNavigator가
 * AuthStack 으로 리셋되게 한다(이 화면이 직접 네비게이션하지 않음).
 *
 * 디자인(알라미식): 박스 카드 대신 풀폭 흰 면 + 헤어라인 구분선 리스트(ListSection/
 * ListRow). 진입 항목엔 `>`, 값 표시형엔 값만. 로그아웃은 하단 단독·텍스트 위주로 절제.
 */
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText, Icon, ListRow, ListSection, Tag } from '../../components';
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
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 프로필 — 풀폭 흰 면(과한 라운드/그림자 없이) */}
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

        {/* 학습 설정 */}
        <ListSection title="학습 설정">
          <ListRow
            title="JLPT 급수"
            value={me.data?.selected_jlpt_level ?? '미설정'}
            onPress={() => setLevelModal(true)}
            last
          />
        </ListSection>

        {/* 앱 정보 */}
        <ListSection title="앱 정보">
          <ListRow title="버전" value={APP_VERSION} showChevron={false} />
          <ListRow title="이용약관" onPress={() => openLink(TERMS_URL)} />
          <ListRow title="개인정보처리방침" onPress={() => openLink(PRIVACY_URL)} last />
        </ListSection>

        {/* 개발자 (DEBUG 전용) */}
        {__DEV__ && (
          <ListSection title="개발자">
            <ListRow title="디자인 시스템" onPress={() => navigation.navigate('StyleGuide')} last />
          </ListSection>
        )}

        {/* 로그아웃 — 하단 단독, 텍스트 위주로 절제(danger는 텍스트에만) */}
        <Pressable
          onPress={confirmLogout}
          className="items-center py-lg active:opacity-60">
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
    </SafeAreaView>
  );
}
