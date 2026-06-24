/**
 * 홈 화면 — 인사말/캐시 잔액, 출석 체크, 오늘의 학습 현황, 퀴즈 시작,
 * 상자 인벤토리, 하단 배너 광고.
 *
 * 에러는 각 훅의 isError를 명시적으로 보지 않고 ?? 기본값으로 조용히
 * fallback한다 — 홈은 어떤 API가 실패해도 크래시 없이 항상 떠 있어야 한다.
 */
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';

import { AppText, Button, Card } from '../../components';
import { colors, spacing } from '../../theme/tokens';
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

const GRADE_COLOR: Record<BoxGrade, string> = {
  normal: colors.textWeak,
  rare: colors.brand,
  jackpot: colors.warning,
};

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<BottomTabScreenPropsFor<'Home'>['navigation']>();

  const me = useMe();
  const wallet = useWallet();
  const boxes = useBoxes();
  const daily = useDailyToday();
  const attendance = useAttendanceStatus();
  const checkIn = useAttendance();

  const [adFailed, setAdFailed] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <ScrollView>
        {/* 1. 상단: 인사말 + 캐시 잔액 */}
        <View className="flex-row items-center justify-between bg-brand px-xl py-2xl">
          <AppText variant="title" className="text-white">
            안녕하세요, {me.data?.nickname ?? '게스트'}님 👋
          </AppText>
          <View
            className="rounded-pill px-md py-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <AppText variant="body" className="text-white">
              💰 {(wallet.data?.balance ?? 0).toLocaleString()} C
            </AppText>
          </View>
        </View>

        <View className="gap-2xl px-xl pt-2xl">
          {/* 2. 출석 체크 카드 */}
          <Card className="bg-surface rounded-lg gap-sm">
            {attendance.isLoading ? (
              <ActivityIndicator />
            ) : attendance.data?.checked_in ? (
              <AppText variant="body" className="text-success">
                ✅ 오늘 출석 완료! (+{attendance.data.bonus_cash}C)
              </AppText>
            ) : (
              <View className="gap-md">
                <AppText variant="body" className="text-text-strong">
                  오늘 출석 체크하고 보너스 캐시 받기
                </AppText>
                <Button
                  title="출석 체크"
                  onPress={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                />
              </View>
            )}
            <AppText variant="caption" className="text-text-weak">
              🔥 {attendance.data?.streak_count ?? 0}일 연속 출석 중
            </AppText>
          </Card>

          {/* 3. 오늘의 학습 현황 카드 */}
          <Card className="bg-surface rounded-lg gap-xs">
            <AppText variant="title" className="text-text-strong">
              오늘의 학습 현황
            </AppText>
            {daily.isLoading ? (
              <ActivityIndicator />
            ) : (
              <>
                <AppText variant="body" className="text-text">
                  오늘 푼 문제: {daily.data?.quiz_count ?? 0}개 / 정답:{' '}
                  {daily.data?.correct_count ?? 0}개
                </AppText>
                <AppText variant="body" className="text-text">
                  획득한 상자: {daily.data?.boxes_earned ?? 0}개
                </AppText>
              </>
            )}
          </Card>

          {/* 4. 퀴즈 시작 버튼 */}
          <Button
            title="퀴즈 시작하기 →"
            variant="filled"
            className="rounded-pill"
            onPress={() => navigation.navigate('Quiz')}
          />

          {/* 5. 상자 인벤토리 */}
          <View className="gap-md">
            <AppText variant="title" className="text-text-strong">
              상자 인벤토리
            </AppText>
            {boxes.isLoading ? (
              <ActivityIndicator />
            ) : !boxes.data || boxes.data.length === 0 ? (
              <AppText variant="caption" className="text-text-weak">
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
                    className="items-center justify-center rounded-lg"
                    style={{
                      width: 88,
                      height: 88,
                      backgroundColor: `${GRADE_COLOR[item.grade]}22`,
                    }}>
                    <AppText style={{ fontSize: 28 }}>🎁</AppText>
                    <AppText variant="caption" style={{ color: GRADE_COLOR[item.grade] }}>
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
        <View className="items-center bg-bg">
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
