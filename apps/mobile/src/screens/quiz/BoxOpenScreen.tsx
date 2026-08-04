import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import Config from 'react-native-config';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon, PressableScale, useToast } from '../../components';
import { openBox, type OpenBoxResult } from '../../api/boxes';
import { useMe } from '../../api/hooks';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import type { MainStackScreenProps } from '../../navigation/types';
import { yellow } from '../../theme/tokens';
import {
  boxBurstHeight, boxBurstLayout, boxStageTouchPad, slotRect, slotTouchRect,
} from './boxBurstLayout';
import { boxGradeStyle } from './boxGradeStyle';
import { planRefresh, type OpenOutcome } from './boxOpenRefresh';
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
const REWARD_SLOT_H = 80;
/** 상자 무대와 보상 문구 사이 간격. 파티클이 상자 아래로 떨어지므로 넉넉히 둔다. */
const REWARD_GAP = 150;
/**
 * 상자를 세로 중앙에서 살짝 아래로 내리는 양(px).
 * 레이아웃이 아니라 transform이라 탭 영역도 그림과 함께 같이 내려간다.
 */
const STAGE_OFFSET_Y = 6;
/**
 * 개봉이 끝난 뒤 나가기 버튼을 조금 더 잠가 두는 시간(ms).
 * 보상 연출이 자리를 잡기 전에 눌리는 걸 막는다. 흐림도 이 시간만큼 함께 유지된다.
 */
const LEAVE_LOCK_RELEASE_MS = 200;

export default function BoxOpenScreen({
  route,
  navigation,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
  const { boxes } = route.params;
  const { showToast } = useToast();
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
  /** 그림 기준 높이 — 상자가 놓이는 자리는 이 값으로 계산한다(탭 여백과 무관하게 고정). */
  const stageH = boxBurstHeight(slots);
  /** 탭 영역을 아래로 넓힌 만큼 무대를 키운다. 안 키우면 안드로이드에서 그 부분이 안 눌린다. */
  const touchPad = boxStageTouchPad(slots);
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

  /** 프로그램이 내보내는 이탈 — 아래 beforeRemove 가드를 통과시킨다. */
  const allowLeaveRef = useRef(false);

  /**
   * 홈으로 나가기(확인 없이 즉시).
   *
   * ⚠️ navigate('Home')를 쓰면 안 된다. React Navigation 7의 navigate는 이미 스택에 있는
   *    화면으로 '돌아가는' 게 아니라 그 화면을 빼서 맨 위로 올린다(StackRouter의 NAVIGATE:
   *    routes.filter(...) 후 push). 그래서 [Home, BoxOpen] 이 [BoxOpen, Home] 이 되고,
   *    홈에서 뒤로가기를 누르면 방금 닫은 상자 화면이 다시 나온다.
   *    Home 은 이 스택의 첫 화면이므로 popToTop 이 정확히 [Home] 만 남긴다.
   */
  const goHome = useCallback(() => {
    allowLeaveRef.current = true;
    navigation.popToTop();
  }, [navigation]);

  /**
   * 개봉 중(약 1초)에는 나가지 못하게 막는다.
   *
   * 서버는 `POST /open/`이 날아간 순간 이미 개봉을 커밋하고 캐시를 지급한다. 그런데
   * 사용자에겐 아직 상자가 안 터졌으니 "안 열었다"고 느낀다. 그 사이에 나가면 돈은
   * 받았는데 **뭘 받았는지 모른 채** 상자만 사라진다 — 리워드 앱에서 보여주는 순간이
   * 통째로 날아가는 셈이다. 1초짜리 구간이라 확인 시트를 세우기보단 그냥 잠근다.
   *
   * ⚠️ **흐림과 실제 잠금은 반드시 같은 값 하나를 봐야 한다.**
   *    예전엔 흐림은 `phase`(렌더)로, 이탈 차단은 beforeRemove 리스너가 클로저로 잡은
   *    `phase`로 판단했다. effect는 화면을 그린 뒤에 도니까, X는 이미 안 흐려졌는데
   *    리스너는 옛 phase를 들고 이탈을 막는 구간이 생긴다(연출·쿼리 갱신으로 JS 스레드가
   *    바쁘면 한참 벌어진다). "안 흐린데 안 눌리는" 상태의 정체가 이거였다.
   *    그래서 `locked` 하나로 합치고, 리스너는 ref로 **항상 현재 값**을 읽는다
   *    (ref는 렌더 중 갱신되므로 리스너를 다시 구독할 필요도 없다).
   */
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    if (phase === 'opening') {
      setLocked(true);
      return;
    }
    // 개봉이 끝나면 조금 더 잠갔다 푼다 — 연출이 자리를 잡기 전에 눌리지 않도록.
    const timer = setTimeout(() => setLocked(false), LEAVE_LOCK_RELEASE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  /**
   * ⚠️ X 버튼만 막으면 안 된다 — 하드웨어 뒤로가기·엣지 스와이프로 그냥 빠져나간다.
   *    beforeRemove가 그 경로를 전부 받는다.
   * ⚠️ 갇히지 않는 근거: 개봉 요청엔 15초 상한이 있고(`api/boxes.ts`), 타임아웃이면
   *    catch에서 phase가 'sealed'로 풀리며 자동으로 홈으로 나간다.
   * (광고를 보는 동안은 phase가 아직 'sealed'라 X가 정상 동작한다 — 광고는 길 수 있으므로.)
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !lockedRef.current) { return; }
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    // ⚠️ 마운트마다 true로 되돌린다. cleanup에서 false만 찍고 끝내면, effect가 다시 도는
    //    상황(Fast Refresh 등)에서 false로 굳어 doOpen의 `if (!mountedRef.current) return`이
    //    항상 걸린다 — phase가 'opening'에 갇혀 화면이 멈춘 것처럼 보인다.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      flushRef.current();
    };
  }, []);

  const isLast = currentIndex >= boxes.length - 1;
  // 지금 보고 있는 상자는 빼고 센다 — 마지막 상자에서 "1개 남음"으로 뜨던 문제.
  const remaining = boxes.length - currentIndex - 1;

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

      /**
       * 갱신 예약/즉시 흘리기는 `planRefresh` 한 곳에서 정한다.
       *
       * ⚠️ **화면을 떠났어도 반드시 부른다.** 예전엔 응답 처리 맨 앞에서
       *    `if (!mountedRef.current) return`으로 걷어차서, 개봉 중 나가면 서버는 열었는데
       *    상자 목록을 무효화하지 못했다 → 홈에 유령 상자가 남고 다시 누르면 409.
       */
      const settle = (outcome: OpenOutcome): boolean => {
        const plan = planRefresh(outcome, mountedRef.current);
        pendingRefreshRef.current = plan.markPending;
        if (plan.flushNow) { flushRef.current(); }
        return mountedRef.current;
      };

      try {
        const [res] = await Promise.all([
          openBox(box.id, adShown),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
        ]);
        if (!settle('opened')) { return; }
        setResult(res as OpenBoxResult);
        setOpenedSlots(targets);
        setPhase('revealed');
        openedCountRef.current += 1;
      } catch (error) {
        const conflict = (error as AxiosError).response?.status === 409;
        // ⚠️ 실패도 갱신한다. 응답을 못 받은 것과 서버가 처리 안 한 것을 구분할 수 없어,
        //    타임아웃인데 서버는 이미 적립을 커밋했을 수 있다(안 하면 캐시는 늘었는데
        //    홈 잔액이 앱 재시작 전까지 옛날 값으로 남는다).
        if (!settle(conflict ? 'already-opened' : 'failed')) { return; }
        if (conflict) {
          // 이미 개봉된 상자 — 보상은 이미 지급됨. 인벤토리 갱신 후 안내.
          setAlreadyOpened(true);
          setOpenedSlots(slots.map((_, i) => i)); // 금액을 모르므로 전부 연 것으로 처리
          setPhase('revealed');
          return;
        }
        lockRef.current = false;
        setPhase('sealed');
        showToast('상자 개봉 결과를 확인하지 못했어요. 지갑에서 확인해주세요', 'error');
        goHome();
      }
    },
    [box, goHome, slots, showToast],
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
      goHome();
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
        {/* 개봉 중엔 잠근다(위 beforeRemove와 **같은 `locked` 값**). 사라지게 하면 상단이
            들썩이므로 자리는 두고 흐리게만 — 곧 다시 눌린다는 게 읽힌다. */}
        <Pressable
          onPress={goHome}
          disabled={locked}
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
            opacity: locked ? 0.35 : 1,
          }}
        >
          <Icon name="close" size={18} color="rgba(255,255,255,0.65)" />
        </Pressable>

        {/* 남은 게 없으면 뱃지 자체를 숨긴다("0개 남음"은 표시할 이유가 없다). */}
        {remaining > 0 && (
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
        )}
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
            ⚠️ 터치 영역은 '보이는 상자' rect로 둔다. Lottie(viewSize)는 rect보다 훨씬 크지만
               `overflow: visible`로 rect 밖까지 그려질 뿐, 터치는 rect 안에서만 받는다.
               (rect들은 서로 안 겹치므로 옆 상자를 눌러도 그 상자가 열린다. viewSize를 터치
                영역으로 쓰면 가운데 상자가 화면 폭을 다 덮어 옆 상자 탭을 삼켜 버린다.)
            ⚠️ zIndex는 쓰지 않는다(안드로이드 터치 판정과 어긋남) — 뒤 상자부터 렌더링해
               가운데가 위에 그려지게만 한다. */}
        {/* ⚠️ 무대 높이는 그림(stageH)이 아니라 탭 여백까지 포함한 값이다. 안드로이드가
            부모 밖 터치를 안 주기 때문. 늘린 만큼 marginBottom 음수로 상쇄해서
            가운데 정렬은 그대로 둔다(상자가 위로 밀려 올라가지 않게). */}
        <View style={{
          height: stageH + touchPad,
          width: screenW,
          marginBottom: -touchPad,
          transform: [{ translateY: STAGE_OFFSET_Y }],
        }}>
          {[...slots.keys()]
            .sort((a, b) => slots[a].z - slots[b].z)
            .map((i) => {
              const slot = slots[i];
              const rect = slotRect(slot, screenW, stageH);
              const touch = slotTouchRect(slot, screenW, stageH);
              return (
                <PressableScale
                  key={`${currentIndex}-${i}`}
                  onPress={() => open([i])}
                  pressedScale={0.94}
                  accessibilityRole="button"
                  accessibilityLabel="상자 열기"
                  style={{
                    position: 'absolute',
                    left: touch.x,
                    top: touch.y,
                    width: touch.w,
                    height: touch.h,
                    opacity: slot.opacity,
                    overflow: 'visible',
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
                    // ⚠️ 터치 판정에서 뺀다. Lottie 뷰는 상자의 3.6배라 부모 밖까지 뻗는데,
                    //    RN은 overflow visible + clipChildren=false면 부모 밖 좌표도 자식으로
                    //    내려보낸다(TouchTargetHelper). 그대로 두면 가운데 상자의 캔버스가
                    //    옆 상자 영역을 덮어 엉뚱한 상자가 열릴 수 있다. 판정은 Pressable 사각형만.
                    //    (LottieView는 pointerEvents prop을 안 받아 style로 준다)
                    // 탭 영역이 커져도 그림은 안 움직이게, '보이는 상자' 중심에 절대배치한다.
                    style={{
                      pointerEvents: 'none',
                      position: 'absolute',
                      left: rect.x + rect.w / 2 - touch.x - slot.viewSize / 2,
                      top: rect.y + rect.h / 2 - touch.y - slot.viewSize / 2,
                      width: slot.viewSize,
                      height: slot.viewSize,
                    }}
                  />
                </PressableScale>
              );
            })}

          {/* 획득 캐시 칩 — 터치 영역과 분리해 '보이는 상자'(rect) 아래에 따로 얹는다.
              (터치 영역은 viewSize라 커서, 칩을 그 안에 두면 위치가 어긋난다.) */}
          {slots.map((slot, i) => {
            if (!openedSlots.includes(i) || rewards[i] === undefined) { return null; }
            const rect = slotRect(slot, screenW, stageH);
            return (
              <Animated.View
                key={`chip-${currentIndex}-${i}`}
                entering={FadeInUp.duration(300).delay(CHIP_DELAY_MS)}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: rect.x,
                  width: rect.w,
                  top: rect.y + rect.h + 110,
                  alignItems: 'center',
                }}
              >
                <View style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderWidth: 1,
                  borderColor: `${yellow[400]}66`,
                }}>
                  <AppText variant="caption" style={{ color: yellow[400], fontWeight: '800' }}>
                    +{rewards[i].toLocaleString()}
                  </AppText>
                </View>
              </Animated.View>);
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
      <View style={{ paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8 }}>
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
