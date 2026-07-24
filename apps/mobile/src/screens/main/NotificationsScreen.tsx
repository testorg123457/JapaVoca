/**
 * NotificationsScreen — 인앱 알림 목록.
 *
 * 항목 탭 → 읽음 처리 + data.screen 있으면 해당 화면 이동.
 * 백엔드 /api/notifications/ (읽기 + 읽음 처리만, 캐시 무관).
 *
 * 구조: 큰 "알림" 타이틀 + "새로운 알림 / 지난 알림" 두 섹션. 날짜는 섹션이 아니라
 * 각 행의 서브텍스트로 둔다(이번 방문의 새 알림을 위로 묶어 보여주는 게 목적이라,
 * 날짜별 섹션보다 '새/지난' 구분이 이 화면엔 더 맞다).
 * 미읽음 표시는 행 점이 아니라 섹션 + 아이콘 칩 색으로만 낸다(점이 중복이라 뺌).
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Icon } from '../../components';
import type { IconName } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { sectionTitle } from '../../lib/dateSections';
import {
  useMarkAllRead,
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
  referral: 'user',
  inquiry: 'mail',
  quiz_reminder: 'book',
  system: 'bell',
};

/** data.screen 이 이동 가능한 라우트일 때만 네비게이트. */
const NAVIGABLE: (keyof MainStackParamList)[] = [
  'Home', 'LockQuiz', 'Kana', 'Settings', 'Exchange', 'Ledger', 'AccountSettings', 'Inquiry',
];

function Row({
  item,
  unread,
  onPress,
}: {
  item: NotificationItem;
  unread: boolean;
  onPress: (item: NotificationItem) => void;
}) {
  const c = useThemeColors();
  // 새 알림은 브랜드 틴트 칩(활성색), 지난 알림은 중립 회색 칩.
  const chipBg = unread ? c['brand-subtle'] : c['bg-tertiary'];
  const iconColor = unread ? c.brand : c['text-tertiary'];
  return (
    <Pressable
      onPress={() => onPress(item)}
      className="flex-row items-start bg-bg-secondary px-xl py-lg active:opacity-70"
      style={{ gap: 14 }}>
      <View
        className="items-center justify-center"
        style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: chipBg }}>
        <Icon name={TYPE_ICON[item.type]} size={22} color={iconColor} />
      </View>

      <View className="flex-1" style={{ gap: 3, paddingTop: 1 }}>
        <AppText variant="subheading" className="text-text-primary" numberOfLines={2}>
          {item.title}
        </AppText>
        {item.body ? (
          <AppText variant="caption" className="text-text-secondary" numberOfLines={2}>
            {item.body}
          </AppText>
        ) : null}
        <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 1 }}>
          {sectionTitle(item.created_at)}
        </AppText>
      </View>
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="bg-bg-secondary px-xl pb-md pt-xl">
      <AppText variant="label" className="text-text-tertiary">
        {title}
      </AppText>
    </View>
  );
}

type NotifSection = { title: string; data: NotificationItem[] };

export default function NotificationsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Notifications'>['navigation']>();
  const list = useNotifications();
  const markAllRead = useMarkAllRead();

  const items = list.data?.pages.flatMap((p) => p.results) ?? [];

  /**
   * 화면에 들어오면 전부 읽음 처리한다(홈 뱃지를 비우는 게 목적).
   *
   * 다만 화면에서는 이번에 처음 본 알림을 '새로운 알림'으로 계속 묶는다 — 서버 상태를
   * 따라 즉시 '지난'으로 내려가면 뭐가 새 알림이었는지 알 수 없기 때문. 그래서 진입
   * 시점의 미읽음 id를 스냅샷으로 잡아 두고 표시(섹션 분류)에만 쓴다.
   */
  const seenUnreadRef = useRef<Set<number> | null>(null);
  if (seenUnreadRef.current === null && items.length > 0) {
    seenUnreadRef.current = new Set(items.filter((n) => !n.is_read).map((n) => n.id));
  }
  const markAllReadMutate = markAllRead.mutate;
  const loaded = items.length > 0;
  useEffect(() => {
    if ((seenUnreadRef.current?.size ?? 0) > 0) {
      markAllReadMutate();
    }
    // 진입 1회만 — items가 늘어도(페이지네이션) 다시 부르지 않는다.
  }, [loaded, markAllReadMutate]);

  /** 이번 방문에서 '새 알림'으로 보여줄지. 서버가 읽음으로 바뀌어도 유지된다. */
  const looksUnread = (id: number) => seenUnreadRef.current?.has(id) ?? false;

  // 서버가 최신순을 보장하므로 각 그룹은 순서를 그대로 유지한다.
  const fresh = items.filter((n) => looksUnread(n.id));
  const past = items.filter((n) => !looksUnread(n.id));
  const sections: NotifSection[] = [];
  if (fresh.length > 0) sections.push({ title: '새로운 알림', data: fresh });
  if (past.length > 0) sections.push({ title: '지난 알림', data: past });

  function handlePress(item: NotificationItem) {
    // 읽음 처리는 진입 시 일괄로 끝났으므로 여기선 이동만 담당한다.
    const screen = item.data?.screen;
    if (typeof screen === 'string' && (NAVIGABLE as string[]).includes(screen)) {
      navigation.navigate(screen as keyof MainStackParamList as never);
    }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      {/* 큰 타이틀은 본문 상단에 두므로 헤더는 뒤로가기만 담당한다. */}
      <AppHeader showBack />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Row item={item} unread={looksUnread(item.id)} onPress={handlePress} />
        )}
        renderSectionHeader={({ section }) => <SectionLabel title={section.title} />}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="px-xl pb-sm pt-lg">
            <AppText variant="hero" className="text-text-primary">
              알림
            </AppText>
          </View>
        }
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
