/**
 * ExchangeScreen — 기프티콘 교환.
 *
 * 상품 선택 → 보상형 광고 → 교환 요청. 보상/차감/멱등은 서버가 확정(useRequestExchange).
 * 비즈니스 로직(상품·광고 SSV·교환)은 기존 훅 그대로 — 화면은 호출만.
 *
 * 상품 행: 좌측 이미지 슬롯(썸네일 있으면 사진, 없으면 카테고리 아이콘) + 이름·카테고리
 * + 우측 캐시가·교환 상태. 게스트는 상단 안내 카드 하나로 계정 연결을 유도한다.
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, View } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';

import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Coin, Icon, PressableScale } from '../../components';
import type { IconName } from '../../components/Icon';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useWallet } from '../../api/hooks';
import {
  pollAdStatus,
  useProducts,
  useRequestExchange,
  type Product,
} from '../../api/exchange';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';

/** 네트워크 재시도 멱등용 키(unique 문자열이면 충분). */
function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** 상품 코드 → 카테고리 아이콘·라벨(썸네일 없을 때의 시각 구분). */
function categoryOf(code: string): { icon: IconName; label: string } {
  if (code.startsWith('COFFEE')) {
    return { icon: 'coffee', label: '커피' };
  }
  return { icon: 'store', label: '편의점' };
}

export default function ExchangeScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Exchange'>['navigation']>();
  const me = useMe();
  const wallet = useWallet();
  const products = useProducts();
  const requestExchange = useRequestExchange();
  const { showThen } = useRewardedAd(
    Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED,
    me.data ? { userId: me.data.id, context: 'exchange' } : undefined,
  );
  const lockRef = useRef(false);
  // 상품별 멱등키. 실패 후 재탭은 같은 키로 서버 멱등 처리(이중 차감 방지),
  // 성공 시에만 비워 다음 구매가 새 키를 받게 한다.
  const keyRef = useRef<Record<string, string>>({});
  // SSV 폴링 중 오버레이 표시용(요청 pending 과 별개 단계).
  const [verifying, setVerifying] = useState(false);

  const balance = wallet.data?.balance ?? 0;
  const isGuest = me.data?.is_guest ?? false;

  function handleSelect(product: Product) {
    if (lockRef.current) {
      return;
    }
    if (isGuest) {
      Alert.alert('게스트는 교환 불가', '구글/카카오 계정을 연결하면 교환할 수 있어요.', [
        { text: '나중에', style: 'cancel' },
        { text: '계정 연결', onPress: () => navigation.navigate('AccountSettings') },
      ]);
      return;
    }
    if (balance < product.price_cash) {
      Alert.alert('캐시 부족', '보유 캐시가 부족해요. 퀴즈를 풀고 캐시를 모아보세요.');
      return;
    }
    lockRef.current = true;
    // 이번 상품에 진행 중인 키가 있으면(직전 시도 실패) 재사용, 없으면 새로 발급.
    const idempotencyKey = keyRef.current[product.code] ?? genIdempotencyKey();
    keyRef.current[product.code] = idempotencyKey;
    showThen(async (earned, nonce) => {
      // 광고를 끝까지 보지 않았으면(스킵·미로드 포함) 서버 호출 없이 종료 — 차감 없음.
      if (!earned) {
        lockRef.current = false;
        Alert.alert(
          '광고 시청 필요',
          '광고를 끝까지 시청해야 교환할 수 있어요. 광고가 안 나왔다면 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      // SSV 확인 — Mock 모드(required=false)면 1회 조회로 즉시 통과.
      setVerifying(true);
      const status = await pollAdStatus(nonce).finally(() => setVerifying(false));
      if (status.required && !status.verified) {
        lockRef.current = false;
        Alert.alert(
          '광고 확인 지연',
          '광고 시청 확인이 지연되고 있어요. 캐시는 차감되지 않았어요. 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      requestExchange.mutate(
        {
          product_code: product.code,
          ad_verified: true,
          idempotency_key: idempotencyKey,
          ad_log_id: status.ad_log_id,
        },
        {
          onSuccess: () => {
            lockRef.current = false;
            delete keyRef.current[product.code]; // 성공 — 다음 구매는 새 키.
            Alert.alert('교환 완료!', `${product.name} 교환이 완료됐어요.`);
          },
          onError: (error) => {
            lockRef.current = false;
            const response = (error as AxiosError<{ detail?: string }>).response;
            // 응답 없음(네트워크 오류) = 서버 처리 여부 불명 → 키 유지, 재탭은 멱등 재시도.
            // 응답 있음(서버가 정의한 실패) → 키 폐기, 재탭은 새 시도(멱등 레코드 오인 방지).
            if (response) {
              delete keyRef.current[product.code];
            }
            Alert.alert('교환 실패', response?.data?.detail ?? '교환에 실패했습니다. 잠시 후 다시 시도해주세요.');
          },
        },
      );
    });
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="기프티콘 교환" showBack />
      <View className="flex-1">
        {/* 보유 캐시 — 흰 면에 잔액을 크게, 하단 헤어라인 */}
        <View
          className="bg-bg-primary px-xl pb-lg pt-lg"
          style={{ borderBottomWidth: hairline, borderBottomColor: c['border-secondary'] }}>
          <AppText variant="caption" className="text-text-tertiary">
            보유 캐시
          </AppText>
          <View className="flex-row items-center" style={{ gap: 8, marginTop: 4 }}>
            <Coin size={32} />
            <AppText variant="display" className="text-text-primary">
              {balance.toLocaleString()}
            </AppText>
          </View>
        </View>

        {/* 게스트 안내 — 눌러서 연결. 짧은 문구 + 민트 pill 버튼 */}
        {isGuest ? (
          <PressableScale
            onPress={() => navigation.navigate('AccountSettings')}
            pressedScale={0.99}
            className="mx-xl mt-lg flex-row items-center rounded-lg bg-bg-primary px-lg py-lg"
            style={{ gap: 13, borderWidth: hairline, borderColor: c['border-secondary'] }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 44, height: 44, backgroundColor: c['brand-subtle'] }}>
              <Icon name="lock" size={22} color={c.brand} />
            </View>
            <View className="flex-1">
              <AppText variant="subheading" className="text-text-primary">
                로그인하고 교환하기
              </AppText>
              <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 2 }}>
                게스트는 교환할 수 없어요
              </AppText>
            </View>
            <View className="rounded-full bg-brand" style={{ paddingHorizontal: 18, paddingVertical: 9 }}>
              <AppText variant="label" style={{ color: c['on-brand'] }}>
                연결
              </AppText>
            </View>
          </PressableScale>
        ) : null}

        {products.isLoading ? (
          <ActivityIndicator className="mt-2xl" color={c.brand} />
        ) : (
          <View className="mt-lg">
            {(products.data ?? []).map((product) => {
              const affordable = balance >= product.price_cash;
              const short = Math.max(0, product.price_cash - balance);
              const cat = categoryOf(product.code);
              return (
                <PressableScale
                  key={product.code}
                  onPress={() => handleSelect(product)}
                  pressedScale={0.98}
                  className="flex-row items-center border-b border-border-tertiary bg-bg-primary px-xl py-lg"
                  style={{ gap: 13, opacity: affordable ? 1 : 0.62 }}>
                  {/* 이미지 슬롯 — 썸네일 있으면 사진, 없으면 카테고리 아이콘 */}
                  <View
                    className="items-center justify-center overflow-hidden rounded-md"
                    style={{ width: 48, height: 48, backgroundColor: c['brand-subtle'] }}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={{ width: 48, height: 48 }} />
                    ) : (
                      <Icon name={cat.icon} size={24} color={affordable ? c.brand : c['text-tertiary']} />
                    )}
                  </View>
                  <View className="flex-1" style={{ gap: 2 }}>
                    <AppText
                      variant="subheading"
                      style={affordable ? undefined : { color: c['text-tertiary'] }}>
                      {product.name}
                    </AppText>
                    <AppText variant="caption" className="text-text-tertiary">
                      {cat.label}
                    </AppText>
                  </View>
                  <View className="items-end" style={{ gap: 2 }}>
                    <View className="flex-row items-center" style={{ gap: 2 }}>
                      <AppText
                        variant="label"
                        style={affordable ? undefined : { color: c['text-tertiary'] }}>
                        {product.price_cash.toLocaleString()}
                      </AppText>
                      <AppText variant="micro" style={{ color: c['amber-strong'] }}>
                        C
                      </AppText>
                    </View>
                    {affordable ? (
                      <AppText variant="micro" style={{ color: c.brand }}>
                        교환 가능
                      </AppText>
                    ) : (
                      <AppText variant="micro" className="text-text-tertiary">
                        {short.toLocaleString()} C 더 모으기
                      </AppText>
                    )}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}

        {(requestExchange.isPending || verifying) && (
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
