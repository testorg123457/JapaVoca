/**
 * @deprecated 하단 탭 제거(2026-06)로 더 이상 라우팅되지 않는다. 캐시 내역은
 * `LedgerScreen`, 기프티콘 교환은 `ExchangeScreen`으로 분리됨. 비즈니스 로직(원장 무한
 * 스크롤·교환 멱등·광고 SSV) 참조용으로만 남겨둔다 — 신규 작업은 위 두 화면을 수정할 것.
 *
 * 지갑 화면 — 잔액/누적, 거래 내역(원장) 탭 + 무한 스크롤, 기프티콘 교환 진입.
 *
 * 잔액·내역은 모두 서버가 단일 진실원. 내역은 useLedger(무한 쿼리)로 페이지
 * 단위 로드한다. 교환은 상품 선택 → 보상형 광고 → 교환 요청 순.
 *
 * 디자인: 상단 민트 그라데이션 잔액 hero + 누적, 세그먼트 탭, 아이콘 배지가 달린
 * 내역 행(적립=민트↑ / 사용=옐로↓), 하단 고정 교환 버튼, 바텀시트 상품 선택.
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';

import { AppText, Button, Gradient, Icon } from '../../components';
import { gradients, scrim, yellow } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useLedger,
  useWallet,
  type LedgerDirection,
  type LedgerEntry,
  type LedgerReason,
} from '../../api/hooks';
import { useProducts, useRequestExchange, type Product } from '../../api/exchange';
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
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WalletScreen(): React.JSX.Element {
  const c = useThemeColors();
  const wallet = useWallet();
  const [tab, setTab] = useState<TabKey>('all');
  const direction: LedgerDirection | undefined = tab === 'all' ? undefined : tab;
  const ledger = useLedger(direction);

  const entries = ledger.data?.pages.flatMap((page) => page.results) ?? [];

  // 기프티콘 교환 — 상품 선택 → 보상형 광고 → 교환 요청.
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const products = useProducts();
  const requestExchange = useRequestExchange();
  const { showThen } = useRewardedAd(Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED);
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
            const detail = (error as AxiosError<{ detail?: string }>).response?.data?.detail;
            Alert.alert('교환 실패', detail ?? '교환에 실패했습니다. 잠시 후 다시 시도해주세요.');
          },
        },
      );
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top']}>
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
        ListHeaderComponent={
          <View className="gap-xl pb-md">
            {/* 잔액 hero + 누적 */}
            <View
              className="overflow-hidden rounded-b-xl px-xl pb-2xl pt-xl"
              style={{
                shadowColor: c.brand,
                shadowOpacity: 0.28,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 5,
              }}>
              <Gradient colors={gradients.brand} direction="diagonal" />
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Icon name="coin" size={18} color={yellow[400]} />
                <AppText variant="label" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  보유 캐시
                </AppText>
              </View>
              <View className="mt-sm flex-row items-end" style={{ gap: 4 }}>
                <AppText variant="hero" className="text-white">
                  {(wallet.data?.balance ?? 0).toLocaleString()}
                </AppText>
                <AppText variant="title" className="text-white" style={{ marginBottom: 6, opacity: 0.9 }}>
                  C
                </AppText>
              </View>
              <View className="mt-lg flex-row" style={{ gap: 10 }}>
                <View className="flex-1 rounded-md px-md py-sm" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <AppText variant="micro" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                    누적 적립
                  </AppText>
                  <AppText variant="subheading" className="text-white">
                    {(wallet.data?.total_earned ?? 0).toLocaleString()}C
                  </AppText>
                </View>
                <View className="flex-1 rounded-md px-md py-sm" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <AppText variant="micro" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                    누적 사용
                  </AppText>
                  <AppText variant="subheading" className="text-white">
                    {(wallet.data?.total_used ?? 0).toLocaleString()}C
                  </AppText>
                </View>
              </View>
            </View>

            {/* 세그먼트 탭 */}
            <View className="flex-row px-xl" style={{ gap: 8 }}>
              {TABS.map(({ key, label }) => {
                const active = key === tab;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    className={`rounded-full px-lg py-sm active:opacity-80 ${active ? 'bg-brand' : 'bg-bg-tertiary'}`}>
                    <AppText variant="label" className={active ? 'text-on-brand' : 'text-text-secondary'}>
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
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* 하단 고정 — 기프티콘 교환 */}
      <View className="border-t border-border-tertiary bg-bg-primary px-xl py-md">
        <Button
          title="기프티콘 교환하기"
          leftIcon="gift"
          onPress={() => setExchangeOpen(true)}
          loading={requestExchange.isPending}
        />
      </View>

      {/* 상품 선택 바텀시트 */}
      <Modal
        visible={exchangeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExchangeOpen(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: scrim }}
          onPress={() => setExchangeOpen(false)}>
          <Pressable className="rounded-t-xl bg-bg-primary px-xl pb-3xl pt-lg" onPress={() => {}}>
            <View className="mb-lg items-center">
              <View className="h-1 w-10 rounded-full bg-bg-tertiary" />
            </View>
            <AppText variant="title" className="text-text-primary">
              기프티콘 교환
            </AppText>
            <AppText variant="caption" className="mb-lg mt-xs text-text-tertiary">
              광고를 본 뒤 캐시로 교환돼요.
            </AppText>
            {products.isLoading ? (
              <ActivityIndicator color={c.brand} />
            ) : (
              (products.data ?? []).map((product) => (
                <Pressable
                  key={product.code}
                  className="flex-row items-center justify-between border-b border-border-tertiary py-lg active:opacity-70"
                  onPress={() => handleSelectProduct(product)}>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <View
                      className="items-center justify-center rounded-md"
                      style={{ width: 40, height: 40, backgroundColor: c['brand-subtle'] }}>
                      <Icon name="gift" size={22} color={c.brand} />
                    </View>
                    <AppText variant="subheading" className="text-text-primary">
                      {product.name}
                    </AppText>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Icon name="coin" size={15} color={yellow[400]} />
                    <AppText variant="label" className="text-text-primary">
                      {product.price_cash.toLocaleString()}C
                    </AppText>
                  </View>
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
      <AppText variant="subheading" style={{ color: isEarn ? c.success : c.danger }}>
        {isEarn ? '+' : '-'}
        {entry.amount.toLocaleString()}C
      </AppText>
    </View>
  );
}
