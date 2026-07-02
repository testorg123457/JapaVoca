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

import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Button, Icon, PressableScale } from '../../components';
import { yellow } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useWallet } from '../../api/hooks';
import { useProducts, useRequestExchange, type Product } from '../../api/exchange';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';

/** 네트워크 재시도 멱등용 키(unique 문자열이면 충분). */
function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function ExchangeScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Exchange'>['navigation']>();
  const me = useMe();
  const wallet = useWallet();
  const products = useProducts();
  const requestExchange = useRequestExchange();
  const { showThen } = useRewardedAd(Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED);
  const lockRef = useRef(false);

  const balance = wallet.data?.balance ?? 0;
  const isGuest = me.data?.is_guest ?? false;

  function handleSelect(product: Product) {
    if (lockRef.current) {
      return;
    }
    if (isGuest) {
      Alert.alert('게스트는 교환 불가', '구글/카카오 계정을 연결하면 교환할 수 있어요.', [
        { text: '나중에', style: 'cancel' },
        { text: '계정 연결', onPress: () => navigation.navigate('Settings') },
      ]);
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
        {/* 보유 캐시 밴드 — 옅은 민트 면에 잔액을 크게 */}
        <View
          className="px-xl pb-lg pt-md"
          style={{ backgroundColor: c['brand-subtle'], borderBottomWidth: 1, borderBottomColor: c['border-secondary'] }}>
          <AppText variant="caption" className="text-text-secondary">
            보유 캐시
          </AppText>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Icon name="coin" size={22} color={yellow[400]} />
            <AppText variant="display" className="text-text-primary">
              {balance.toLocaleString()}C
            </AppText>
          </View>
        </View>
        <AppText variant="caption" className="px-xl pb-sm pt-lg text-text-tertiary">
          상품을 선택하면 광고를 본 뒤 캐시로 교환돼요.
        </AppText>

        {/* 게스트 안내 — 교환은 실계정 연결 후 가능 */}
        {isGuest ? (
          <View
            className="mx-xl mt-md flex-row items-center rounded-lg px-lg py-md"
            style={{ gap: 10, backgroundColor: c['amber-subtle'] }}>
            <Icon name="lock" size={18} color={c.amber} />
            <View className="flex-1">
              <AppText variant="label" className="text-text-primary">
                게스트는 교환할 수 없어요
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                구글/카카오 계정을 연결하면 모은 캐시로 교환할 수 있어요.
              </AppText>
            </View>
          </View>
        ) : null}
        {isGuest ? (
          <View className="px-xl pt-md">
            <Button title="계정 연결하러 가기" onPress={() => navigation.navigate('Settings')} />
          </View>
        ) : null}

        {products.isLoading ? (
          <ActivityIndicator className="mt-2xl" color={c.brand} />
        ) : (
          <View>
            {(products.data ?? []).map((product) => {
              const affordable = balance >= product.price_cash;
              // 보유율 — 살 수 있으면 100%, 못 사면 목표까지의 진척(회색 바).
              const ratio = Math.max(0, Math.min(1, balance / product.price_cash));
              return (
                <PressableScale
                  key={product.code}
                  onPress={() => handleSelect(product)}
                  pressedScale={0.98}
                  className="flex-row items-center border-b border-border-tertiary bg-bg-primary px-xl py-lg"
                  style={{ gap: 12 }}>
                  <View
                    className="items-center justify-center rounded-md"
                    style={{ width: 44, height: 44, backgroundColor: c['brand-subtle'] }}>
                    <Icon name="gift" size={24} color={affordable ? c.brand : c['text-tertiary']} />
                  </View>
                  <View className="flex-1" style={{ gap: 6 }}>
                    <AppText
                      variant="subheading"
                      style={affordable ? undefined : { color: c['text-tertiary'] }}>
                      {product.name}
                    </AppText>
                    {/* 보유율 바 */}
                    <View
                      style={{
                        height: 3, width: 120, borderRadius: 2,
                        backgroundColor: c['bg-tertiary'], overflow: 'hidden',
                      }}>
                      <View
                        style={{
                          height: '100%', width: `${ratio * 100}%`,
                          backgroundColor: affordable ? c.brand : c['text-tertiary'],
                        }}
                      />
                    </View>
                  </View>
                  <View className="items-end" style={{ gap: 2 }}>
                    <AppText
                      variant="label"
                      style={affordable ? undefined : { color: c['text-tertiary'] }}>
                      {product.price_cash.toLocaleString()}C
                    </AppText>
                    {!affordable && (
                      <AppText variant="micro" style={{ color: c.danger }}>
                        캐시 부족
                      </AppText>
                    )}
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
