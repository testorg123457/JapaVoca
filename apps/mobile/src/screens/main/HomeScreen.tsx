/**
 * 홈 화면 — 앱의 메인 단일 스크롤.
 *
 * 구조(화이트 톱 — 상단에 민트 블록 없음. 프리미엄 핀테크 톤):
 *   흰 헤더(잉크 워드마크 / 알림·설정 23px 잉크 아이콘) →
 *   자산 블록(좌정렬 스택: "내 캐시" 캡션 위, 잔액 display 잉크 + C 앰버 아래,
 *   우측 조용한 "내역 ›", 탭 → 캐시 내역) →
 *   퀴즈 CTA(주액션) → 상자 카드(보유 수 스택 레이어) → 진입 리스트(inset) → 앵커 배너.
 *
 * 민트는 상단이 아니라 퀴즈 타일·CTA에만 — 색은 기능 신호(원칙 문서 §2).
 * 상자 카드 뒤 스택 레이어(2개↑ 한 장, 4개↑ 두 장)는 재고를 구조로 보여주는 장치.
 *
 * 에러는 각 훅의 isError를 보지 않고 ?? 기본값으로 조용히 fallback한다 —
 * 홈은 어떤 API가 실패해도 크래시 없이 항상 떠 있어야 한다.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import LottieView from 'lottie-react-native';

import {
  AppText,
  Card,
  Coin,
  Icon,
  ListRow,
  ListSection,
} from '../../components';
import { fontFamily, hairline, spacing } from '../../theme/tokens';
import { useColorSchemeMode, useThemeColors } from '../../theme/ThemeProvider';
import { useAttendanceStatus, useBoxes, useDailyToday, useWallet } from '../../api/hooks';
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
  const scheme = useColorSchemeMode();
  const insets = useSafeAreaInsets();

  const wallet = useWallet();
  const boxes = useBoxes();
  const attendance = useAttendanceStatus();
  const unread = useUnreadCount();
  const daily = useDailyToday();

  const balance = wallet.data?.balance ?? 0;
  const boxCount = boxes.data?.length ?? 0;
  const todayCorrectCount = daily.data?.correct_count ?? 0;
  const cycleCorrectCount = todayCorrectCount % 10;
  const justCompletedTen = todayCorrectCount > 0 && cycleCorrectCount === 0;
  const streak = attendance.data?.streak_count ?? 0;
  const hasBoxes = boxCount > 0;

  // 상자 카드 탭 → BoxOpen(전체 미개봉 상자). 개봉 화면이 광고/연출/잔액 invalidate를
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
    navigation.navigate('BoxOpen', {
      boxes: boxes.data.map((b) => ({ id: b.id, grade: b.grade })),
    });
  }

  // 상자 스택 레이어 — 2개↑ 한 장, 4개↑ 두 장이 카드 위로 살짝 보인다.
  const stackPad = boxCount >= 4 ? 12 : boxCount >= 2 ? 7 : 0;

  return (
    <View className="flex-1 bg-bg-secondary">
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c['bg-secondary']}
      />

      {/* 화이트 헤더 — 좌: 캐시 보유량(탭→내역) / 우: 알림·설정. 상태바 inset 소유. */}
      <View style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center justify-between px-xl">
          <Pressable
            onPress={() => navigation.navigate('Ledger')}
            hitSlop={8}
            className="flex-row items-center active:opacity-60"
            style={{ gap: 6 }}>
            <Coin size={24} />
            <AppText
              className="text-text-primary"
              style={{ fontFamily: fontFamily.bold, fontSize: 20, letterSpacing: -0.3 }}>
              {balance.toLocaleString()}
            </AppText>
          </Pressable>
          <View className="flex-row items-center" style={{ gap: 18 }}>
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={10}
              className="active:opacity-60">
              <Icon name="bell" size={23} color={c['text-primary']} />
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
              <Icon name="settings" size={23} color={c['text-primary']} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        <View className="gap-2xl">
          {/* 오늘의 진행 문구 — 캐시 아래. daily/today correct_count 기준(정답 10개마다 캐시). */}
          <View className="px-xl" style={{ paddingTop: spacing.md }}>
            {justCompletedTen ? (
              <AppText
                className="text-text-primary"
                style={{ fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 31, letterSpacing: -0.5 }}>
                퀴즈 10개를 다 풀었습니다.{'\n'}
                <AppText
                  style={{ fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 31, letterSpacing: -0.5, color: c.brand }}>
                  상자를 열어 캐시를 획득하세요!
                </AppText>
              </AppText>
            ) : (
              <AppText
                className="text-text-primary"
                style={{ fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 31, letterSpacing: -0.5 }}>
                오늘 {todayCorrectCount}문제 풀었어요{'\n'}
                <AppText
                  style={{ fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 31, letterSpacing: -0.5, color: c.brand }}>
                  {10 - cycleCorrectCount}문제
                </AppText>
                <AppText
                  className="text-text-primary"
                  style={{ fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 31, letterSpacing: -0.5 }}>
                  {' '}더 풀면 캐시 획득 가능
                </AppText>
              </AppText>
            )}
          </View>

          <View className="gap-xl px-xl">
            {/* 퀴즈 시작 — 주액션(민트 solid 액션 카드). 아이콘 배지 없이 타이포로 위계. */}
            <Card
              variant="brand"
              onPress={() => navigation.navigate('LockQuiz')}
              className="flex-row items-center"
              style={{
                gap: 14,
                paddingVertical: 22,
                shadowColor: c.brand,
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 4,
              }}>
              <View className="flex-1" style={{ gap: 3 }}>
                <AppText variant="title" style={{ color: c['on-brand'] }}>
                  단어 · 한자 퀴즈 풀기
                </AppText>
                <AppText variant="body" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  한 문제 맞힐 때마다 캐시 상자가 쌓여요
                </AppText>
              </View>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 42, height: 42, backgroundColor: c['on-brand'] }}>
                <Icon name="chevron-right" size={22} color={c.brand} strokeWidth={2.6} />
              </View>
            </Card>

            {/* 상자 카드 — 보유 수에 따라 뒤에 쌓인 레이어가 보인다 */}
            <View style={{ paddingTop: stackPad }}>
              {boxCount >= 4 ? (
                <View
                  pointerEvents="none"
                  className="absolute rounded-lg border-border-secondary bg-bg-primary"
                  style={{ top: 0, left: 24, right: 24, height: 24, borderWidth: hairline, opacity: 0.5 }}
                />
              ) : null}
              {boxCount >= 2 ? (
                <View
                  pointerEvents="none"
                  className="absolute rounded-lg border-border-secondary bg-bg-primary"
                  style={{ top: stackPad - 7, left: 12, right: 12, height: 24, borderWidth: hairline, opacity: 0.8 }}
                />
              ) : null}
              <Card
                variant={hasBoxes ? 'default' : 'flat'}
                onPress={hasBoxes ? openBoxes : undefined}
                className="flex-row items-center"
                style={{ gap: 14 }}>
                <LottieView
                  source={require('../../assets/gift-animation.json')}
                  autoPlay
                  loop
                  style={{ width: 64, height: 64 }}
                />
                <View className="flex-1 gap-xs">
                  <AppText variant="title" className="text-text-primary">
                    {hasBoxes ? `보유 상자 ${boxCount}개` : '상자가 아직 없어요'}
                  </AppText>
                  <AppText variant="body" className="text-text-tertiary">
                    {hasBoxes ? '탭해서 바로 열어보세요' : '퀴즈를 풀면 상자를 받을 수 있어요'}
                  </AppText>
                </View>
                {hasBoxes ? (
                  <Icon name="chevron-right" size={20} color={c['text-tertiary']} strokeWidth={2.2} />
                ) : null}
              </Card>
            </View>
          </View>

          {/* 가나 · 출석 · 교환 진입 — inset 그룹 */}
          <ListSection inset>
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
            />
            <ListRow
              leftIcon="camera"
              title="일본어 번역"
              onPress={() => navigation.navigate('JapaneseTranslate')}
            />
            <ListRow
              leftIcon="bookmark"
              title="북마크"
              onPress={() => navigation.navigate('Bookmarks')}
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
