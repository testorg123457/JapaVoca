/**
 * NotificationSettingsScreen — 알림 설정(푸시 토글).
 *
 * ⚠️ 알림 **목록**은 여기 없다(`Notifications` 화면, 홈 헤더 종으로 진입).
 *    예전엔 설정의 "알림" 섹션 안에 *보기*(이동)와 *설정*(토글)이 섞여 있었다.
 *    이 화면은 **바꾸는 것만** 담는다.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, ListSection, ToggleRow, useToast } from '../../components';
import { useMe, useUpdateProfile, type ProfileUpdate } from '../../api/hooks';

export default function NotificationSettingsScreen(): React.JSX.Element {
  const { showToast } = useToast();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const m = me.data;

  const patch = (data: ProfileUpdate) =>
    updateProfile.mutate(data, { onError: () => showToast('설정을 저장하지 못했어요', 'error') });

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="알림" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        <ListSection>
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

        <View className="px-xl">
          <AppText variant="caption" className="text-text-tertiary">
            받은 알림은 홈 상단 종 아이콘에서 볼 수 있어요.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
