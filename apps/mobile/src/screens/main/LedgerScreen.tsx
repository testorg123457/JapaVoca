/**
 * LedgerScreen — 캐시 사용/적립 내역 (설정 > 내역에서 진입).
 *
 * 원장(ledger) 무한 스크롤. 잔액·내역은 서버가 단일 진실원. 적립=success↑ / 사용=danger↓.
 * 비즈니스 로직은 기존 useLedger 훅 그대로 연결(읽기만).
 */
import React from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AppHeader, AppText, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useLedger, type LedgerEntry, type LedgerReason } from '../../api/hooks';

const REASON_LABEL: Record<LedgerReason, string> = {
  quiz_box: '퀴즈 상자',
  attendance: '출석 보너스',
  streak: '연속 출석 보너스',
  ad_bonus: '광고 보너스',
  exchange: '기프티콘 교환',
  admin_adjust: '관리자 조정',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LedgerRow({ entry }: { entry: LedgerEntry }): React.JSX.Element {
  const c = useThemeColors();
  const isEarn = entry.direction === 'earn';
  const accent = isEarn ? c.success : c.danger;
  return (
    <View className="flex-row items-center justify-between border-b border-border-tertiary bg-bg-primary px-xl py-md">
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 40, height: 40, backgroundColor: `${accent}1A` }}>
          <Icon name={isEarn ? 'arrow-up-right' : 'arrow-down-left'} size={20} color={accent} />
        </View>
        <View className="gap-xs">
          <AppText variant="subheading" className="text-text-primary">
            {REASON_LABEL[entry.reason]}
          </AppText>
          <AppText variant="caption" className="text-text-tertiary">
            {formatDate(entry.created_at)}
          </AppText>
        </View>
      </View>
      <AppText variant="subheading" style={{ color: accent }}>
        {isEarn ? '+' : '-'}
        {entry.amount.toLocaleString()}C
      </AppText>
    </View>
  );
}

export default function LedgerScreen(): React.JSX.Element {
  const c = useThemeColors();
  const ledger = useLedger();
  const entries = ledger.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="캐시 내역" showBack />
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LedgerRow entry={item} />}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (ledger.hasNextPage && !ledger.isFetchingNextPage) {
            ledger.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          ledger.isLoading ? (
            <ActivityIndicator className="mt-2xl" color={c.brand} />
          ) : (
            <View className="mt-2xl items-center gap-sm px-xl">
              <Icon name="wallet" size={28} color={c['text-tertiary']} />
              <AppText variant="caption" className="text-center text-text-tertiary">
                거래 내역이 없어요.
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          ledger.isFetchingNextPage ? <ActivityIndicator className="my-lg" color={c.brand} /> : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
