import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon } from '../../components';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';
import { mint, yellow } from '../../theme/tokens';

const AD_EVERY = 3;

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
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
  const isLast = currentIndex >= boxes.length - 1;
  const remaining = boxes.length - currentIndex;

  const doOpen = useCallback(
    async (adShown: boolean) => {
      setPhase('opening');
      lottieRef.current?.play();

      try {
        const [res] = await Promise.all([
          openBox(box.id, adShown),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
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
    setCurrentIndex((i) => i + 1);
    setPhase('sealed');
    setResult(null);
    lockRef.current = false;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: mint[900] }}
      edges={['top', 'bottom']}
    >
      {/* 상단 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
      }}>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={18} color="rgba(255,255,255,0.65)" />
        </Pressable>

        <View style={{
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 5,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}>
          <AppText variant="label" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {remaining}개 남음
          </AppText>
        </View>
      </View>

      {/* 중앙 */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* 상자 뒤 glow */}
        <View style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: mint[700],
          opacity: 0.55,
        }} />
        <View style={{
          position: 'absolute',
          width: 230,
          height: 230,
          borderRadius: 115,
          backgroundColor: mint[500],
          opacity: 0.12,
        }} />

        {/* Lottie */}
        <LottieView
          key={currentIndex}
          ref={lottieRef}
          source={require('../../assets/gift-box-animation.json')}
          autoPlay={false}
          loop={false}
          speed={1.6}
          style={{ width: 290, height: 290 }}
        />

        {/* 보상 — 개봉 후 표시 */}
        {phase === 'revealed' && result && (
          <Animated.View
            entering={FadeInUp.duration(380)}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <AppText
              variant="label"
              style={{ color: 'rgba(255,255,255,0.38)', marginBottom: 14, letterSpacing: -0.2 }}
            >
              캐시를 획득했어요
            </AppText>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              {/* 코인 아이콘 */}
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: yellow[400],
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
                shadowColor: yellow[400],
                shadowOpacity: 0.55,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}>
                <AppText style={{ color: '#7A6100', fontWeight: '900', fontSize: 15 }}>C</AppText>
              </View>

              <AppText style={{
                fontSize: 52,
                fontWeight: '800',
                color: yellow[400],
                letterSpacing: -2,
                lineHeight: 56,
              }}>
                {result.reward_cash.toLocaleString()}
              </AppText>

              <AppText style={{
                fontSize: 22,
                fontWeight: '700',
                color: `${yellow[400]}88`,
                marginBottom: 10,
              }}>
                C
              </AppText>
            </View>

            <AppText
              variant="caption"
              style={{ color: 'rgba(255,255,255,0.26)', marginTop: 6 }}
            >
              잔액 {result.balance_after.toLocaleString()} C
            </AppText>
          </Animated.View>
        )}
      </View>

      {/* 하단 버튼 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
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
