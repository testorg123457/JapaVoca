/**
 * HomeBannerCarousel — 홈(출석 위) 자동 순환 배너.
 *
 * 여러 배너를 좌우로 자동 넘긴다. 스와이프하면 잠깐 멈췄다 다시 돈다. 하단 점으로 위치 표시.
 * 배너 추가/삭제는 아래 HOME_BANNERS 배열만 고치면 된다.
 *
 * ⚠️ 홈 규칙: 그라데이션 히어로·꽉 찬 민트 블록 금지(사용자 취향). 절제된 카드형으로,
 *    색은 기능 신호(민트=액션, 옐로=캐시)로만. 디자인 시스템 토큰·컴포넌트만 사용.
 *
 * 시각 규칙(통일감이 핵심):
 *  - 배너 3장 모두 **같은 면**을 쓴다 — 흰 면(bg-primary) + 헤어라인 보더 + radius.lg.
 *    tone마다 면·보더가 달라지면 카드 언어가 무너져 "연한 컬러박스 모음"으로 읽힌다.
 *    (바로 위 ListSection inset과 같은 언어라 홈 안에서 한 가족으로 보인다.)
 *    ⚠️ 그림자는 쓰지 않는다 — 가로 스크롤(ScrollView) 안이라 사방이 잘려 지저분해진다.
 *    면 구분은 헤어라인이 맡는다.
 *  - tone은 **아이콘 칩 하나에만** 드러난다 = 기능 신호. 민트=액션(초대), 옐로=캐시(교환),
 *    중립=그 외(번역). 제목은 언제나 Ink.
 *  - 위계는 색이 아니라 굵기·크기·톤으로: 제목 heading(Ink) / 부제 caption(text-tertiary).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { hairline, radius, spacing } from '../../../theme/tokens';
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
const CARD_H = 84; // 카드 높이 고정 — 페이지마다 높이가 달라지면 캐러셀이 들썩인다
const CHIP = 40; // 아이콘 칩
const DOT = 5; // 점 인디케이터(현재 위치는 길쭉하게)
const DOT_ACTIVE_W = 16;

export function HomeBannerCarousel(): React.JSX.Element | null {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'Home'>['navigation']>();
  const { width: screenW } = useWindowDimensions();
  const itemW = screenW - H_PAD * 2;

  const listRef = useRef<FlatList<Banner>>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = HOME_BANNERS.length;

  // 시스템 "동작 줄이기"면 넘김을 애니메이션 없이(즉시) 한다 — 자동 순환 자체는 유지.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) { setReduceMotion(on); }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; sub.remove(); };
  }, []);

  const stopAuto = useCallback(() => {
    if (autoTimer.current) { clearInterval(autoTimer.current); autoTimer.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    if (count <= 1 || itemW <= 0) { return; }
    stopAuto();
    autoTimer.current = setInterval(() => {
      const next = (indexRef.current + 1) % count;
      // 인덱스는 여기서 직접 갱신한다 — animated:false 스크롤은 모멘텀이 없어
      // onMomentumScrollEnd가 오지 않는다. 그것만 믿으면 reduce motion일 때
      // indexRef가 0에 멈춰 두 번째 배너에서 더 넘어가지 않는다(점도 안 움직인다).
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * itemW, animated: !reduceMotion });
    }, AUTO_MS);
  }, [count, itemW, reduceMotion, stopAuto]);

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

  /**
   * 칩 색 — tone이 드러나는 유일한 자리. 면(bg-primary)·보더는 tone과 무관하게 통일한다.
   * amber는 "amber-subtle 면 + amber-strong 아이콘"이 리워드 계열 기존 컨벤션.
   */
  const chip: Record<BannerTone, { bg: string; fg: string }> = {
    mint: { bg: c['brand-subtle'], fg: c.brand },
    amber: { bg: c['amber-subtle'], fg: c['amber-strong'] },
    neutral: { bg: c['bg-tertiary'], fg: c['text-secondary'] },
  };

  return (
    <View style={{ gap: spacing.lg }}>
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
            <PressableScale
              onPress={() => navigation.navigate(item.screen as never)}
              pressedScale={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.subtitle}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.lg,
                height: CARD_H,
                paddingHorizontal: spacing.xl,
                borderRadius: radius.lg,
                backgroundColor: c['bg-primary'],
                borderWidth: hairline,
                borderColor: c['border-secondary'],
              }}>
              <View
                style={{
                  width: CHIP,
                  height: CHIP,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: chip[item.tone].bg,
                }}>
                <Icon name={item.icon} size={20} color={chip[item.tone].fg} />
              </View>
              {/* 한 줄 고정 — 폰트 확대/문구 변경으로 줄이 늘어도 카드 높이가 흔들리지 않게. */}
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="heading" numberOfLines={1} className="text-text-primary">
                  {item.title}
                </AppText>
                <AppText variant="caption" numberOfLines={1} className="text-text-tertiary">
                  {item.subtitle}
                </AppText>
              </View>
              <Icon name="chevron-right" size={20} color={c['text-tertiary']} strokeWidth={2.2} />
            </PressableScale>
          </View>
        )}
      />

      {/* 점 인디케이터 — 배너 2개 이상일 때만. 활성 점은 Ink(민트는 배너 안 칩에만 쓴다).
          위치 표시일 뿐이라 스크린리더에는 숨긴다(각 배너가 이미 읽힌다). */}
      {count > 1 && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
          {HOME_BANNERS.map((b, i) => (
            <View
              key={b.id}
              style={{
                height: DOT,
                width: i === index ? DOT_ACTIVE_W : DOT,
                borderRadius: radius.full,
                backgroundColor: i === index ? c['text-primary'] : c['border-secondary'],
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
