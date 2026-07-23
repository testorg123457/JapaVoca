import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon, PressableScale } from '../../components';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import { useMe } from '../../api/hooks';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';
import { yellow } from '../../theme/tokens';
import { boxBurstHeight, boxBurstLayout, slotRect } from './boxBurstLayout';
import { boxGradeStyle } from './boxGradeStyle';
import { BoxBackdrop } from './components/BoxBackdrop';

const AD_EVERY = 3;

/** 상자를 놓는 영역의 좌우 여백. */
const STAGE_PAD = 24;
/** 상자가 터진 뒤 캐시 칩이 뜨기까지의 지연(ms). 터지는 순간에 맞춘다. */
const CHIP_DELAY_MS = 520;
/** 여러 개를 한 번에 열 때의 시차(ms). 동시에 터지면 무엇이 앞인지 안 읽힌다. */
const BURST_STAGGER_MS = 130;
/**
 * 보상 문구 자리. 개봉 전에도 이 높이를 비워 둔다.
 * ⚠️ 조건부로 렌더하면 보상이 뜨는 순간 중앙 정렬이 다시 계산돼 재생 중인 상자가
 *    위로 점프한다(끊겨 보이는 원인). 자리를 미리 잡아 레이아웃을 고정한다.
 */
const REWARD_SLOT_H = 172;
/** 상자 무대와 보상 문구 사이 간격. 파티클이 상자 아래로 떨어지므로 넉넉히 둔다. */
const REWARD_GAP = 96;

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
  const { boxes } = route.params;
  const queryClient = useQueryClient();
  const me = useMe();
  const { showThen } = useRewardedAd(
    Config.ADMOB_REWARDED_BOX_ID || TestIds.REWARDED,
    me.data ? { userId: me.data.id, context: 'box_open' } : undefined,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'revealed'>('sealed');
  const [result, setResult] = useState<OpenBoxResult | null>(null);
  /** 이미 열린 상자의 슬롯 번호. 묶음은 탭할 때마다 하나씩 열린다. */
  const [openedSlots, setOpenedSlots] = useState<number[]>([]);
  // 409(이미 개봉됨) — 보상 금액을 알 수 없어 안내 문구로 대체(빈 화면 방지).
  const [alreadyOpened, setAlreadyOpened] = useState(false);

  const { width: screenW } = useWindowDimensions();
  const box = boxes[currentIndex];

  // 묶음 여부는 서버가 상자 생성 시 정한 burst_count로, 개봉 전부터 알 수 있다.
  // 그래서 화면에 들어온 순간부터 상자가 3개로 놓인다.
  const burstCount = Math.max(1, box?.burst_count ?? 1);
  // 상자 무대는 좌우 패딩 없이 화면 폭을 다 쓴다 — 옆 상자를 최대한 크게 두기 위해.
  const slots = useMemo(() => boxBurstLayout(burstCount, screenW), [burstCount, screenW]);
  const stageH = boxBurstHeight(slots);
  /** 가운데부터 열리도록 한 재생 순서(가운데 → 좌 → 우). */
  const playOrder = useMemo(() => (slots.length === 3 ? [1, 0, 2] : [0]), [slots]);

  const lottieRefs = useRef<(LottieView | null)[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openedCountRef = useRef(0);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * 캐시 갱신은 개봉 애니메이션이 끝난 뒤로 미룬다.
   * 보상이 뜨는 순간 invalidate를 돌리면 홈의 쿼리 재요청·리렌더가 JS 스레드를 잡아
   * 재생 중인 프레임이 떨어진다. 예약해 두고 애니메이션 종료(onAnimationFinish)에
   * 흘려보내되, 그 전에 화면을 뜨거나 다음 상자로 넘어가면 그때 흘린다(유실 방지).
   */
  const pendingRefreshRef = useRef(false);
  const flushRefresh = useCallback(() => {
    if (!pendingRefreshRef.current) { return; }
    pendingRefreshRef.current = false;
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['boxes', 'unopened'] });
    queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
  }, [queryClient]);
  const flushRef = useRef(flushRefresh);
  flushRef.current = flushRefresh;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    flushRef.current();
  }, []);

  const isLast = currentIndex >= boxes.length - 1;
  const remaining = boxes.length - currentIndex;

  // 등급은 인벤토리에서 넘어온 box.grade로 개봉 전(밀봉)부터 공개.
  // 배경·glow·뱃지는 등급별 설정 한 곳에서(boxGradeStyle).
  const gradeStyle = boxGradeStyle(box.grade);

  const allOpened = phase === 'revealed' && openedSlots.length >= slots.length;

  // 개별 보상. 서버가 rewards를 안 주는 구버전이면 총합 1개로 취급한다.
  const rewards: number[] = result
    ? (result.rewards ?? [result.reward_cash])
    : [];

  const doOpen = useCallback(
    async (adShown: boolean, targets: number[]) => {
      setPhase('opening');
      playSlots(targets);

      try {
        const [res] = await Promise.all([
          openBox(box.id, adShown),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
        ]);
        if (!mountedRef.current) { return; }
        setResult(res as OpenBoxResult);
        setOpenedSlots(targets);
        setPhase('revealed');
        openedCountRef.current += 1;
        pendingRefreshRef.current = true;
      } catch (error) {
        if (!mountedRef.current) { return; }
        if ((error as AxiosError).response?.status === 409) {
          // 이미 개봉된 상자 — 보상은 이미 지급됨. 인벤토리 갱신 후 안내.
          setAlreadyOpened(true);
          setOpenedSlots(slots.map((_, i) => i)); // 금액을 모르므로 전부 연 것으로 처리
          setPhase('revealed');
          pendingRefreshRef.current = true;
          return;
        }
        lockRef.current = false;
        setPhase('sealed');
        Alert.alert('오류', '상자 개봉에 실패했어요. 잠시 후 다시 시도해주세요.', [
          { text: '확인', onPress: () => navigation.navigate('Home') },
        ]);
      }
    },
    [box, navigation, slots],
  );

  /**
   * 열 상자들을 순서대로 재생한다. 목록 순서대로 시차를 준다.
   */
  function playSlots(targets: number[]) {
    targets.forEach((slotIndex, order) => {
      if (order === 0) {
        lottieRefs.current[slotIndex]?.play();
        return;
      }
      timersRef.current.push(
        setTimeout(() => {
          lottieRefs.current[slotIndex]?.play();
        }, order * BURST_STAGGER_MS),
      );
    });
  }

  /**
   * 상자를 연다.
   *
   * 묶음이어도 서버 호출은 첫 개봉 한 번뿐이다(인벤토리 1개·광고 1회). 그때 3개 보상이
   * 모두 확정되고 캐시도 전액 적립되며, 이후는 확정된 값을 공개만 한다.
   *
   * - 상자를 직접 탭 → 그 상자 하나만
   * - 하단 버튼 → 남은 상자 전부 한 번에
   */
  function open(targets: number[]) {
    const pending = targets.filter((i) => !openedSlots.includes(i));
    if (phase === 'opening' || pending.length === 0) { return; }

    if (phase === 'sealed') {
      if (lockRef.current) { return; }
      lockRef.current = true;
      const isAdTurn = (openedCountRef.current + 1) % AD_EVERY === 0;
      if (isAdTurn) {
        // earned = 실제 시청 완료 여부 — opened_via_ad 감사 기록용(게이트 아님).
        showThen((earned) => doOpen(earned, pending));
      } else {
        doOpen(false, pending);
      }
      return;
    }

    // 이미 서버 응답을 받은 뒤 — 확정된 보상을 공개만 한다.
    playSlots(pending);
    setOpenedSlots((prev) => [...prev, ...pending.filter((i) => !prev.includes(i))]);
  }

  /** 하단 버튼 — 남은 상자를 가운데부터 전부 연다. */
  function openAll() {
    open(playOrder.filter((i) => !openedSlots.includes(i)));
  }

  function handleNext() {
    clearTimers();
    flushRefresh(); // 애니메이션이 끝나기 전에 넘어가는 경우의 안전망
    if (isLast) {
      navigation.navigate('Home');
      return;
    }
    setCurrentIndex((i) => i + 1);
    setPhase('sealed');
    setResult(null);
    setOpenedSlots([]);
    setAlreadyOpened(false);
    lockRef.current = false;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: gradeStyle.bg }}
      edges={['top', 'bottom']}
    >
      {/* 배경(radial) — 헤더·버튼까지 덮어야 비네트가 화면 가장자리에서 끊기지 않으므로
          루트 첫 자식으로 깔고, 이후 형제들이 그 위에 쌓이게 한다. */}
      {gradeStyle.backdrop.kind === 'radial' && (
        <BoxBackdrop spec={gradeStyle.backdrop} />
      )}

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
      {/* ⚠️ 좌우 패딩 없음 — 상자 무대가 화면 폭을 다 써야 옆 상자가 안 잘린다.
          패딩이 필요한 건 아래 보상 영역뿐이다. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* 상자 뒤 glow(일반·보라) — 상자를 중심으로 놓여야 해서 중앙 컨테이너 안에 둔다. */}
        {gradeStyle.backdrop.kind === 'glow' && (
          <BoxBackdrop spec={gradeStyle.backdrop} />
        )}

        {/* 상자 무대.
            ⚠️ zIndex를 쓰지 않는다 — 안드로이드에서 zIndex는 그리는 순서만 바꾸고 터치
               판정과 어긋나서, 오른쪽 상자를 눌렀는데 가운데가 열리는 문제가 났다.
               대신 뒤에 있는 상자부터(z 오름차순) 렌더링한다. 나중에 그린 자식이 위에
               오고 터치도 먼저 받으므로 그림 순서와 터치 순서가 자동으로 일치한다. */}
        <View style={{ height: stageH, width: screenW }}>
          {[...slots.keys()]
            .sort((a, b) => slots[a].z - slots[b].z)
            .map((i) => {
              const slot = slots[i];
              const rect = slotRect(slot, screenW, stageH);
              return (
                <PressableScale
                  key={`${currentIndex}-${i}`}
                  onPress={() => open([i])}
                  pressedScale={0.94}
                  accessibilityRole="button"
                  accessibilityLabel="상자 열기"
                  // 보이는 상자 사각형이 곧 누르는 영역. 그 안에서 Lottie를 크게 그린다.
                  style={{
                    position: 'absolute',
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    opacity: slot.opacity,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LottieView
                    key={`${currentIndex}-${box.grade}-${i}`}
                    ref={(r) => { lottieRefs.current[i] = r; }}
                    source={gradeStyle.anim}
                    autoPlay={false}
                    loop={false}
                    speed={1.6}
                    // 갱신은 한 번만 흘리면 되므로 가운데 상자 하나에만 건다.
                    onAnimationFinish={slot.z === 2 ? flushRefresh : undefined}
                    style={{ width: slot.viewSize, height: slot.viewSize, position: 'absolute' }}
                  />

                  {/* 상자별 획득 캐시 — 어느 상자에서 얼마가 나왔는지 붙여 보여준다. */}
                  {openedSlots.includes(i) && rewards[i] !== undefined && (
                    <Animated.View
                      entering={FadeInUp.duration(300).delay(CHIP_DELAY_MS)}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        bottom: -20,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        borderWidth: 1,
                        borderColor: `${yellow[400]}66`,
                      }}
                    >
                      <AppText
                        variant="caption"
                        style={{ color: yellow[400], fontWeight: '800' }}
                      >
                        +{rewards[i].toLocaleString()}
                      </AppText>
                    </Animated.View>
                  )}
                </PressableScale>
              );
            })}
        </View>

        {/* 보상 자리 — 높이 고정(레이아웃 점프 방지). 내용만 갈아끼운다. */}
        <View style={{
          height: REWARD_SLOT_H,
          alignSelf: 'stretch',
          alignItems: 'center',
          paddingHorizontal: STAGE_PAD,
          // 상자에서 떨어지는 파티클과 글자가 겹치지 않도록 충분히 띄운다.
          marginTop: REWARD_GAP,
        }}>
        {/* 아직 안 연 상자가 있으면 안내만 — 총합은 다 열고 나서 보여준다. */}
        {phase === 'revealed' && result && !allOpened && (
          <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: 28 }}>
            <AppText variant="label" style={{ color: 'rgba(255,255,255,0.45)' }}>
              남은 상자를 눌러 열어보세요
            </AppText>
          </Animated.View>
        )}

        {allOpened && result && (
          <Animated.View
            entering={FadeInUp.duration(380)}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            {gradeStyle.badge && (
              <View style={{
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
                marginBottom: 12,
                backgroundColor: gradeStyle.badge.bg,
                borderWidth: 1,
                borderColor: gradeStyle.badge.border,
              }}>
                <AppText
                  variant="caption"
                  style={{ color: gradeStyle.badge.text, fontWeight: '800' }}
                >
                  {gradeStyle.badge.label}
                </AppText>
              </View>
            )}
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

        {/* 이미 개봉된 상자(409) — 보상 금액 미상, 안내로 대체 */}
        {phase === 'revealed' && !result && alreadyOpened && (
          <Animated.View
            entering={FadeInUp.duration(380)}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <AppText
              variant="subheading"
              style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}
            >
              이미 개봉된 상자예요
            </AppText>
            <AppText
              variant="caption"
              style={{ color: 'rgba(255,255,255,0.38)', textAlign: 'center' }}
            >
              보상은 지갑에 이미 적립됐어요
            </AppText>
          </Animated.View>
        )}
        </View>
      </View>

      {/* 하단 버튼 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
        {!allOpened ? (
          // 버튼은 남은 상자를 전부 연다. ⚠️ disabled를 쓰지 않는다 — Button의 disabled
          // 면색(bg-bg-tertiary)이 라이트 토큰이라 어두운 개봉 화면에서 흰색으로 번쩍인다.
          // 개봉 중 재입력은 open()이 phase로 막으므로 버튼은 활성인 채로 둔다.
          <Button
            title={phase === 'sealed' ? '상자 열기' : '남은 상자 열기'}
            onPress={openAll}
          />
        ) : (
          <Button
            title={isLast ? '홈으로' : '다음 상자 열기'}
            onPress={handleNext}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
