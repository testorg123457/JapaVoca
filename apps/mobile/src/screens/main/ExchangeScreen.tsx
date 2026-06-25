/**
 * ExchangeScreen — 기프티콘 교환.
 *
 * 상품 선택 → 보상형 광고 → 교환 요청. 보상/차감/멱등은 서버가 확정(useRequestExchange).
 * 비즈니스 로직(상품·광고 SSV·교환)은 기존 훅 그대로 — 화면은 호출만.
 */
import React, { useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';

import { AppHeader, AppText, Icon, PressableScale } from '../../components';
import { yellow } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useWallet } from '../../api/hooks';
import { useProducts, useRequestExchange, type Product } from '../../api/exchange';
import { useRewardedAd } from '../../hooks/useRewardedAd';

/** 네트워크 재시도 멱등용 키(unique 문자열이면 충분). */
function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function ExchangeScreen(): React.JSX.Element {
  const c = useThemeColors();
  const wallet = useWallet();
  const products = useProducts();
  const requestExchange = useRequestExchange();
  const { showThen } = useRewardedAd(Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED);
  const lockRef = useRef(false);

  const balance = wallet.data?.balance ?? 0;

  function handleSelect(product: Product) {
    if (lockRef.current) {
      return;
    }
    if (balance < product.price_cash) {
      Alert.alert('캐시 부족', '보유 캐시가 부족해요. 퀴즈를 풀고 캐시를 모아보세요.');
      return;
    }
    lockRef.current = true;
    showThen(() => {
      requestExchange.mutate(
        { product_code: product.code, ad_verified: true, idempotency_key: genIdempotencyKey() },
        {
          onSuccess: () => {
            lockRef.current = false;
            Alert.alert('교환 완료!', `${product.name} 교환이 완료됐어요.`);
          },
          onError: (error) => {
            lockRef.current = false;
            const detail = (error as AxiosError<{ detail?: string }>).response?.data?.detail;
            Alert.alert('교환 실패', detail ?? '교환에 실패했습니다. 잠시 후 다시 시도해주세요.');
          },
        },
      );
    });
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="기프티콘 교환" showBack />
      <View className="flex-1">
        {/* 보유 캐시 안내 */}
        <View className="flex-row items-center gap-xs border-b border-border-tertiary bg-bg-primary px-xl py-lg">
          <Icon name="coin" size={18} color={yellow[400]} />
          <AppText variant="subheading" className="text-text-primary">
            보유 캐시 {balance.toLocaleString()}C
          </AppText>
        </View>
        <AppText variant="caption" className="px-xl pt-md text-text-tertiary">
          상품을 선택하면 광고를 본 뒤 캐시로 교환돼요.
        </AppText>

        {products.isLoading ? (
          <ActivityIndicator className="mt-2xl" color={c.brand} />
        ) : (
          <View className="mt-sm">
            {(products.data ?? []).map((product) => {
              const affordable = balance >= product.price_cash;
              return (
                <PressableScale
                  key={product.code}
                  onPress={() => handleSelect(product)}
                  pressedScale={0.98}
                  className="flex-row items-center justify-between border-b border-border-tertiary bg-bg-primary px-xl py-lg"
                  style={affordable ? undefined : { opacity: 0.5 }}>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <View
                      className="items-center justify-center rounded-md"
                      style={{ width: 44, height: 44, backgroundColor: c['brand-subtle'] }}>
                      <Icon name="gift" size={24} color={c.brand} />
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
                </PressableScale>
              );
            })}
          </View>
        )}

        {requestExchange.isPending && (
          <View
            className="items-center justify-center"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15,18,22,0.2)',
            }}>
            <ActivityIndicator color={c.brand} size="large" />
          </View>
        )}
      </View>
    </View>
  );
}
