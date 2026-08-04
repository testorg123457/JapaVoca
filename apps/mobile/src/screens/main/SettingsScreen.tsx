/**
 * SettingsScreen — 설정 목차.
 *
 * 이 화면은 **무엇을 바꿀지 고르는 목차**다. 실제 조작은 각 하위 화면에서 한다.
 * (조작 항목이 19개라 한 화면에 다 놓으면 쏟아지고, 더 잘게 쪼개면 깊이만 깊어진다.
 *  이 규모에는 "짧은 목차 + 깊이 2단계"가 맞다. 근거는 docs/설정-구조-개선안.md)
 *
 * 묶는 축 = **무엇을 바꾸는가**: 학습 / 앱 / 리워드 / 지원.
 *
 * ⚠️ 프로필 블록이 계정 설정으로 가는 문이다(예전엔 아무 데도 안 가는 장식이었다).
 *    덕분에 "계정" 섹션 한 줄이 통째로 사라졌다.
 * ⚠️ 알림 **목록**은 여기 없다 — 홈 헤더 종(미읽음 뱃지)이 담당한다. 여기 "알림"은 설정만.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon, ListRow, ListSection, PressableScale, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUnreadInquiryCount } from '../../api/hooks';
import { TABS } from '../onboarding/studyContent';
import type { MainStackScreenProps } from '../../navigation/types';

const APP_VERSION = 'v0.0.1';

/**
 * 학습 트랙 요약 — "한자단어 · N3". 아직 안 정했으면 안내로 대체.
 * ⚠️ 가나 트랙은 급수(JLPT)가 없어 모드 이름만 나온다.
 */
function studySummary(m: ReturnType<typeof useMe>['data']): string {
  if (!m?.study_mode) { return '설정 필요'; }
  const mode = TABS.find((t) => t.mode === m.study_mode)?.label ?? m.study_mode;
  return m.study_level ? `${mode} · ${String(m.study_level).toUpperCase()}` : mode;
}

export default function SettingsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Settings'>['navigation']>();
  const me = useMe();
  const unreadInquiry = useUnreadInquiryCount();
  const hasUnreadInquiry = (unreadInquiry.data?.count ?? 0) > 0;

  const m = me.data;

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        {/* 프로필 = 계정 설정 진입점 */}
        <PressableScale
          onPress={() => navigation.navigate('AccountSettings')}
          pressedScale={0.99}
          className="flex-row items-center border-y border-border-tertiary bg-bg-primary px-xl py-lg"
          style={{ gap: 14 }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 52, height: 52, backgroundColor: c['bg-tertiary'] }}>
            <Icon name="user" size={28} color={c['text-secondary']} />
          </View>
          <View className="flex-1 gap-xs">
            <AppText variant="title" className="text-text-primary">
              {m?.nickname || (m?.is_guest ? '게스트' : '이름 없음')}
            </AppText>
            <AppText variant="body" className="text-text-tertiary">
              {m?.is_guest
                ? '게스트 계정 · 연결하면 교환 가능'
                : m?.provider === 'kakao'
                  ? (m.email?.endsWith('@kakao.local') ? '카카오 계정' : (m.email ?? '카카오 계정'))
                  : (m?.email ?? '')}
            </AppText>
          </View>
          <Tag
            label={m?.provider === 'kakao' ? 'Kakao' : m?.is_guest ? 'Guest' : 'Google'}
            variant={m?.is_guest ? 'amber' : 'neutral'}
          />
          <Icon name="chevron-right" size={20} color={c['text-tertiary']} strokeWidth={2.2} />
        </PressableScale>

        <ListSection title="학습">
          <ListRow
            leftIcon="book"
            title="학습 트랙"
            value={studySummary(m)}
            showChevron
            onPress={() => navigation.navigate('StudySettings')}
          />
          <ListRow
            leftIcon="lock"
            title="잠금화면 학습"
            onPress={() => navigation.navigate('LockSettings')}
            last
          />
        </ListSection>

        <ListSection title="앱">
          <ListRow
            leftIcon="bell"
            title="알림"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <ListRow
            leftIcon="sparkles"
            title="화면 · 소리"
            onPress={() => navigation.navigate('DisplaySettings')}
            last
          />
        </ListSection>

        <ListSection title="리워드">
          <ListRow leftIcon="wallet" title="캐시 내역" onPress={() => navigation.navigate('Ledger')} />
          <ListRow
            leftIcon="gift"
            title="기프티콘 보관함"
            onPress={() => navigation.navigate('GifticonWallet')}
          />
          <ListRow
            leftIcon="user"
            title="친구 초대"
            onPress={() => navigation.navigate('Referral')}
            last
          />
        </ListSection>

        <ListSection title="지원">
          <ListRow
            leftIcon="mail"
            title="문의하기"
            onPress={() => navigation.navigate('Inquiry')}
            rightDot={hasUnreadInquiry}
            last
          />
        </ListSection>

        <AppText variant="caption" className="text-center text-text-tertiary">
          {APP_VERSION}
        </AppText>
      </ScrollView>
    </View>
  );
}
