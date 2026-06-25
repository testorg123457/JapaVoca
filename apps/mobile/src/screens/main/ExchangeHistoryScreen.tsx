/**
 * ExchangeHistoryScreen — 구매(기프티콘 교환) 내역. (설정 > 구매 내역)
 *
 * 백엔드 GET /api/exchange/history/ (이미 존재) + useExchangeHistory(무한). 읽기 전용.
 * 상품명은 products 목록으로 code→name 매핑(없으면 code 표시).
 */
import React from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AppHeader, AppText, Icon, Tag } from '../../components';
import type { TagProps } from '../../components';
import { yellow } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useExchangeHistory,
  useProducts,
  type GiftExchange,
  type GiftExchangeStatus,
} from '../../api/exchange';

const STATUS_LABEL: Record<GiftExchangeStatus, string> = {
  requested: '처리 중',
  issued: '완료',
  failed: '실패',
  refunded: '환불됨',
};

const STATUS_VARIANT: Record<GiftExchangeStatus, TagProps['variant']> = {
  requested: 'neutral',
  issued: 'success',
  failed: 'danger',
  refunded: 'neutral',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExchangeHistoryScreen(): React.JSX.Element {
  const c = useThemeColors();
  const history = useExchangeHistory();
  const products = useProducts();

  const nameOf = (code: string) =>
    products.data?.find((p) => p.code === code)?.name ?? code;

  const items = history.data?.pages.flatMap((p) => p.results) ?? [];

  const renderItem = ({ item }: { item: GiftExchange }) => (
    <View className="flex-row items-center justify-between border-b border-border-tertiary bg-bg-primary px-xl py-md">
      <View className="flex-1 gap-xs">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <AppText variant="subheading" className="text-text-primary">
            {nameOf(item.product_code)}
          </AppText>
          <Tag label={STATUS_LABEL[item.status]} variant={STATUS_VARIANT[item.status]} />
        </View>
        <AppText variant="caption" className="text-text-tertiary">
          {formatDate(item.created_at)}
        </AppText>
      </View>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Icon name="coin" size={15} color={yellow[400]} />
        <AppText variant="label" className="text-text-primary">
          {item.cash_cost.toLocaleString()}C
        </AppText>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="구매 내역" showBack />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) {
            history.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          history.isLoading ? (
            <ActivityIndicator className="mt-2xl" color={c.brand} />
          ) : (
            <View className="mt-2xl items-center gap-sm px-xl">
              <Icon name="gift" size={28} color={c['text-tertiary']} />
              <AppText variant="caption" className="text-center text-text-tertiary">
                아직 구매 내역이 없어요.
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          history.isFetchingNextPage ? <ActivityIndicator className="my-lg" color={c.brand} /> : null
        }
      />
    </View>
  );
}
