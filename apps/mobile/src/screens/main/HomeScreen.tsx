/**
 * 홈 화면 — 앱의 메인 단일 스크롤.
 *
 * 위→아래: 버밀리온 헤더(좌:내 캐시 / 우:설정) → 상자 섹션(메인) → 퀴즈 시작 CTA →
 * 가나·출석·교환 진입(리스트) → 하단 얇은 앵커 배너.
 *
 * 카드 절제: 카드는 "누르는 액션 단위"에만(상자 섹션·퀴즈 CTA). 가나/출석/교환 진입은
 * 가벼운 리스트 행(ListRow). 캐시 갯수는 카드가 아니라 헤더 안 텍스트 계층.
 *
 * 상자 열기 인터랙션은 Phase 3, 각 진입 화면 내용은 Phase 4~6에서 채운다.
 *
 * 에러는 각 훅의 isError를 보지 않고 ?? 기본값으로 조용히 fallback한다 —
 * 홈은 어떤 API가 실패해도 크래시 없이 항상 떠 있어야 한다.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';

import {
  AppHeader,
  AppText,
  Card,
  Icon,
  ListRow,
  ListSection,
} from '../../components';
import { hairline, spacing, yellow } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useAttendanceStatus, useBoxes, useWallet } from '../../api/hooks';
import { useUnreadCount } from '../../api/notifications';
import type { MainStackScreenProps } from '../../navigation/types';

/**
 * 하단 앵커 배너 — ScrollView 바깥 sibling. AdMob 정책 준수:
 *  - ANCHORED_ADAPTIVE_BANNER(기기 폭 적응, ~50dp).
 *  - 배너 "높이"는 로드 완료 후에만 확보(로드 전 빈 광고 공간 노출 금지).
 *  - 콘텐츠와 최소 8dp 여백 + 상단 헤어라인, 탭바가 없으므로 하단 safe-area inset을 소유.
 *    (inset은 로드 여부와 무관하게 항상 확보 — 로드 실패해도 콘텐츠가 제스처바에 닿지 않게.)
 *  - 광고 위에 클릭 유도 문구/버튼 없음.
 */
function BottomAnchorBanner(): React.JSX.Element {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  return (
    <View
      className="items-center"
      style={{
        backgroundColor: loaded ? c['bg-primary'] : 'transparent',
        borderTopColor: c['border-tertiary'],
        borderTopWidth: loaded ? hairline : 0,
        paddingTop: loaded ? spacing.md : 0,
        paddingBottom: insets.bottom,
      }}>
      <BannerAd
        unitId={Config.ADMOB_BANNER_HOME_ID || TestIds.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<MainStackScreenProps<'Home'>['navigation']>();
  const c = useThemeColors();

  const wallet = useWallet();
  const boxes = useBoxes();
  const attendance = useAttendanceStatus();
  const unread = useUnreadCount();

  const balance = wallet.data?.balance ?? 0;
  const boxCount = boxes.data?.length ?? 0;
  const streak = attendance.data?.streak_count ?? 0;

  // 상자 섹션 탭 → BoxOpen(전체 미개봉 상자). 개봉 화면이 광고/연출/잔액 invalidate를
  // 담당하므로 여기선 진입만. navLock으로 연타 시 중복 push 방지(홈 복귀 시 해제).
  const navLockRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navLockRef.current = false;
    }, []),
  );
  function openBoxes() {
    if (navLockRef.current || boxCount === 0 || !boxes.data) {
      return;
    }
    navLockRef.current = true;
    navigation.navigate('BoxOpen', { boxIds: boxes.data.map((b) => b.id) });
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader
        left={
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Icon name="coin" size={20} color={yellow[400]} />
            <AppText variant="title" style={{ color: c['on-header'] }}>
              {balance.toLocaleString()}
            </AppText>
            <AppText variant="subheading" style={{ color: 'rgba(255,255,255,0.85)' }}>
              C
            </AppText>
          </View>
        }
        right={
          <View className="flex-row items-center" style={{ gap: 18 }}>
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={10}
              className="active:opacity-60">
              <Icon name="bell" size={22} color={c['on-header']} />
              {(unread.data ?? 0) > 0 && (
                <View
                  className="absolute items-center justify-center rounded-full"
                  style={{
                    top: -5,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    backgroundColor: c.amber,
                  }}>
                  <AppText variant="micro" style={{ color: c['text-primary'], fontSize: 10 }}>
                    {(unread.data ?? 0) > 99 ? '99+' : unread.data}
                  </AppText>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              className="active:opacity-60">
              <Icon name="settings" size={22} color={c['on-header']} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        <View className="gap-2xl pt-xl">
          {/* 상자 섹션 + 퀴즈 CTA (패딩 블록) */}
          <View className="gap-xl px-xl">
            {/* 상자 섹션 — 메인 기능, 가장 큼/중앙(elevated hero). 탭 → BoxOpen 개봉. */}
            <Card
              variant="elevated"
              onPress={boxCount > 0 ? openBoxes : undefined}
              className="items-center gap-md py-3xl"
              style={boxCount === 0 ? { opacity: 0.55 } : undefined}>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 96, height: 96, backgroundColor: c['brand-subtle'] }}>
                <Icon name="gift" size={52} color={boxCount > 0 ? c.brand : c['text-tertiary']} />
              </View>
              <AppText variant="display" className="text-text-primary">
                보유 상자 {boxCount}개
              </AppText>
              <AppText variant="body" className="text-center text-text-tertiary">
                {boxCount > 0 ? '탭해서 상자를 열어보세요!' : '퀴즈를 풀고 상자를 받아보세요.'}
              </AppText>
            </Card>

            {/* 퀴즈 시작 — 핵심 액션 카드 */}
            <Card onPress={() => navigation.navigate('Quiz')} className="flex-row items-center" style={{ gap: 14 }}>
              <View
                className="items-center justify-center rounded-md"
                style={{ width: 48, height: 48, backgroundColor: c['brand-subtle'] }}>
                <Icon name="book" size={26} color={c.brand} />
              </View>
              <View className="flex-1 gap-xs">
                <AppText variant="heading" className="text-text-primary">
                  단어 · 한자 퀴즈
                </AppText>
                <AppText variant="caption" className="text-text-tertiary">
                  4지선다로 풀고 캐시 상자 받기
                </AppText>
              </View>
              <Icon name="chevron-right" size={20} color={c['text-tertiary']} strokeWidth={2.2} />
            </Card>
          </View>

          {/* 가나 · 출석 · 교환 진입 — 가벼운 리스트(카드 X) */}
          <ListSection>
            <ListRow
              leftIcon="pencil"
              title="히라가나 / 가타카나"
              onPress={() => navigation.navigate('Kana')}
            />
            <ListRow
              leftIcon="calendar"
              title="출석체크"
              subtitle={streak > 0 ? `${streak}일 연속 출석 중` : '오늘 출석하고 보너스 받기'}
              onPress={() => navigation.navigate('Attendance')}
            />
            <ListRow
              leftIcon="gift"
              title="기프티콘 교환"
              onPress={() => navigation.navigate('Exchange')}
              last
            />
          </ListSection>
        </View>
      </ScrollView>

      {/* 화면 최하단 앵커 배너 — ScrollView 바깥 sibling */}
      <BottomAnchorBanner />
    </View>
  );
}
