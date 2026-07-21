/**
 * LedgerScreen — 캐시 사용/적립 내역 (설정 > 내역에서 진입).
 *
 * 원장(ledger) 무한 스크롤. 잔액·내역은 서버가 단일 진실원. 적립=success↑ / 사용=danger↓.
 * 비즈니스 로직은 기존 useLedger/useWallet 훅 그대로 연결(읽기만).
 *
 * 상단 잔액 요약(카드 없이 텍스트) + 날짜별 섹션 그룹 리스트. 행의 시간은 날짜를 뺀
 * "HH:mm"만 — 날짜는 섹션 헤더가 담당하므로 중복 표시하지 않는다.
 */
import React from 'react';
import { ActivityIndicator, SectionList, View } from 'react-native';

import { AppHeader, AppText, Coin, Icon } from '../../components';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useLedger, useWallet, type LedgerEntry, type LedgerReason } from '../../api/hooks';

const REASON_LABEL: Record<LedgerReason, string> = {
  quiz_box: '퀴즈 상자',
  attendance: '출석 보너스',
  streak: '연속 출석 보너스',
  ad_bonus: '광고 보너스',
  exchange: '기프티콘 교환',
  admin_adjust: '관리자 조정',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** entry.created_at → 섹션 제목("오늘"/"어제"/"7월 18일 (금)", 연도가 다르면 "2025.12월 3일 (수)"). */
function sectionTitle(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateKey(d) === dateKey(now)) return '오늘';
  if (dateKey(d) === dateKey(yesterday)) return '어제';
  const yearPrefix = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}.` : '';
  return `${yearPrefix}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

type Section = { title: string; data: LedgerEntry[] };

/** 정렬된 entries를 인접한 같은 날짜끼리 섹션으로 묶는다(서버가 최신순 정렬 보장). */
function groupByDate(entries: LedgerEntry[]): Section[] {
  const sections: Section[] = [];
  for (const entry of entries) {
    const title = sectionTitle(entry.created_at);
    const current = sections[sections.length - 1];
    if (current?.title === title) {
      current.data.push(entry);
    } else {
      sections.push({ title, data: [entry] });
    }
  }
  return sections;
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
            {formatTime(entry.created_at)}
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

function SectionLabel({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="bg-bg-secondary px-xl pb-sm pt-xl">
      <AppText variant="label" className="text-text-tertiary">
        {title}
      </AppText>
    </View>
  );
}

export default function LedgerScreen(): React.JSX.Element {
  const c = useThemeColors();
  const wallet = useWallet();
  const ledger = useLedger();
  const entries = ledger.data?.pages.flatMap((page) => page.results) ?? [];
  const sections = groupByDate(entries);
  const balance = wallet.data?.balance ?? 0;

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="캐시 내역" showBack />

      {/* 잔액 요약 — 카드 없이 텍스트 블록 */}
      <View className="bg-bg-secondary px-xl pb-xl pt-lg" style={{ gap: 10 }}>
        <AppText variant="caption" className="text-text-tertiary">
          보유 캐시
        </AppText>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Coin size={30} />
          <AppText variant="hero" className="text-text-primary">
            {balance.toLocaleString()}
          </AppText>
        </View>
      </View>
      <View style={{ height: hairline, backgroundColor: c['border-tertiary'] }} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LedgerRow entry={item} />}
        renderSectionHeader={({ section }) => <SectionLabel title={section.title} />}
        stickySectionHeadersEnabled
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
