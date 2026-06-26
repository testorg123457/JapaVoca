/**
 * 상자 개봉 화면.
 *
 * boxes(퀴즈/홈에서 획득한 미개봉 상자들 — id+grade)를 한 개씩 연다.
 * 등급이 높을수록 여는 데 필요한 **터치 수가 많다**(일반=1 … 잭팟=5).
 * 매 터치마다 상자가 한 바퀴(360°) 돌며 **한 등급씩 색이 상승**하고,
 * 마지막 터치에서 실제 서버 개봉이 일어나 보상이 드러난다.
 *   - 색: 일반(브라운)→레어(파랑)→에픽(보라)→전설(노랑)→잭팟(빨강).
 *   - 중간 터치는 순수 연출(서버 호출 없음), 마지막 터치에서만 openBox().
 *   - 보상 금액은 항상 서버가 확정한다(클라는 등급=연출용만 안다).
 *
 * 3개 개봉당 1회 보상형 광고를 띄우되, 광고가 미로드/실패/닫힘이면 블로킹 없이
 * 바로 개봉한다. 마지막 상자면 홈으로 돌아간다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon, PressableScale, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import type { BoxGrade } from '../../api/hooks';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';

const AD_EVERY = 3; // 상자 N개당 광고 1회.

const GRADE_LABEL: Record<BoxGrade, string> = {
  normal: '일반',
  rare: '레어',
  epic: '에픽',
  legendary: '전설',
  jackpot: '잭팟',
};

// tier = 등급 서열(0~4). 터치 수 = tier + 1.
const GRADE_TIER: Record<BoxGrade, number> = {
  normal: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  jackpot: 4,
};

const GRADE_TAG_VARIANT: Record<BoxGrade, 'neutral' | 'brand' | 'amber' | 'danger'> = {
  normal: 'neutral',
  rare: 'brand',
  epic: 'brand',
  legendary: 'amber',
  jackpot: 'danger',
};

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
  const c = useThemeColors();
  const { boxes } = route.params;
  const queryClient = useQueryClient();
  const { showThen } = useRewardedAd(Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED);

  // 등급 서열에 따른 색 시퀀스(브라운→파랑→보라→노랑→빨강). interpolateColor 입력 [0..4].
  const SEQUENCE_COLORS = [c.box, c.info, c.epic, c.amber, c.danger];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'opened'>('sealed');
  const [result, setResult] = useState<OpenBoxResult | null>(null);

  const box = boxes[currentIndex];
  const grade = box?.grade ?? 'normal';
  const tier = GRADE_TIER[grade];
  const tapsNeeded = tier + 1;

  const [tapsLeft, setTapsLeft] = useState(tapsNeeded);

  const openedCountRef = useRef(0);
  // 회전 애니 진행 중 추가 입력 무시(중간 터치) + 마지막 개봉 중복 방지.
  const animLockRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isLast = currentIndex >= boxes.length - 1;
  const remaining = boxes.length - currentIndex;

  // 회전 + 색 진행도(0=브라운 … tier=자기 등급색).
  const rotate = useSharedValue(0);
  const colorStep = useSharedValue(0);
  // sealed 상태에서 상자가 살짝 들썩이며 "눌러보세요"를 유도.
  const wobble = useSharedValue(0);
  useEffect(() => {
    if (phase === 'sealed') {
      wobble.value = withRepeat(
        withSequence(withTiming(-1, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true,
      );
    } else {
      wobble.value = withTiming(0, { duration: 200 });
    }
  }, [phase, wobble]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(colorStep.value, [0, 1, 2, 3, 4], SEQUENCE_COLORS),
    transform: [
      { translateY: wobble.value * 4 },
      { rotate: `${rotate.value + wobble.value * 2}deg` },
    ],
  }));

  const goHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const doOpen = useCallback(
    async (adShown: boolean) => {
      setPhase('opening');
      try {
        const res = await openBox(box.id, adShown);
        if (!mountedRef.current) {
          return;
        }
        setResult(res);
        setPhase('opened');
        openedCountRef.current += 1;
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['boxes', 'unopened'] });
        queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }
        // 409 = 이미 개봉됨(더블탭의 두 번째 요청 등). 첫 요청이 성공해 캐시는
        // 이미 지급됐으므로 실패가 아니다 — 상태만 잠그고 사용자를 막지 않는다.
        if ((error as AxiosError).response?.status === 409) {
          setPhase('opened');
          return;
        }
        animLockRef.current = false;
        setPhase('sealed');
        Alert.alert('오류', '상자 개봉에 실패했어요. 잠시 후 다시 시도해주세요.', [
          { text: '확인', onPress: goHome },
        ]);
      }
    },
    [box, queryClient, goHome],
  );

  function handleTap() {
    if (phase !== 'sealed' || animLockRef.current) {
      return;
    }
    rotate.value = withTiming(rotate.value + 360, { duration: 480 });

    if (tapsLeft > 1) {
      // 중간 터치 — 한 등급 색 상승. 서버 호출 없음.
      animLockRef.current = true;
      const nextStep = Math.min(tier + 2 - tapsLeft, tier); // 이번 탭 후 도달 색 단계
      colorStep.value = withTiming(nextStep, { duration: 480 });
      setTapsLeft((n) => n - 1);
      setTimeout(() => {
        animLockRef.current = false;
      }, 300);
      return;
    }

    // 마지막 터치 — 실제 개봉.
    animLockRef.current = true;
    const isAdTurn = (openedCountRef.current + 1) % AD_EVERY === 0;
    if (isAdTurn) {
      showThen(() => doOpen(true));
    } else {
      doOpen(false);
    }
  }

  function handleNext() {
    if (isLast) {
      goHome();
      return;
    }
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setTapsLeft(GRADE_TIER[boxes[next].grade] + 1);
    setPhase('sealed');
    setResult(null);
    rotate.value = 0;
    colorStep.value = 0;
    animLockRef.current = false; // 다음 상자 탭 허용.
  }

  const tapHint =
    tapsLeft > 1 ? `${tapsLeft}번 더 탭!` : tapsNeeded > 1 ? '마지막 탭! 열기' : '탭해서 열기';

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      {/* 상단 */}
      <View className="items-center gap-xs px-xl py-lg">
        <AppText variant="title" className="text-text-primary">
          상자 개봉
        </AppText>
        <Tag label={`남은 상자 ${Math.max(0, remaining)}개`} variant="neutral" />
      </View>

      {/* 중앙 상자 카드 */}
      <View className="flex-1 items-center justify-center px-xl">
        {phase === 'opened' && result ? (
          <RewardReveal result={result} />
        ) : (
          <View className="items-center gap-lg">
            <PressableScale
              onPress={handleTap}
              disabled={phase !== 'sealed'}
              pressedScale={0.95}>
              <Animated.View
                className="items-center justify-center rounded-xl"
                style={[{ width: 240, height: 240 }, boxStyle]}>
                {phase === 'opening' ? (
                  <ActivityIndicator color={c['on-brand']} />
                ) : (
                  <Icon name="gift" size={96} color={c['on-brand']} strokeWidth={1.6} />
                )}
              </Animated.View>
            </PressableScale>

            {/* 진행 점 — 등급이 2단계 이상일 때만(탭 수 표시). */}
            {tapsNeeded > 1 && (
              <View className="flex-row gap-xs">
                {Array.from({ length: tapsNeeded }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        i < tapsNeeded - tapsLeft ? SEQUENCE_COLORS[tier] : c['border-secondary'],
                    }}
                  />
                ))}
              </View>
            )}

            <AppText variant="subheading" className="text-text-secondary">
              {tapHint}
            </AppText>
          </View>
        )}
      </View>

      {/* 하단 */}
      <View className="px-xl pb-lg">
        <Button
          title={isLast ? '홈으로' : '다음 상자'}
          onPress={handleNext}
          disabled={phase !== 'opened'}
        />
      </View>
    </SafeAreaView>
  );
}

/** 개봉 결과 연출 — 등급별 색 + 캐시 금액 애니메이션, 상위 등급 파티클. */
function RewardReveal({ result }: { result: OpenBoxResult }): React.JSX.Element {
  const c = useThemeColors();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.25, { duration: 200 }), withSpring(1));
  }, [scale]);

  const amountStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const { grade, reward_cash } = result;
  const gradeColor: Record<BoxGrade, string> = {
    normal: c['text-secondary'],
    rare: c.info,
    epic: c.epic,
    legendary: c.amber,
    jackpot: c.danger,
  };
  const showParticles = grade === 'legendary' || grade === 'jackpot';

  return (
    <Animated.View entering={FadeInUp} className="items-center gap-md">
      {showParticles && <RewardParticles />}
      <Tag
        label={GRADE_LABEL[grade]}
        variant={GRADE_TAG_VARIANT[grade]}
        leftIcon={grade === 'normal' ? 'gift' : 'sparkles'}
      />
      <Animated.View style={amountStyle} className="flex-row items-end">
        <Icon name="coin" size={34} color={c.amber} />
        <AppText variant="hero" style={{ color: gradeColor[grade], marginLeft: 8 }}>
          {reward_cash.toLocaleString()}
        </AppText>
        <AppText variant="title" style={{ color: gradeColor[grade], marginBottom: 6, marginLeft: 2 }}>
          C
        </AppText>
      </Animated.View>
      <AppText variant="caption" className="text-text-tertiary">
        잔액 {result.balance_after.toLocaleString()}C
      </AppText>
    </Animated.View>
  );
}

/** lottie 없이 이모지로 대체한 축하 파티클(연출 목적이라 이모지 유지). */
function RewardParticles(): React.JSX.Element {
  const particles = ['🎉', '✨', '🎊', '⭐', '💫', '🎉', '✨', '⭐'];
  return (
    <View className="absolute" style={{ width: 280, height: 140 }} pointerEvents="none">
      {particles.map((emoji, i) => (
        <Animated.Text
          key={i}
          entering={FadeIn.delay(i * 60)}
          style={{
            position: 'absolute',
            left: (i * 34) % 260,
            top: (i % 2) * 80,
            fontSize: 24,
          }}>
          {emoji}
        </Animated.Text>
      ))}
    </View>
  );
}
