/**
 * 지갑 화면 — 잔액/누적, 거래 내역(원장) 탭 + 무한 스크롤, 기프티콘 교환 진입.
 *
 * 잔액·내역은 모두 서버가 단일 진실원. 내역은 useLedger(무한 쿼리)로 페이지
 * 단위 로드한다. 교환은 다음 단계라 지금은 안내만 띄운다.
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';

import { AppText, Button, Card } from '../../components';
import { colors } from '../../theme/tokens';
import {
  useLedger,
  useWallet,
  type LedgerDirection,
  type LedgerEntry,
  type LedgerReason,
} from '../../api/hooks';
import {
  useProducts,
  useRequestExchange,
  type Product,
} from '../../api/exchange';
import { useRewardedAd } from '../../hooks/useRewardedAd';

/** 네트워크 재시도 멱등용 키(UUID 형식 아님, unique 문자열이면 충분). */
function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type TabKey = 'all' | 'earn' | 'use';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'earn', label: '적립' },
  { key: 'use', label: '사용' },
];

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
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export default function WalletScreen(): React.JSX.Element {
  const wallet = useWallet();
  const [tab, setTab] = useState<TabKey>('all');
  const direction: LedgerDirection | undefined = tab === 'all' ? undefined : tab;
  const ledger = useLedger(direction);

  const entries = ledger.data?.pages.flatMap((page) => page.results) ?? [];

  // 기프티콘 교환 — 상품 선택 → 보상형 광고 → 교환 요청.
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const products = useProducts();
  const requestExchange = useRequestExchange();
  const { showThen } = useRewardedAd(
    Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED,
  );
  const exchangeLockRef = useRef(false);

  function handleSelectProduct(product: Product) {
    if (exchangeLockRef.current) {
      return;
    }
    exchangeLockRef.current = true;
    setExchangeOpen(false);
    showThen(() => {
      requestExchange.mutate(
        {
          product_code: product.code,
          ad_verified: true,
          idempotency_key: genIdempotencyKey(),
        },
        {
          onSuccess: () => {
            exchangeLockRef.current = false;
            Alert.alert('교환 완료!', `${product.name} 교환이 완료됐어요.`);
          },
          onError: (error) => {
            exchangeLockRef.current = false;
            const detail = (error as AxiosError<{ detail?: string }>).response?.data
              ?.detail;
            Alert.alert(
              '교환 실패',
              detail ?? '교환에 실패했습니다. 잠시 후 다시 시도해주세요.',
            );
          },
        },
      );
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LedgerRow entry={item} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (ledger.hasNextPage && !ledger.isFetchingNextPage) {
            ledger.fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <View className="gap-2xl pb-md">
            {/* 잔액 + 누적 */}
            <View className="bg-brand px-xl pb-2xl pt-lg">
              <AppText variant="caption" className="text-white">
                보유 캐시
              </AppText>
              <AppText variant="display" className="text-white">
                {(wallet.data?.balance ?? 0).toLocaleString()} C
              </AppText>
              <View className="mt-md flex-row gap-2xl">
                <AppText variant="caption" className="text-white">
                  누적 적립 {(wallet.data?.total_earned ?? 0).toLocaleString()}C
                </AppText>
                <AppText variant="caption" className="text-white">
                  누적 사용 {(wallet.data?.total_used ?? 0).toLocaleString()}C
                </AppText>
              </View>
            </View>

            {/* 탭 */}
            <View className="flex-row gap-sm px-xl">
              {TABS.map(({ key, label }) => {
                const active = key === tab;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    className={`rounded-pill px-lg py-sm ${active ? 'bg-brand' : 'bg-bg'}`}>
                    <AppText
                      variant="caption"
                      className={active ? 'text-white' : 'text-text-weak'}>
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          ledger.isLoading ? (
            <ActivityIndicator className="mt-2xl" color={colors.brand} />
          ) : (
            <AppText variant="caption" className="mt-2xl text-center text-text-weak">
              거래 내역이 없어요.
            </AppText>
          )
        }
        ListFooterComponent={
          ledger.isFetchingNextPage ? (
            <ActivityIndicator className="my-lg" color={colors.brand} />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* 하단 고정 — 기프티콘 교환 */}
      <View className="border-t border-border bg-bg px-xl py-md">
        <Button
          title="기프티콘 교환하기"
          onPress={() => setExchangeOpen(true)}
          disabled={requestExchange.isPending}
        />
      </View>

      {/* 상품 선택 모달 */}
      <Modal
        visible={exchangeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExchangeOpen(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setExchangeOpen(false)}>
          <Pressable className="rounded-t-xl bg-bg px-xl py-2xl" onPress={() => {}}>
            <AppText variant="title" className="mb-xs text-text-strong">
              기프티콘 교환
            </AppText>
            <AppText variant="caption" className="mb-lg text-text-weak">
              광고를 본 뒤 캐시로 교환돼요.
            </AppText>
            {products.isLoading ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              (products.data ?? []).map((product) => (
                <Pressable
                  key={product.code}
                  className="flex-row items-center justify-between border-b border-border py-md"
                  onPress={() => handleSelectProduct(product)}>
                  <AppText variant="body" className="text-text-strong">
                    {product.name}
                  </AppText>
                  <AppText variant="body" className="text-brand">
                    {product.price_cash.toLocaleString()}C
                  </AppText>
                </Pressable>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }): React.JSX.Element {
  const isEarn = entry.direction === 'earn';
  return (
    <Card className="mx-xl mb-sm flex-row items-center justify-between rounded-lg">
      <View className="flex-row items-center gap-md">
        <AppText style={{ fontSize: 22 }}>{isEarn ? '💰' : '🎁'}</AppText>
        <View>
          <AppText variant="body" className="text-text-strong">
            {REASON_LABEL[entry.reason]}
          </AppText>
          <AppText variant="caption" className="text-text-weak">
            {formatDate(entry.created_at)}
          </AppText>
        </View>
      </View>
      <AppText variant="body" className={isEarn ? 'text-success' : 'text-danger'}>
        {isEarn ? '+' : '-'}
        {entry.amount.toLocaleString()}C
      </AppText>
    </Card>
  );
}
