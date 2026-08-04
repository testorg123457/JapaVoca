/**
 * LedgerScreen — 캐시 사용/적립 내역 (홈 캐시 표시 · 설정에서 진입).
 *
 * 원장(ledger) 무한 스크롤. 잔액·내역은 서버가 단일 진실원. 적립=success(+) / 사용=danger(−).
 * 비즈니스 로직은 기존 useLedger/useWallet 훅 그대로 연결(읽기만).
 *
 * 디자인 — **통장(passbook)** 을 모델로 삼는다:
 *  · 행마다 색 동그라미 아이콘을 두지 않는다. 8가지 사유는 글자로 읽는 게 빠르고,
 *    초록/빨강 원이 매 줄 반복되면 색이 의미를 잃는다(원칙 §2 "색은 기능적으로만").
 *    적립·사용 구분은 **부호 + 금액 색**만으로 낸다.
 *  · 오른쪽에 금액(굵게) 아래 **거래 후 잔액**을 세운다. `balance_after`는 서버가 이미
 *    행마다 들고 있는 값이고, 잔액이 흐르는 게 보여야 돈 화면으로 신뢰가 간다.
 *    이 숫자 열이 이 화면의 척추다.
 *  · 상단 요약은 카드가 아니라 텍스트 블록 + 헤어라인(원칙 §1.4).
 *  · 전체/적립/사용 필터는 서버가 이미 지원하는 `direction` 파라미터를 그대로 쓴다.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Coin, EmptyState, LogSectionHeader } from '../../components';
import { fontFamily, hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useLedger,
  useWallet,
  type LedgerDirection,
  type LedgerEntry,
  type LedgerReason,
} from '../../api/hooks';
import { formatTime, groupByDate } from '../../lib/dateSections';
import type { MainStackScreenProps } from '../../navigation/types';

const REASON_LABEL: Record<LedgerReason, string> = {
  quiz_box: '퀴즈 상자',
  quiz_milestone: '퀴즈 10문제 보너스',
  referral_inviter: '친구 초대 보상',
  referral_invitee: '추천인 입력 보상',
  exchange: '기프티콘 교환',
  exchange_refund: '기프티콘 교환 환불',
  admin_adjust: '관리자 조정',
};

type Filter = 'all' | LedgerDirection;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'earn', label: '적립' },
  { key: 'use', label: '사용' },
];

/** 요약 줄의 한 항목 — "받은 캐시 18,900". 라벨은 캡션, 숫자는 한 단계 진하게. */
function SummaryStat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <View className="flex-row items-baseline" style={{ gap: 5 }}>
      <AppText variant="caption" className="text-text-tertiary">
        {label}
      </AppText>
      <AppText variant="label" className="text-text-secondary">
        {value.toLocaleString()}
      </AppText>
    </View>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }): React.JSX.Element {
  const c = useThemeColors();
  const isEarn = entry.direction === 'earn';
  return (
    <View
      className="flex-row items-center justify-between border-b border-border-tertiary bg-bg-primary px-xl"
      style={{ paddingVertical: 14 }}>
      <View className="flex-1 pr-lg" style={{ gap: 3 }}>
        <AppText variant="heading" className="text-text-primary" numberOfLines={1}>
          {REASON_LABEL[entry.reason]}
        </AppText>
        <AppText variant="caption" className="text-text-tertiary">
          {formatTime(entry.created_at)}
        </AppText>
      </View>
      <View className="items-end" style={{ gap: 3 }}>
        <AppText
          style={{
            fontFamily: fontFamily.bold,
            fontSize: 17,
            letterSpacing: -0.3,
            color: isEarn ? c.success : c.danger,
          }}>
          {isEarn ? '+' : '-'}
          {entry.amount.toLocaleString()}
        </AppText>
        {/* 거래 후 잔액. 라벨을 붙여야 두 번째 금액으로 오해하지 않는다. */}
        <AppText variant="caption" className="text-text-tertiary">
          잔액 {entry.balance_after.toLocaleString()}
        </AppText>
      </View>
    </View>
  );
}

export default function LedgerScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Ledger'>['navigation']>();
  const [filter, setFilter] = useState<Filter>('all');

  const wallet = useWallet();
  const ledger = useLedger(filter === 'all' ? undefined : filter);
  const entries = ledger.data?.pages.flatMap((page) => page.results) ?? [];
  const sections = groupByDate(entries, (e) => e.created_at);

  const balance = wallet.data?.balance ?? 0;
  const totalEarned = wallet.data?.total_earned ?? 0;
  const totalUsed = wallet.data?.total_used ?? 0;

  const empty =
    filter === 'use'
      ? {
          title: '쓴 캐시가 없어요',
          description: '기프티콘으로 바꾸면 여기에 기록이 남아요.',
          actionLabel: '기프티콘 보러 가기',
          onPressAction: () => navigation.navigate('Exchange'),
        }
      : {
          title: filter === 'earn' ? '아직 받은 캐시가 없어요' : '아직 캐시 내역이 없어요',
          description: '퀴즈를 풀고 상자를 열면 캐시가 쌓여요.',
          actionLabel: '퀴즈 풀러 가기',
          onPressAction: () => navigation.navigate('LockQuiz'),
        };

  return (
    <View className="flex-1 bg-bg-primary">
      <AppHeader title="캐시 내역" showBack />

      {/* 요약 — 카드 없이 텍스트 블록. 잔액 아래에 누적 적립/사용을 인라인으로. */}
      <View className="bg-bg-primary px-xl" style={{ paddingTop: 18, paddingBottom: 18 }}>
        <AppText variant="micro" className="text-text-tertiary">
          보유 캐시
        </AppText>
        <View className="flex-row items-center" style={{ gap: 9, marginTop: 6 }}>
          <Coin size={28} />
          <AppText variant="hero" className="text-text-primary">
            {balance.toLocaleString()}
          </AppText>
        </View>
        <View className="flex-row items-center" style={{ gap: 12, marginTop: 12 }}>
          <SummaryStat label="받은 캐시" value={totalEarned} />
          <View style={{ width: hairline, height: 11, backgroundColor: c['border-secondary'] }} />
          <SummaryStat label="쓴 캐시" value={totalUsed} />
        </View>
      </View>

      {/* 필터 — 알약 칩 대신 밑줄 탭. 목록의 헤어라인 언어와 같은 결. */}
      <View className="flex-row bg-bg-primary px-xl" style={{ gap: 22 }}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              hitSlop={6}
              className="active:opacity-60"
              style={{ paddingBottom: 11 }}>
              <AppText
                variant="label"
                style={{ color: active ? c['text-primary'] : c['text-tertiary'] }}>
                {f.label}
              </AppText>
              <View
                style={{
                  position: 'absolute',
                  left: -2,
                  right: -2,
                  bottom: 0,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: active ? c.brand : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: hairline, backgroundColor: c['border-secondary'] }} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LedgerRow entry={item} />}
        renderSectionHeader={({ section }) => (
          <LogSectionHeader title={section.title} first={section === sections[0]} />
        )}
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
            <ActivityIndicator style={{ marginTop: 72 }} color={c.brand} />
          ) : (
            <EmptyState icon="wallet" {...empty} />
          )
        }
        ListFooterComponent={
          ledger.isFetchingNextPage ? <ActivityIndicator className="my-lg" color={c.brand} /> : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
