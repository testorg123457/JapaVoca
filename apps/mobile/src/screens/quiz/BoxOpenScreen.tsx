/**
 * 상자 개봉 화면.
 *
 * boxIds(퀴즈에서 획득한 미개봉 상자들)를 한 개씩 연다. 3개당 1회 보상형
 * 광고를 띄우되, 광고가 미로드/실패/닫힘이면 블로킹 없이 바로 개봉한다.
 * 개봉 보상(캐시)은 서버가 확정하며, 등급별 연출을 보여준 뒤 다음 상자로
 * 넘어가고 마지막이면 홈으로 돌아간다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button } from '../../components';
import { colors } from '../../theme/tokens';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import type { BoxGrade } from '../../api/hooks';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';

const AD_EVERY = 3; // 상자 N개당 광고 1회.

const GRADE_COLOR: Record<BoxGrade, string> = {
  normal: colors.textWeak,
  rare: colors.brand,
  jackpot: colors.warning,
};

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
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

  const goHome = useCallback(() => {
    navigation.navigate('BottomTab', { screen: 'Home' });
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
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* 상단 */}
      <View className="items-center px-xl py-lg">
        <AppText variant="title" className="text-text-strong">
          상자 개봉
        </AppText>
        <AppText variant="caption" className="text-text-weak">
          남은 상자 {Math.max(0, remaining)}개
        </AppText>
      </View>

      {/* 중앙 상자 카드 */}
      <View className="flex-1 items-center justify-center px-xl">
        {phase === 'opened' && result ? (
          <RewardReveal result={result} />
        ) : (
          <Pressable
            onPress={handleTap}
            disabled={phase !== 'idle'}
            className="items-center justify-center rounded-xl bg-surface"
            style={{ width: 220, height: 220 }}>
            {phase === 'opening' ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <>
                <AppText style={{ fontSize: 80 }}>🎁</AppText>
                <AppText variant="body" className="mt-md text-text">
                  탭해서 열기
                </AppText>
              </>
            )}
          </Pressable>
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

/** 개봉 결과 연출 — 등급별 텍스트 + 캐시 금액 애니메이션, jackpot 파티클. */
function RewardReveal({ result }: { result: OpenBoxResult }): React.JSX.Element {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.25, { duration: 200 }), withSpring(1));
  }, [scale]);

  const amountStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const { grade, reward_cash } = result;
  const label =
    grade === 'jackpot'
      ? `🎊 ${reward_cash}C 잭팟!!`
      : grade === 'rare'
        ? `✨ ${reward_cash}C 레어!`
        : `💰 ${reward_cash}C`;

  return (
    <Animated.View entering={FadeInUp} className="items-center gap-md">
      {grade === 'jackpot' && <JackpotParticles />}
      <Animated.View style={amountStyle}>
        <AppText variant="display" style={{ color: GRADE_COLOR[grade] }}>
          {label}
        </AppText>
      </Animated.View>
      <AppText variant="caption" className="text-text-weak">
        잔액 {result.balance_after.toLocaleString()}C
      </AppText>
    </Animated.View>
  );
}

/** lottie 없이 이모지로 대체한 잭팟 파티클. */
function JackpotParticles(): React.JSX.Element {
  const particles = ['🎉', '✨', '🎊', '⭐', '💫', '🎉', '✨', '⭐'];
  return (
    <View className="absolute" style={{ width: 260, height: 120 }} pointerEvents="none">
      {particles.map((emoji, i) => (
        <Animated.Text
          key={i}
          entering={FadeIn.delay(i * 60)}
          style={{
            position: 'absolute',
            left: (i * 32) % 240,
            top: (i % 2) * 70,
            fontSize: 22,
          }}>
          {emoji}
        </Animated.Text>
      ))}
    </View>
  );
}
