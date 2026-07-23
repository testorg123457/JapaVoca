/**
 * NotificationsScreen — 인앱 알림 목록.
 *
 * 항목 탭 → 읽음 처리 + data.screen 있으면 해당 화면 이동. 상단 "모두 읽음".
 * 백엔드 /api/notifications/ (읽기 + 읽음 처리만, 캐시 무관).
 *
 * 목록 규칙은 캐시 내역(LedgerScreen)과 맞춘다 — 날짜별 섹션으로 끊고, 행에는 시간만
 * 둔다. 날짜를 행마다 반복하면 같은 글자가 계속 눈에 들어와 목록이 빽빽해 보인다.
 * 미읽음은 아이콘 색 + 점 두 가지로만 표시한다(행 전체를 칠하면 연속될 때 답답해짐).
 */
import React from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon } from '../../components';
import type { IconName } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { formatTime, groupByDate } from '../../lib/dateSections';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  type NotificationItem,
  type NotificationType,
} from '../../api/notifications';
import type { MainStackScreenProps, MainStackParamList } from '../../navigation/types';

const TYPE_ICON: Record<NotificationType, IconName> = {
  attendance: 'calendar',
  streak: 'flame',
  box: 'gift',
  exchange: 'gift',
  quiz_reminder: 'book',
  system: 'bell',
};

/** data.screen 이 이동 가능한 라우트일 때만 네비게이트. */
const NAVIGABLE: (keyof MainStackParamList)[] = [
  'Home', 'LockQuiz', 'Kana', 'Settings', 'Exchange', 'Ledger',
];

function Row({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}) {
  const c = useThemeColors();
  const accent = item.is_read ? c['text-tertiary'] : c.brand;
  return (
    <Pressable
      onPress={() => onPress(item)}
      className="flex-row items-center border-b border-border-tertiary bg-bg-primary px-xl py-lg active:opacity-70"
      style={{ gap: 12 }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: `${accent}1A` }}>
        <Icon name={TYPE_ICON[item.type]} size={20} color={accent} />
      </View>

      <View className="flex-1 gap-xs">
        <AppText variant="subheading" className="text-text-primary" numberOfLines={1}>
          {item.title}
        </AppText>
        {item.body ? (
          <AppText variant="caption" className="text-text-secondary" numberOfLines={2}>
            {item.body}
          </AppText>
        ) : null}
      </View>

      {/* 우측: 시간 + 미읽음 점. 날짜는 섹션 헤더가 담당한다. */}
      <View className="items-end" style={{ gap: 6 }}>
        <AppText variant="caption" className="text-text-tertiary">
          {formatTime(item.created_at)}
        </AppText>
        {!item.is_read && (
          <View className="rounded-full" style={{ width: 7, height: 7, backgroundColor: c.brand }} />
        )}
      </View>
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="bg-bg-secondary px-xl pb-sm pt-xl">
      <AppText variant="label" className="text-text-tertiary">
        {title}
      </AppText>
    </View>
  );
}

export default function NotificationsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Notifications'>['navigation']>();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = list.data?.pages.flatMap((p) => p.results) ?? [];
  const sections = groupByDate(items, (n) => n.created_at);
  const hasUnread = items.some((n) => !n.is_read);

  function handlePress(item: NotificationItem) {
    if (!item.is_read) {
      markRead.mutate(item.id);
    }
    const screen = item.data?.screen;
    if (typeof screen === 'string' && (NAVIGABLE as string[]).includes(screen)) {
      navigation.navigate(screen as keyof MainStackParamList as never);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader
        title="알림"
        showBack
        right={
          // 읽을 게 없으면 액션도 없앤다 — 눌러도 아무 일 없는 버튼을 두지 않는다.
          hasUnread ? (
            <Pressable onPress={() => markAllRead.mutate()} hitSlop={8} className="active:opacity-60">
              <AppText variant="label" style={{ color: c['on-header'] }}>
                모두 읽음
              </AppText>
            </Pressable>
          ) : undefined
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <Row item={item} onPress={handlePress} />}
        renderSectionHeader={({ section }) => <SectionLabel title={section.title} />}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) {
            list.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator className="mt-2xl" color={c.brand} />
          ) : (
            <View className="mt-2xl items-center gap-sm px-xl">
              <Icon name="bell" size={28} color={c['text-tertiary']} />
              <AppText variant="caption" className="text-center text-text-tertiary">
                알림이 없어요.
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator className="my-lg" color={c.brand} /> : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
