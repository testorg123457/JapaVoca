/**
 * 상자 개봉 화면.
 *
 * 상자 열기 버튼 → Lottie 애니메이션 재생 + 서버 개봉 병렬 진행.
 * 2.5초 경과 & 서버 응답 완료 후 코인 보상 표시.
 * 3개 개봉당 1회 보상형 광고.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon, Tag } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import type { BoxGrade } from '../../api/hooks';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';

const AD_EVERY = 3;

const GRADE_LABEL: Record<BoxGrade, string> = {
  normal: '일반',
  rare: '레어',
  epic: '에픽',
  legendary: '전설',
  jackpot: '잭팟',
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'revealed'>('sealed');
  const [result, setResult] = useState<OpenBoxResult | null>(null);

  const lottieRef = useRef<LottieView>(null);
  const openedCountRef = useRef(0);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const box = boxes[currentIndex];
  const grade = box?.grade ?? 'normal';
  const isLast = currentIndex >= boxes.length - 1;
  const remaining = boxes.length - currentIndex;

  const gradeColor: Record<BoxGrade, string> = {
    normal: c['text-secondary'],
    rare: c.info,
    epic: c.epic,
    legendary: c.amber,
    jackpot: c.danger,
  };

  const doOpen = useCallback(
    async (adShown: boolean) => {
      setPhase('opening');
      lottieRef.current?.play();

      try {
        const [res] = await Promise.all([
          openBox(box.id, adShown),
          new Promise<void>((resolve) => setTimeout(resolve, 2500)),
        ]);
        if (!mountedRef.current) { return; }
        setResult(res as OpenBoxResult);
        setPhase('revealed');
        openedCountRef.current += 1;
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['boxes', 'unopened'] });
        queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
      } catch (error) {
        if (!mountedRef.current) { return; }
        if ((error as AxiosError).response?.status === 409) {
          setPhase('revealed');
          return;
        }
        lockRef.current = false;
        setPhase('sealed');
        Alert.alert('오류', '상자 개봉에 실패했어요. 잠시 후 다시 시도해주세요.', [
          { text: '확인', onPress: () => navigation.navigate('Home') },
        ]);
      }
    },
    [box, queryClient, navigation],
  );

  function handleOpen() {
    if (lockRef.current || phase !== 'sealed') { return; }
    lockRef.current = true;
    const isAdTurn = (openedCountRef.current + 1) % AD_EVERY === 0;
    if (isAdTurn) {
      showThen(() => doOpen(true));
    } else {
      doOpen(false);
    }
  }

  function handleNext() {
    if (isLast) {
      navigation.navigate('Home');
      return;
    }
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setPhase('sealed');
    setResult(null);
    lockRef.current = false;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      {/* 상단 */}
      <View className="items-center gap-xs px-xl py-lg">
        <AppText variant="title" className="text-text-primary">상자 개봉</AppText>
        <Tag label={`남은 상자 ${Math.max(0, remaining)}개`} variant="neutral" />
      </View>

      {/* 중앙 */}
      <View className="flex-1 items-center justify-center gap-xl px-xl">
        <Tag
          label={GRADE_LABEL[grade]}
          variant={GRADE_TAG_VARIANT[grade]}
          leftIcon={grade === 'normal' ? 'gift' : 'sparkles'}
        />

        <LottieView
          key={currentIndex}
          ref={lottieRef}
          source={require('../../assets/gift-box-animation.json')}
          autoPlay={false}
          loop={false}
          style={{ width: 260, height: 260 }}
        />

        {/* 코인 보상 — 서버 응답 + 2.5초 경과 후 표시 */}
        {phase === 'revealed' && result && (
          <Animated.View entering={FadeInUp} className="items-center gap-sm">
            <View className="flex-row items-end" style={{ gap: 6 }}>
              <Icon name="coin" size={32} color={c.amber} />
              <AppText variant="hero" style={{ color: gradeColor[grade] }}>
                {result.reward_cash.toLocaleString()}
              </AppText>
              <AppText variant="title" style={{ color: gradeColor[grade], marginBottom: 4 }}>
                C
              </AppText>
            </View>
            <AppText variant="caption" className="text-text-tertiary">
              잔액 {result.balance_after.toLocaleString()}C
            </AppText>
          </Animated.View>
        )}
      </View>

      {/* 하단 버튼 */}
      <View className="px-xl pb-lg">
        {phase === 'sealed' ? (
          <Button title="상자 열기" onPress={handleOpen} />
        ) : (
          <Button
            title={isLast ? '홈으로' : '다음 상자 열기'}
            onPress={handleNext}
            disabled={phase !== 'revealed'}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
