/**
 * NotificationsScreen — 인앱 알림 목록.
 *
 * 미읽음은 점/배경으로 구분. 항목 탭 → 읽음 처리 + data.screen 있으면 해당 화면 이동.
 * 상단 "모두 읽음". 백엔드 /api/notifications/ (읽기 + 읽음 처리만, 캐시 무관).
 */
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon } from '../../components';
import type { IconName } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
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
  'Home', 'LockQuiz', 'Kana', 'Attendance', 'Settings', 'Exchange', 'Ledger', 'ExchangeHistory',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
      className="flex-row items-start border-b border-border-tertiary px-xl py-md active:opacity-70"
      style={{ gap: 12, backgroundColor: item.is_read ? c['bg-primary'] : c['brand-subtle'] }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 38, height: 38, backgroundColor: `${accent}1A` }}>
        <Icon name={TYPE_ICON[item.type]} size={18} color={accent} />
      </View>
      <View className="flex-1 gap-xs">
        <AppText variant="subheading" className="text-text-primary">
          {item.title}
        </AppText>
        {item.body ? (
          <AppText variant="caption" className="text-text-secondary">
            {item.body}
          </AppText>
        ) : null}
        <AppText variant="micro" className="text-text-tertiary">
          {formatDate(item.created_at)}
        </AppText>
      </View>
      {!item.is_read && (
        <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: c.brand, marginTop: 6 }} />
      )}
    </Pressable>
  );
}

export default function NotificationsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Notifications'>['navigation']>();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = list.data?.pages.flatMap((p) => p.results) ?? [];

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
          <Pressable onPress={() => markAllRead.mutate()} hitSlop={8} className="active:opacity-60">
            <AppText variant="label" style={{ color: c['on-header'] }}>
              모두 읽음
            </AppText>
          </Pressable>
        }
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <Row item={item} onPress={handlePress} />}
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
      />
    </View>
  );
}
