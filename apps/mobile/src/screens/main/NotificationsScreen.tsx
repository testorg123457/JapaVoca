/**
 * NotificationsScreen — 인앱 알림 목록.
 *
 * 항목 탭 → 읽음 처리 + data.screen 있으면 해당 화면 이동.
 * 백엔드 /api/notifications/ (읽기 + 읽음 처리만, 캐시 무관).
 *
 * 구조: "새로운 알림 / 지난 알림" 두 섹션. 날짜별로 자르지 않는 이유는, 이 화면의 일은
 * '이번에 뭐가 새로 왔나'를 보여주는 것이기 때문.
 *
 * 디자인 — 캐시 내역과 같은 목록 언어(풀폭 행 + 헤어라인 + LogSectionHeader)를 쓰되,
 * 한 가지가 다르다: **여기선 아이콘이 정보다.** 상자·교환·문의는 종류가 실제 구분이라
 * 칩을 남긴다(내역 화면은 부호가 그 일을 하므로 뺐다). 칩 색은 종류가 아니라 **읽음
 * 여부**를 말한다 — 종류마다 색을 칠하면 장식이 된다(원칙 §2).
 * 시각은 본문 아래가 아니라 제목 오른쪽에 둔다. 눈이 제일 먼저 훑는 줄이라 거기서 읽힌다.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, EmptyState, Icon, LogSectionHeader } from '../../components';
import type { IconName } from '../../components';
import { radius } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { relativeTime } from '../../lib/dateSections';
import {
  useMarkAllRead,
  useNotifications,
  type NotificationItem,
  type NotificationType,
} from '../../api/notifications';
import type { MainStackScreenProps, MainStackParamList } from '../../navigation/types';

const TYPE_ICON: Record<NotificationType, IconName> = {
  box: 'gift',
  exchange: 'store',
  referral: 'user',
  inquiry: 'mail',
  quiz_reminder: 'book',
  system: 'bell',
};

/** data.screen 이 이동 가능한 라우트일 때만 네비게이트. */
const NAVIGABLE: (keyof MainStackParamList)[] = [
  'Home', 'LockQuiz', 'Kana', 'Settings', 'Exchange', 'Ledger', 'AccountSettings', 'Inquiry',
];

/** 이 알림을 눌러서 갈 곳이 있는지. 없으면 눌림 반응도 주지 않는다(빈 약속 금지). */
function targetScreen(item: NotificationItem): keyof MainStackParamList | null {
  const screen = item.data?.screen;
  return typeof screen === 'string' && (NAVIGABLE as string[]).includes(screen)
    ? (screen as keyof MainStackParamList)
    : null;
}

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
  const navigable = targetScreen(item) !== null;
  return (
    <Pressable
      onPress={() => onPress(item)}
      disabled={!navigable}
      className={`flex-row items-start border-b border-border-tertiary bg-bg-primary px-xl ${
        navigable ? 'active:opacity-60' : ''
      }`}
      style={{ gap: 13, paddingVertical: 14 }}>
      <View
        className="items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: chipBg }}>
        <Icon name={TYPE_ICON[item.type]} size={21} color={iconColor} />
      </View>

      <View className="flex-1" style={{ paddingTop: 1 }}>
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <AppText
            variant="heading"
            className={`flex-1 ${unread ? 'text-text-primary' : 'text-text-secondary'}`}
            numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 3 }}>
            {relativeTime(item.created_at)}
          </AppText>
        </View>
        {item.body ? (
          <AppText
            variant="body"
            className={unread ? 'text-text-secondary' : 'text-text-tertiary'}
            numberOfLines={2}
            style={{ marginTop: 3 }}>
            {item.body}
          </AppText>
        ) : null}
      </View>
    </Pressable>
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
    const screen = targetScreen(item);
    if (screen) {
      navigation.navigate(screen as never);
    }
  }

  return (
    <View className="flex-1 bg-bg-primary">
      <AppHeader title="알림" showBack />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Row item={item} unread={looksUnread(item.id)} onPress={handlePress} />
        )}
        renderSectionHeader={({ section }) => (
          <LogSectionHeader title={section.title} first={section === sections[0]} />
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) {
            list.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator style={{ marginTop: 72 }} color={c.brand} />
          ) : (
            <EmptyState
              icon="bell"
              title="알림이 없어요"
              description="상자·기프티콘 소식이 도착하면 여기에 모여요."
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator className="my-lg" color={c.brand} /> : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
