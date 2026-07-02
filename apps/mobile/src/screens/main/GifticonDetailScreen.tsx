/**
 * GifticonDetailScreen — 기프티콘 상세(바코드).
 *
 * 보관함(GifticonWalletScreen)에서 항목을 탭하면 진입. 매장에서 직원에게 보여줄
 * 바코드 + 쿠폰번호 + 유효기간을 크게 표시한다.
 *
 * ⚠️ 바코드·쿠폰번호·유효기간은 발급사 연동 전이라 placeholder(lib/gifticonPlaceholder).
 *    실제 바코드 렌더는 발급사 연동 시 바코드 라이브러리/이미지로 교체한다.
 */
import React from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useProducts } from '../../api/exchange';
import { placeholderExpiry, placeholderCouponCode } from '../../lib/gifticonPlaceholder';
import type { MainStackScreenProps } from '../../navigation/types';

/** 가짜 바코드 — 검정 막대 반복. 발급사 연동 시 실제 바코드로 교체. */
function FakeBarcode({ color }: { color: string }): React.JSX.Element {
  // 굵기가 불규칙한 막대들(실제 바코드처럼) — 결정론 필요 없어 고정 패턴.
  const widths = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1];
  return (
    <View style={{ flexDirection: 'row', height: 60, alignItems: 'stretch' }}>
      {widths.map((w, i) => (
        <View
          key={i}
          style={{ width: w * 2, backgroundColor: i % 2 === 0 ? color : 'transparent' }}
        />
      ))}
    </View>
  );
}

export default function GifticonDetailScreen({
  route,
}: MainStackScreenProps<'GifticonDetail'>): React.JSX.Element {
  const c = useThemeColors();
  const products = useProducts();
  const { item } = route.params;

  const name = products.data?.find((p) => p.code === item.product_code)?.name ?? item.product_code;

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title={name} showBack />

      <View className="items-center px-xl pt-2xl">
        {/* 아이콘 */}
        <View
          className="items-center justify-center rounded-xl"
          style={{ width: 56, height: 56, backgroundColor: c['brand-subtle'], marginBottom: 10 }}>
          <Icon name="gift" size={28} color={c.brand} />
        </View>
        <AppText variant="title" className="text-text-primary">
          {name}
        </AppText>
        <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 4 }}>
          유효기간 ~{placeholderExpiry(item.created_at)}
        </AppText>

        {/* 바코드 카드 */}
        <View
          className="mt-2xl w-full items-center rounded-xl border border-border-secondary bg-bg-primary"
          style={{ paddingVertical: 22, gap: 14 }}>
          <FakeBarcode color={c['text-primary']} />
          <AppText
            variant="heading"
            className="text-text-primary"
            style={{ letterSpacing: 3 }}>
            {placeholderCouponCode(item.id)}
          </AppText>
        </View>

        <AppText
          variant="caption"
          className="text-center text-text-tertiary"
          style={{ marginTop: 16, lineHeight: 18 }}>
          매장 직원에게 바코드를 보여주세요.{'\n'}발급사 연동 전이라 예시 바코드예요.
        </AppText>
      </View>
    </View>
  );
}
