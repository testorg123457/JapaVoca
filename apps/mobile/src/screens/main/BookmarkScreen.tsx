import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppHeader, AppText, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { getBookmarks, toggleBookmark, type BookmarkItem } from '../../api/quiz';
import PressableScale from '../../components/PressableScale';

const ITEM_TYPE_LABEL: Record<string, string> = {
  kanji: '한자',
  word: '단어',
  kana: '가나',
};

function BookmarkRow({
  item,
  onRemove,
}: {
  item: BookmarkItem;
  onRemove: (item: BookmarkItem) => void;
}): React.JSX.Element {
  const c = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c['border-tertiary'],
        backgroundColor: c['bg-primary'],
      }}>
      {/* 타입 뱃지 */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: c['brand-subtle'],
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <AppText variant="micro" style={{ color: c.brand, fontWeight: '700' }}>
          {ITEM_TYPE_LABEL[item.item_type] ?? item.item_type}
        </AppText>
      </View>

      {/* 내용 */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
          <AppText variant="heading" style={{ color: c['text-primary'] }}>
            {item.surface}
          </AppText>
          {item.reading ? (
            <AppText variant="body" style={{ color: c['text-tertiary'] }}>
              {item.reading}
            </AppText>
          ) : null}
          {item.jlpt_level ? (
            <AppText variant="micro" style={{ color: c['text-tertiary'] }}>
              {item.jlpt_level}
            </AppText>
          ) : null}
        </View>
        {item.meaning ? (
          <AppText variant="body" style={{ color: c['text-secondary'] }} numberOfLines={1}>
            {item.meaning}
          </AppText>
        ) : null}
      </View>

      {/* 북마크 해제 버튼 — 활성 북마크 = amber (퀴즈/복습 화면과 통일) */}
      <PressableScale onPress={() => onRemove(item)} hitSlop={10}>
        <Icon name="bookmark-filled" size={22} color={c.amber} />
      </PressableScale>
    </View>
  );
}

export default function BookmarkScreen(): React.JSX.Element {
  const c = useThemeColors();

  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getBookmarks()
        .then(setItems)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  async function handleRemove(item: BookmarkItem) {
    setItems(prev => prev.filter(i => !(i.item_type === item.item_type && i.item_id === item.item_id)));
    try {
      await toggleBookmark(item.item_type, item.item_id, false);
    } catch {
      // 실패 시 복원
      setItems(prev => [item, ...prev]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c['bg-secondary'] }}>
      <AppHeader title="북마크" showBack />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Icon name="bookmark" size={48} color={c['text-tertiary']} />
          <AppText variant="body" style={{ color: c['text-tertiary'] }}>
            북마크한 항목이 없어요
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => `${i.item_type}-${i.item_id}`}
          renderItem={({ item }) => <BookmarkRow item={item} onRemove={handleRemove} />}
          contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
        />
      )}
    </View>
  );
}
