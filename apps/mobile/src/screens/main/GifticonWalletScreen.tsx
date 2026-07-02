/**
 * GifticonWalletScreen — 기프티콘 보관함.
 *
 * "구매 내역"(거래 로그, ExchangeHistoryScreen)과 별개로, *발급완료된 기프티콘*만
 * 모아 바코드를 꺼내 쓰는 화면. 목록은 실제 교환 내역(/api/exchange/history/)에서
 * status='issued' 를 필터해 구성한다.
 *
 * ⚠️ 바코드·쿠폰번호·유효기간은 발급사 연동 전이라 placeholder(lib/gifticonPlaceholder).
 * '사용 완료' 탭은 백엔드에 '사용됨' 상태가 아직 없어 현재는 빈 목록(연동 시 채워짐).
 */
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AppHeader, AppText, Icon, PressableScale } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useExchangeHistory, useProducts, type GiftExchange } from '../../api/exchange';
import { placeholderExpiry, placeholderCouponCode } from '../../lib/gifticonPlaceholder';
import type { MainStackScreenProps } from '../../navigation/types';

type Tab = 'available' | 'used';

export default function GifticonWalletScreen({
  navigation,
}: MainStackScreenProps<'GifticonWallet'>): React.JSX.Element {
  const c = useThemeColors();
  const history = useExchangeHistory();
  const products = useProducts();
  const [tab, setTab] = useState<Tab>('available');

  const nameOf = (code: string) =>
    products.data?.find((p) => p.code === code)?.name ?? code;

  const all = history.data?.pages.flatMap((p) => p.results) ?? [];
  // 사용 가능 = 발급완료. 사용 완료 = (백엔드 '사용됨' 상태 도입 전이라 없음).
  const available = all.filter((g) => g.status === 'issued');
  const items = tab === 'available' ? available : [];

  const renderItem = ({ item }: { item: GiftExchange }) => (
    <PressableScale
      onPress={() => navigation.navigate('GifticonDetail', { item })}
      pressedScale={0.98}
      className="mb-lg flex-row overflow-hidden rounded-xl border border-border-secondary bg-bg-primary">
      {/* 아이콘 영역 */}
      <View
        className="items-center justify-center"
        style={{ width: 60, backgroundColor: c['brand-subtle'] }}>
        <Icon name="gift" size={26} color={c.brand} />
      </View>
      {/* 정보 */}
      <View className="flex-1 px-lg py-md">
        <AppText variant="subheading" className="text-text-primary">
          {nameOf(item.product_code)}
        </AppText>
        <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 2 }}>
          ~{placeholderExpiry(item.created_at)} 까지
        </AppText>
        <AppText variant="caption" className="text-text-secondary" style={{ marginTop: 6, letterSpacing: 0.5 }}>
          {placeholderCouponCode(item.id)}
        </AppText>
      </View>
      {/* 진입 화살표 */}
      <View className="items-center justify-center pr-lg">
        <Icon name="chevron-right" size={18} color={c['text-tertiary']} strokeWidth={2.2} />
      </View>
    </PressableScale>
  );

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="기프티콘 보관함" showBack />

      {/* 탭 */}
      <View className="flex-row px-xl pt-md">
        {(['available', 'used'] as Tab[]).map((t) => {
          const on = t === tab;
          const label =
            t === 'available' ? `사용 가능 ${available.length}` : '사용 완료';
          return (
            <PressableScale key={t} onPress={() => setTab(t)} className="flex-1">
              <View
                className="items-center pb-md pt-sm"
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: on ? c.brand : c['border-secondary'],
                }}>
                <AppText
                  variant="label"
                  style={{ color: on ? c['text-primary'] : c['text-tertiary'] }}>
                  {label}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
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
                {tab === 'available'
                  ? '사용 가능한 기프티콘이 없어요.\n퀴즈로 캐시를 모아 교환해보세요.'
                  : '사용 완료한 기프티콘이 없어요.'}
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
