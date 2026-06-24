/**
 * 홈 화면 — 인사말+캐시뱃지, 출석 스트릭 카드, 오늘의 학습 현황(2칸),
 * 단어·한자 학습 진입 카드, 상자 인벤토리, 하단 배너 광고.
 *
 * Arco풍: 뉴트럴 그레이 베이스(bg-secondary) + 단색 블루 포인트, 면+0.5px 보더로 구분.
 * 색은 semantic 토큰 className, 인라인 색은 useThemeColors() 사용.
 *
 * 에러는 각 훅의 isError를 명시적으로 보지 않고 ?? 기본값으로 조용히 fallback한다 —
 * 홈은 어떤 API가 실패해도 크래시 없이 항상 떠 있어야 한다.
 */
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';

import { AppText, Button, Card, CashBadge } from '../../components';
import { spacing } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useAttendance,
  useAttendanceStatus,
  useBoxes,
  useDailyToday,
  useMe,
  useWallet,
  type BoxGrade,
} from '../../api/hooks';
import type { BottomTabScreenPropsFor } from '../../navigation/types';

const GRADE_LABEL: Record<BoxGrade, string> = {
  normal: '일반',
  rare: '레어',
  jackpot: '잭팟',
};

/** 학습 현황 통계 1칸. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 gap-xs">
      <AppText variant="caption" className="text-text-tertiary">
        {label}
      </AppText>
      <AppText variant="title" className="text-text-primary">
        {value}
      </AppText>
    </Card>
  );
}

/** 단어/한자 학습 진입 카드. */
function ModeCard({
  emoji,
  title,
  desc,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-1 active:scale-[0.98]" onPress={onPress}>
      <Card className="gap-sm">
        <AppText style={{ fontSize: 28 }}>{emoji}</AppText>
        <AppText variant="heading" className="text-text-primary">
          {title}
        </AppText>
        <AppText variant="caption" className="text-text-tertiary">
          {desc}
        </AppText>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<BottomTabScreenPropsFor<'Home'>['navigation']>();
  const c = useThemeColors();

  const me = useMe();
  const wallet = useWallet();
  const boxes = useBoxes();
  const daily = useDailyToday();
  const attendance = useAttendanceStatus();
  const checkIn = useAttendance();

  const [adFailed, setAdFailed] = useState(false);

  const gradeColor: Record<BoxGrade, string> = {
    normal: c['text-tertiary'],
    rare: c.brand,
    jackpot: c.amber,
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View className="gap-2xl px-xl pt-xl">
          {/* 1. 인사말 + 캐시 뱃지 */}
          <View className="flex-row items-center justify-between">
            <AppText variant="title" className="text-text-primary">
              안녕하세요, {me.data?.nickname ?? '게스트'}님 👋
            </AppText>
            <CashBadge amount={`${(wallet.data?.balance ?? 0).toLocaleString()} C`} />
          </View>

          {/* 2. 출석 스트릭 카드 */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between">
              <AppText variant="heading" className="text-text-primary">
                출석 체크
              </AppText>
              <View className="rounded-pill bg-amber-subtle px-md py-xs">
                <AppText variant="caption" className="text-amber">
                  🔥 {attendance.data?.streak_count ?? 0}일 연속
                </AppText>
              </View>
            </View>
            {attendance.isLoading ? (
              <ActivityIndicator color={c.brand} />
            ) : attendance.data?.checked_in ? (
              <AppText variant="body" className="text-brand">
                ✅ 오늘 출석 완료! (+{attendance.data.bonus_cash}C)
              </AppText>
            ) : (
              <View className="gap-md">
                <AppText variant="body" className="text-text-secondary">
                  오늘 출석하고 보너스 캐시를 받아보세요.
                </AppText>
                <Button
                  title="출석 체크"
                  onPress={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                />
              </View>
            )}
          </Card>

          {/* 3. 오늘의 학습 현황 (2칸) */}
          <View className="gap-md">
            <AppText variant="heading" className="text-text-primary">
              오늘의 학습 현황
            </AppText>
            {daily.isLoading ? (
              <ActivityIndicator color={c.brand} />
            ) : (
              <View className="flex-row" style={{ gap: spacing.md }}>
                <StatTile
                  label="푼 문제 / 정답"
                  value={`${daily.data?.quiz_count ?? 0} / ${daily.data?.correct_count ?? 0}`}
                />
                <StatTile label="획득한 상자" value={`${daily.data?.boxes_earned ?? 0}개`} />
              </View>
            )}
          </View>

          {/* 4. 단어 / 한자 학습 진입 */}
          <View className="gap-md">
            <AppText variant="heading" className="text-text-primary">
              학습 시작하기
            </AppText>
            <View className="flex-row" style={{ gap: spacing.md }}>
              <ModeCard
                emoji="📝"
                title="단어 퀴즈"
                desc="뜻 ↔ 단어 4지선다"
                onPress={() => navigation.navigate('Quiz')}
              />
              <ModeCard
                emoji="🈶"
                title="한자 퀴즈"
                desc="한자 ↔ 음훈독·뜻"
                onPress={() => navigation.navigate('Quiz')}
              />
            </View>
          </View>

          {/* 5. 상자 인벤토리 */}
          <View className="gap-md">
            <AppText variant="heading" className="text-text-primary">
              상자 인벤토리
            </AppText>
            {boxes.isLoading ? (
              <ActivityIndicator color={c.brand} />
            ) : !boxes.data || boxes.data.length === 0 ? (
              <AppText variant="caption" className="text-text-tertiary">
                퀴즈를 풀어 상자를 획득하세요!
              </AppText>
            ) : (
              <FlatList
                horizontal
                data={boxes.data}
                keyExtractor={(box) => String(box.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => navigation.navigate('BoxOpen', { boxIds: [item.id] })}
                    className="items-center justify-center rounded-lg active:scale-[0.98]"
                    style={{
                      width: 88,
                      height: 88,
                      backgroundColor: `${gradeColor[item.grade]}1F`,
                    }}>
                    <AppText style={{ fontSize: 28 }}>🎁</AppText>
                    <AppText variant="caption" style={{ color: gradeColor[item.grade] }}>
                      {GRADE_LABEL[item.grade]}
                    </AppText>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* 6. 하단 배너 광고 — 로드 실패 시 영역 자체를 숨김 */}
      {!adFailed && (
        <View className="items-center bg-bg-primary border-border-tertiary" style={{ borderTopWidth: 0.5 }}>
          <BannerAd
            unitId={Config.ADMOB_BANNER_HOME_ID || TestIds.BANNER}
            size={BannerAdSize.BANNER}
            onAdFailedToLoad={() => setAdFailed(true)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
