/**
 * 상자 개봉 화면.
 *
 * boxIds(퀴즈에서 획득한 미개봉 상자들)를 한 개씩 연다. 3개당 1회 보상형
 * 광고를 띄우되, 광고가 미로드/실패/닫힘이면 블로킹 없이 바로 개봉한다.
 * 개봉 보상(캐시)은 서버가 확정하며, 등급별 연출을 보여준 뒤 다음 상자로
 * 넘어가고 마지막이면 홈으로 돌아간다.
 *
 * 디자인: 큰 상자를 탭하면 부드럽게 보상이 드러나는 연출. 등급별 색으로 강약(잭팟=옐로).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
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
  jackpot: '잭팟',
};

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
  const c = useThemeColors();
  const { boxIds } = route.params;
  const queryClient = useQueryClient();
  const { showThen } = useRewardedAd(Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'opened'>('idle');
  const [result, setResult] = useState<OpenBoxResult | null>(null);

  const openedCountRef = useRef(0);
  // 동기 락 — phase(state) 갱신 전 더블탭이 같은 상자를 두 번 여는 것을 막는다.
  const openLockRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const boxId = boxIds[currentIndex];
  const isLast = currentIndex >= boxIds.length - 1;
  const remaining = boxIds.length - currentIndex;

  // idle 상태에서 상자가 살짝 들썩이며 "눌러보세요"를 유도.
  const wobble = useSharedValue(0);
  useEffect(() => {
    if (phase === 'idle') {
      wobble.value = withRepeat(withSequence(withTiming(-1, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
    } else {
      wobble.value = withTiming(0, { duration: 200 });
    }
  }, [phase, wobble]);
  const wobbleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: wobble.value * 4 }, { rotate: `${wobble.value * 2}deg` }] }));

  const goHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const doOpen = useCallback(
    async (adShown: boolean) => {
      setPhase('opening');
      try {
        const res = await openBox(boxId, adShown);
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
        openLockRef.current = false;
        setPhase('idle');
        Alert.alert('오류', '상자 개봉에 실패했어요. 잠시 후 다시 시도해주세요.', [
          { text: '확인', onPress: goHome },
        ]);
      }
    },
    [boxId, queryClient, goHome],
  );

  function handleTap() {
    if (openLockRef.current || phase !== 'idle') {
      return;
    }
    openLockRef.current = true;
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
    setCurrentIndex((i) => i + 1);
    setPhase('idle');
    setResult(null);
    openLockRef.current = false; // 다음 상자 탭 허용.
  }

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
          <PressableScale
            onPress={handleTap}
            disabled={phase !== 'idle'}
            pressedScale={0.95}
            className="items-center justify-center rounded-xl bg-bg-primary"
            style={{ width: 240, height: 240, borderWidth: 1, borderColor: c['border-tertiary'] }}>
            {phase === 'opening' ? (
              <ActivityIndicator color={c.brand} />
            ) : (
              <Animated.View className="items-center" style={wobbleStyle}>
                <Icon name="gift" size={96} color={c.brand} strokeWidth={1.6} />
                <AppText variant="subheading" className="mt-lg text-text-secondary">
                  탭해서 열기
                </AppText>
              </Animated.View>
            )}
          </PressableScale>
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

/** 개봉 결과 연출 — 등급별 색 + 캐시 금액 애니메이션, jackpot 파티클. */
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
    rare: c.brand,
    jackpot: c.amber,
  };
  const gradeTagVariant = grade === 'jackpot' ? 'amber' : grade === 'rare' ? 'brand' : 'neutral';

  return (
    <Animated.View entering={FadeInUp} className="items-center gap-md">
      {grade === 'jackpot' && <JackpotParticles />}
      <Tag label={GRADE_LABEL[grade]} variant={gradeTagVariant} leftIcon={grade === 'normal' ? 'gift' : 'sparkles'} />
      <Animated.View style={amountStyle} className="flex-row items-end" >
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

/** lottie 없이 이모지로 대체한 잭팟 파티클(축하 연출이라 이모지 유지). */
function JackpotParticles(): React.JSX.Element {
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
