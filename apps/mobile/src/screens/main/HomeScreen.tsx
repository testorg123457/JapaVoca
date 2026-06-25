/**
 * 홈 화면 — 인사말, 캐시 잔액 hero(그라데이션), 출석 스트릭, 오늘의 학습 현황,
 * 단어·한자 학습 진입, 상자 인벤토리.
 * (배너 광고는 BottomTabNavigator의 전역 배너로 이동 — 모든 메인 화면 공통.)
 *
 * 디자인 원칙: 화면을 열면 시선이 "캐시 잔액 hero"에 먼저 닿고(=핵심 보상), 그다음
 * 출석→학습으로 자연스럽게 흐른다. 섹션은 SectionHeader로 위계를 통일하고, 카드/칩/
 * 아이콘은 공용 컴포넌트로. 색은 기능적으로만(민트=액션, 옐로=캐시, 회색=중립).
 *
 * 에러는 각 훅의 isError를 보지 않고 ?? 기본값으로 조용히 fallback한다 —
 * 홈은 어떤 API가 실패해도 크래시 없이 항상 떠 있어야 한다.
 */
import React from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  AppText,
  Button,
  Card,
  Gradient,
  Icon,
  PressableScale,
  SectionHeader,
  Tag,
} from '../../components';
import { gradients, hairline, spacing, yellow } from '../../theme/tokens';
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
import type { IconName } from '../../components';

const GRADE_LABEL: Record<BoxGrade, string> = {
  normal: '일반',
  rare: '레어',
  jackpot: '잭팟',
};

/** 학습 현황 통계 1칸 — 카드 박스 없이 아이콘 + 값 + 라벨 인라인. */
function StatItem({ icon, label, value, accent }: { icon: IconName; label: string; value: string; accent: string }) {
  return (
    <View className="flex-1 flex-row items-center" style={{ gap: 10 }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 38, height: 38, backgroundColor: `${accent}1A` }}>
        <Icon name={icon} size={20} color={accent} />
      </View>
      <View className="gap-xs">
        <AppText variant="title" className="text-text-primary">
          {value}
        </AppText>
        <AppText variant="caption" className="text-text-tertiary">
          {label}
        </AppText>
      </View>
    </View>
  );
}

/** 단어/한자 학습 진입 카드 — 아이콘 배지 + 제목 + 설명. */
function ModeCard({
  icon,
  title,
  desc,
  onPress,
  accent,
  accentBg,
}: {
  icon: IconName;
  title: string;
  desc: string;
  onPress: () => void;
  /** 아이콘색 — 카테고리별로 다르게(단어=vermilion, 한자=coral). */
  accent: string;
  accentBg: string;
}) {
  return (
    <View className="flex-1">
      <Card onPress={onPress} className="gap-md">
        <View
          className="items-center justify-center rounded-md"
          style={{ width: 44, height: 44, backgroundColor: accentBg }}>
          <Icon name={icon} size={24} color={accent} />
        </View>
        <View className="gap-xs">
          <AppText variant="subheading" className="text-text-primary">
            {title}
          </AppText>
          <AppText variant="caption" className="text-text-tertiary">
            {desc}
          </AppText>
        </View>
      </Card>
    </View>
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

  const gradeColor: Record<BoxGrade, string> = {
    normal: c['text-tertiary'],
    rare: c.brand,
    jackpot: c.amber,
  };

  const balance = wallet.data?.balance ?? 0;
  const totalEarned = wallet.data?.total_earned ?? 0;
  const streak = attendance.data?.streak_count ?? 0;
  const checkedIn = attendance.data?.checked_in ?? false;

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <View className="gap-xl px-xl pt-md">
          {/* 1. 인사말 */}
          <View className="flex-row items-center justify-between pt-sm">
            <View>
              <AppText variant="caption" className="text-text-tertiary">
                안녕하세요 👋
              </AppText>
              <AppText variant="title" className="text-text-primary">
                {me.data?.nickname ?? '게스트'}님
              </AppText>
            </View>
          </View>

          {/* 2. 캐시 잔액 hero — 시선이 가장 먼저 닿는 곳 */}
          <PressableScale onPress={() => navigation.navigate('Wallet')} pressedScale={0.98}>
            <View
              className="overflow-hidden rounded-xl p-xl"
              style={{
                shadowColor: c.brand,
                shadowOpacity: 0.32,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}>
              <Gradient colors={gradients.brand} direction="diagonal" />
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Icon name="coin" size={18} color={yellow[400]} />
                  <AppText variant="label" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    내 캐시
                  </AppText>
                </View>
                <View className="flex-row items-center" style={{ gap: 2 }}>
                  <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    지갑
                  </AppText>
                  <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.92)" strokeWidth={2.4} />
                </View>
              </View>
              <View className="mt-md flex-row items-end" style={{ gap: 4 }}>
                <AppText variant="hero" className="text-on-brand">
                  {balance.toLocaleString()}
                </AppText>
                <AppText variant="title" className="text-on-brand" style={{ marginBottom: 6, opacity: 0.9 }}>
                  C
                </AppText>
              </View>
              <View
                className="mt-md self-start rounded-full px-md py-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <AppText variant="micro" className="text-on-brand" style={{ fontSize: 12 }}>
                  누적 {totalEarned.toLocaleString()}C 적립
                </AppText>
              </View>
            </View>
          </PressableScale>

          {/* 3. 출석 스트릭 카드 */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between">
              <AppText variant="heading" className="text-text-primary">
                출석 체크
              </AppText>
              <Tag label={`${streak}일 연속`} variant="amber" leftIcon="flame" />
            </View>
            {attendance.isLoading ? (
              <ActivityIndicator color={c.brand} />
            ) : checkedIn ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Icon name="check-circle" size={20} color={c.success} />
                <AppText variant="body" className="text-text-secondary">
                  오늘 출석 완료! (+{attendance.data?.bonus_cash ?? 0}C)
                </AppText>
              </View>
            ) : (
              <View className="gap-md">
                <AppText variant="body" className="text-text-secondary">
                  오늘 출석하고 보너스 캐시를 받아보세요.
                </AppText>
                <Button title="출석 체크" leftIcon="check" onPress={() => checkIn.mutate()} loading={checkIn.isPending} />
              </View>
            )}
          </Card>

          {/* 4. 오늘의 학습 현황 — 카드 박스 대신 구분선 인라인 통계 */}
          <View className="gap-md">
            <SectionHeader title="오늘의 학습 현황" />
            {daily.isLoading ? (
              <ActivityIndicator className="self-start" color={c.brand} />
            ) : (
              <View className="flex-row items-center py-xs">
                <StatItem
                  icon="check-circle"
                  label="푼 문제 / 정답"
                  value={`${daily.data?.quiz_count ?? 0} / ${daily.data?.correct_count ?? 0}`}
                  accent={c.success}
                />
                <View className="self-stretch" style={{ width: hairline, backgroundColor: c['border-secondary'] }} />
                <StatItem
                  icon="gift"
                  label="획득한 상자"
                  value={`${daily.data?.boxes_earned ?? 0}개`}
                  accent={c.amber}
                />
              </View>
            )}
          </View>

          {/* 5. 학습 시작하기 */}
          <View className="gap-md">
            <SectionHeader title="학습 시작하기" />
            <View className="flex-row" style={{ gap: spacing.md }}>
              <ModeCard
                icon="book"
                title="단어 퀴즈"
                desc="뜻 ↔ 단어 4지선다"
                onPress={() => navigation.navigate('Quiz')}
                accent={c.brand}
                accentBg={c['brand-subtle']}
              />
              <ModeCard
                icon="pencil"
                title="한자 퀴즈"
                desc="한자 ↔ 음훈독·뜻"
                onPress={() => navigation.navigate('Quiz')}
                accent={c.coral}
                accentBg={c['coral-subtle']}
              />
            </View>
          </View>

          {/* 6. 상자 인벤토리 */}
          <View className="gap-md">
            <SectionHeader title="상자 인벤토리" />
            {boxes.isLoading ? (
              <Card variant="flat">
                <ActivityIndicator color={c.brand} />
              </Card>
            ) : !boxes.data || boxes.data.length === 0 ? (
              <Card variant="flat" className="items-center gap-sm py-2xl">
                <Icon name="gift" size={28} color={c['text-tertiary']} />
                <AppText variant="caption" className="text-text-tertiary">
                  퀴즈를 풀어 상자를 획득하세요!
                </AppText>
              </Card>
            ) : (
              <FlatList
                horizontal
                data={boxes.data}
                keyExtractor={(box) => String(box.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md }}
                renderItem={({ item }) => (
                  <PressableScale
                    onPress={() => navigation.navigate('BoxOpen', { boxIds: [item.id] })}
                    pressedScale={0.96}
                    className="items-center justify-center rounded-lg"
                    style={{ width: 92, height: 92, gap: 6, backgroundColor: `${gradeColor[item.grade]}1A` }}>
                    <Icon name="gift" size={30} color={gradeColor[item.grade]} />
                    <AppText variant="micro" style={{ color: gradeColor[item.grade], fontSize: 12 }}>
                      {GRADE_LABEL[item.grade]}
                    </AppText>
                  </PressableScale>
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
