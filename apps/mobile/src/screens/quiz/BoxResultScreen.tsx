/**
 * BoxResultScreen — 상자 개봉 결과.
 *
 * 역할이 둘이다:
 *  1. 이번에 얼마를 받았는지 **한 숫자로** 확정해서 보여준다
 *  2. **디스플레이 광고 자리** — 보상형과 달리 지급 의무가 없는 순수익원이다
 *     (수익 구조는 docs/캐시-경제-설계.md §4)
 *
 * 디자인 — 화면을 꾸미지 않고 **문장과 숫자로 말한다**:
 *  · 배경은 앱의 평소 면(테마를 따른다). 등급색으로 화면을 칠하던 어두운 무대는 버렸다.
 *  · 좌측 정렬. 제목 → 금액 → 한 줄. 시선이 위에서 아래로 한 번에 떨어진다.
 *  · 등급은 **작은 칩 하나**로만. 대신 귀한 등급은 상자 뒤 연출(`GradeFlair`)이 맡는다.
 *  · 금액 아래 한 줄에 **돈 얘기를 하지 않는다** — "약 N원" 같은 환산은 김이 샌다.
 *  · 잔액도 안 쓴다 — 홈 상단에 상시 노출되므로 여기서 또 말할 이유가 없다.
 *
 * ⚠️ 스택은 `replace`로만 이동한다(개봉 → 결과 → 다음 개봉). push로 쌓으면 뒤로가기가
 *    이미 연 상자로 돌아가고, 그 상자는 서버에서 409라 아무것도 못 한다.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';

import { AppText, Button, Icon } from '../../components';
import { fontFamily, radius } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { GRADE_COLOR, GRADE_LABEL, GRADE_NOTE } from '../../lib/boxGrade';
import type { MainStackScreenProps } from '../../navigation/types';

export default function BoxResultScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxResult'>): React.JSX.Element {
  const c = useThemeColors();
  const { result, remaining } = route.params;
  const hasNext = remaining.length > 0;
  const gradeColor = GRADE_COLOR[result.grade];

  // 묶음 상자는 개별 보상이 여러 개다. 없으면 총합 하나로 취급.
  const rewards = result.rewards ?? [result.reward_cash];
  const isBurst = rewards.length > 1;

  const leave = () => navigation.popToTop();
  // ⚠️ replace — 스택에 이미 연 상자를 남기지 않는다(뒤로가기 시 409).
  const goNext = () => navigation.replace('BoxOpen', { boxes: remaining });

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      <View className="px-xl" style={{ paddingTop: 8 }}>
        <Pressable
          onPress={leave}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="나가기"
          className="items-center justify-center rounded-full active:opacity-60"
          style={{ width: 36, height: 36, backgroundColor: c['bg-tertiary'] }}>
          <Icon name="close" size={18} color={c['text-secondary']} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(360)} className="px-xl" style={{ paddingTop: 24 }}>
          {/* 등급 칩 — 화면을 등급색으로 칠하지 않고 여기 한 곳에만 쓴다. */}
          <View
            className="self-start"
            style={{
              borderRadius: radius.sm,
              paddingHorizontal: 9,
              paddingVertical: 4,
              backgroundColor: `${gradeColor}1F`,
            }}>
            <AppText variant="micro" style={{ color: gradeColor, fontFamily: fontFamily.bold }}>
              {GRADE_LABEL[result.grade]} 상자
            </AppText>
          </View>

          <AppText
            className="text-text-primary"
            style={{
              fontFamily: fontFamily.bold,
              fontSize: 26,
              lineHeight: 35,
              letterSpacing: -0.8,
              marginTop: 14,
            }}>
            캐시를 받았어요
          </AppText>

          {/* 금액 — 이 화면의 히어로. 단위는 작게 붙여 숫자가 주인공이 되게. */}
          <View className="flex-row items-end" style={{ marginTop: 18 }}>
            <AppText
              className="text-text-primary"
              style={{ fontFamily: fontFamily.bold, fontSize: 58, lineHeight: 62, letterSpacing: -2.6 }}>
              {result.reward_cash.toLocaleString()}
            </AppText>
            <AppText
              className="text-text-tertiary"
              style={{ fontFamily: fontFamily.bold, fontSize: 22, marginLeft: 5, marginBottom: 7 }}>
              캐시
            </AppText>
          </View>

          <AppText variant="body" className="text-text-tertiary" style={{ marginTop: 10 }}>
            {GRADE_NOTE[result.grade]}
          </AppText>

          {/* 묶음이면 개별 내역 — 한 줄 합산보다 "3개를 열었다"가 눈에 남는다. */}
          {isBurst && (
            <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 16 }}>
              {rewards.map((amount, i) => (
                <View
                  key={`${i}-${amount}`}
                  className="bg-bg-tertiary"
                  style={{ borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <AppText
                    variant="caption"
                    className="text-text-secondary"
                    style={{ fontFamily: fontFamily.bold }}>
                    +{amount.toLocaleString()}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* 광고 — 옅은 면에 담아 화면의 한 구획으로 읽히게 한다.
            ⚠️ 면은 `bg-tertiary`여야 한다. `bg-secondary`는 **라이트에서 흰색**이라
               화면 배경(bg-primary)과 같은 색이 되어 액자가 통째로 사라진다.
            ⚠️ 높이를 고정해 둔다. 늦게 로드될 때 레이아웃이 밀리면 아래 버튼을 누르려던
               순간 위치가 바뀌어 오탭이 난다. */}
        <View className="mt-2xl items-center px-xl">
          <View
            className="w-full items-center bg-bg-tertiary"
            style={{ borderRadius: radius.lg, paddingTop: 8, paddingBottom: 10, maxWidth: 360 }}>
            <AppText
              variant="micro"
              className="text-text-tertiary"
              style={{ marginBottom: 8, letterSpacing: 0.4 }}>
              광고
            </AppText>
            <View style={{ height: 250, justifyContent: 'center' }}>
              <BannerAd
                unitId={Config.ADMOB_BANNER_HOME_ID || TestIds.BANNER}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 고정 CTA — 브랜드 민트. 앱의 주액션 색을 그대로 쓴다. */}
      <View className="px-xl" style={{ paddingTop: 10, paddingBottom: 20 }}>
        <Button
          title={hasNext ? '다음 상자 열기' : '홈으로'}
          size="lg"
          onPress={hasNext ? goNext : leave}
        />
      </View>
    </SafeAreaView>
  );
}
