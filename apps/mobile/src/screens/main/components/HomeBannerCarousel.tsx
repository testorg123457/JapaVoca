/**
 * HomeBannerCarousel — 홈(출석 위) 자동 순환 배너.
 *
 * 여러 배너를 좌우로 자동 넘긴다. 스와이프하면 잠깐 멈췄다 다시 돈다. 하단 점으로 위치 표시.
 * 배너 추가/삭제는 아래 HOME_BANNERS 배열만 고치면 된다.
 *
 * ⚠️ 홈 규칙: 그라데이션 히어로·꽉 찬 민트 블록 금지(사용자 취향). 절제된 카드형으로,
 *    색은 기능 신호(민트=액션, 옐로=캐시)로만. 디자인 시스템 토큰·컴포넌트만 사용.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppText, Icon, PressableScale } from '../../../components';
import type { IconName } from '../../../components';
import { useThemeColors } from '../../../theme/ThemeProvider';
import { radius, spacing } from '../../../theme/tokens';
import type { MainStackParamList, MainStackScreenProps } from '../../../navigation/types';

type BannerTone = 'mint' | 'amber' | 'neutral';

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  tone: BannerTone;
  screen: keyof MainStackParamList;
};

/** 홈 배너 목록 — 여기만 고치면 추가/삭제/순서 변경이 된다. */
const HOME_BANNERS: Banner[] = [
  {
    id: 'referral',
    title: '친구 초대하고 캐시 받기',
    subtitle: '친구가 코드를 입력하면 둘 다 받아요',
    icon: 'user',
    tone: 'mint',
    screen: 'AccountSettings',
  },
  {
    id: 'translate',
    title: '사진 찍어 일본어 번역',
    subtitle: '메뉴판·간판을 바로 읽어요',
    icon: 'camera',
    tone: 'neutral',
    screen: 'JapaneseTranslate',
  },
  {
    id: 'exchange',
    title: '캐시로 기프티콘 교환',
    subtitle: '모은 캐시를 커피·편의점 상품권으로',
    icon: 'gift',
    tone: 'amber',
    screen: 'Exchange',
  },
];

const H_PAD = spacing.xl; // 홈 좌우 패딩과 동일
const AUTO_MS = 4500; // 자동 넘김 간격
const RESUME_MS = 6000; // 스와이프 후 자동 넘김 재개까지

export function HomeBannerCarousel(): React.JSX.Element | null {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Home'>['navigation']>();
  const { width: screenW } = useWindowDimensions();
  const itemW = screenW - H_PAD * 2;

  const listRef = useRef<FlatList<Banner>>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = HOME_BANNERS.length;

  const stopAuto = useCallback(() => {
    if (autoTimer.current) { clearInterval(autoTimer.current); autoTimer.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    if (count <= 1 || itemW <= 0) { return; }
    stopAuto();
    autoTimer.current = setInterval(() => {
      const next = (indexRef.current + 1) % count;
      listRef.current?.scrollToOffset({ offset: next * itemW, animated: true });
    }, AUTO_MS);
  }, [count, itemW, stopAuto]);

  useEffect(() => {
    startAuto();
    return () => {
      stopAuto();
      if (resumeTimer.current) { clearTimeout(resumeTimer.current); }
    };
  }, [startAuto, stopAuto]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (itemW <= 0) { return; }
    const i = Math.round(e.nativeEvent.contentOffset.x / itemW);
    indexRef.current = i;
    setIndex(i);
  };

  // 손으로 넘기면 자동을 멈췄다가 잠시 뒤 재개(사용자 조작 방해 방지).
  const onTouchStart = () => {
    stopAuto();
    if (resumeTimer.current) { clearTimeout(resumeTimer.current); }
    resumeTimer.current = setTimeout(startAuto, RESUME_MS);
  };

  if (count === 0 || itemW <= 0) { return null; }

  const toneBg: Record<BannerTone, string> = {
    mint: c['brand-subtle'],
    amber: c['gold-subtle'],
    neutral: c['bg-primary'],
  };
  const toneFg: Record<BannerTone, string> = {
    mint: c.brand,
    amber: c.gold,
    neutral: c['text-secondary'],
  };

  return (
    <View style={{ gap: 12 }}>
      <FlatList
        ref={listRef}
        data={HOME_BANNERS}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: itemW, marginHorizontal: H_PAD }}
        getItemLayout={(_, i) => ({ length: itemW, offset: itemW * i, index: i })}
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={onTouchStart}
        renderItem={({ item }) => (
          <View style={{ width: itemW }}>
            <PressableScale onPress={() => navigation.navigate(item.screen as never)} pressedScale={0.98}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  height: 84,
                  paddingHorizontal: 16,
                  borderRadius: radius.lg,
                  backgroundColor: toneBg[item.tone],
                  borderWidth: 1,
                  borderColor: item.tone === 'neutral' ? c['border-secondary'] : 'transparent',
                }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: item.tone === 'neutral' ? c['bg-tertiary'] : c['bg-primary'],
                  }}>
                  <Icon name={item.icon} size={22} color={toneFg[item.tone]} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="subheading" className="text-text-primary">
                    {item.title}
                  </AppText>
                  <AppText variant="caption" className="text-text-secondary">
                    {item.subtitle}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={18} color={c['text-tertiary']} />
              </View>
            </PressableScale>
          </View>
        )}
      />

      {/* 점 인디케이터 — 배너 2개 이상일 때만 */}
      {count > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {HOME_BANNERS.map((b, i) => (
            <View
              key={b.id}
              style={{
                height: 6,
                width: i === index ? 16 : 6,
                borderRadius: 999,
                backgroundColor: i === index ? c.brand : c['border-secondary'],
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
