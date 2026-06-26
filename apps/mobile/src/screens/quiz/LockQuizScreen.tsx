/**
 * 잠금화면 학습 퀴즈 (Phase A — UI).
 *
 * 폰을 켰을 때 잠금화면 위에 뜨는 전제의 전용 퀴즈 화면. 인앱 QuizScreen 과 달리
 * 시계/날짜, 앱 열기·상자수 버튼, "밀어서 잠금해제"(화면 어디든 오른쪽 스와이프) 크롬을 갖는다.
 * 퀴즈 핵심(출제/채점/SRS/상자적립)은 서버 계약(api/quiz)을 그대로 사용한다.
 *
 * 디자인: 의도적으로 앱 기본 톤(둥글둥글/라이트)과 다른 **고정 다크** 잠금화면 무드.
 * 그래서 테마 토큰 대신 이 화면 전용 다크 팔레트(LOCK)를 쓴다.
 *
 * Phase B(네이티브: 잠금화면 위 표시, 부팅/화면켜짐 트리거)는 별도. 지금은 앱 내부
 * 라우트로 먼저 검증한다. 그래서 "앱 열기"·"잠금해제"는 모두 Home/뒤로가기로 처리.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AxiosError } from 'axios';

import { AppText, Icon, PressableScale } from '../../components';
import { getNextQuiz, submitAnswer, type BoxGrade, type QuizQuestion } from '../../api/quiz';
import { useBoxes } from '../../api/hooks';
import { quizInstruction, quizTypeLabel } from '../../lib/quizCopy';
import type { MainStackScreenProps } from '../../navigation/types';

/** 잠금화면 퀴즈 동작 콜백 — 컨텍스트(인앱 미리보기 vs 실제 잠금화면)별로 주입. */
export type LockQuizActions = {
  /** 잠금해제(스와이프). */
  onUnlock: () => void;
  /** "앱 열기". */
  onOpenApp: () => void;
  /** 상자수 버튼 — 미개봉 상자 목록 전달. */
  onOpenBoxes: (boxes: { id: number; grade: BoxGrade }[]) => void;
};

// 이 화면 전용 다크 팔레트(잠금화면 무드 고정).
const LOCK = {
  bg: '#0C0D10',
  surface: '#181B21',
  surface2: '#1E222A',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.10)',
  t1: '#EDEEF0',
  t2: '#9A9EA7',
  t3: '#6A6E78',
  brand: '#35B98A',
  brandText: '#7FE6BE',
  brandBg: 'rgba(53,185,138,0.16)',
  brandBorder: 'rgba(53,185,138,0.38)',
  amber: '#FFCE00',
  success: '#33C97A',
  successBg: 'rgba(51,201,122,0.12)',
  successBorder: 'rgba(51,201,122,0.5)',
  danger: '#FF5A45',
  dangerBg: 'rgba(255,90,69,0.12)',
  dangerBorder: 'rgba(255,90,69,0.5)',
};

/** 다크 배경 — 세로 그라데이션(#14161B→#0C0D10) + 상단 중앙 브랜드 글로우. */
function LockBackground(): React.JSX.Element {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p?.w === width && p?.h === height ? p : { w: width, h: height }));
  };
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size && size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="lockBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#14161B" />
              <Stop offset="1" stopColor="#0C0D10" />
            </LinearGradient>
            <RadialGradient id="lockGlow" cx="50%" cy="0%" rx="78%" ry="46%" fx="50%" fy="0%">
              <Stop offset="0" stopColor="#1F9660" stopOpacity="0.26" />
              <Stop offset="1" stopColor="#1F9660" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#lockBg)" />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#lockGlow)" />
        </Svg>
      ) : null}
    </View>
  );
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const FEEDBACK_MS = 1200; // 정/오답 표시 후 다음 문제 자동 로드.

function formatClock(d: Date): { time: string; date: string } {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return {
    time: `${hh}:${mm}`,
    date: `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`,
  };
}

type ChoiceVisual = 'default' | 'correct' | 'wrong';

/** 인앱 미리보기(MainStack) 진입점 — 동작을 navigation 으로 연결. */
export default function LockQuizScreen({
  navigation,
}: MainStackScreenProps<'LockQuiz'>): React.JSX.Element {
  return (
    <LockQuizView
      onUnlock={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
      onOpenApp={() => navigation.navigate('Home')}
      onOpenBoxes={(boxes) => navigation.navigate('BoxOpen', { boxes })}
    />
  );
}

/** 잠금화면 퀴즈 본체(프레젠테이션 + 퀴즈 로직). 인앱/실제 잠금화면이 공유. */
export function LockQuizView({
  onUnlock,
  onOpenApp,
  onOpenBoxes,
}: LockQuizActions): React.JSX.Element {
  const boxes = useBoxes();
  const boxCount = boxes.data?.length ?? 0;
  const { width: screenW } = useWindowDimensions();

  const [now, setNow] = useState(() => new Date());
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [noContent, setNoContent] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  const startRef = useRef(0);
  const submitLockRef = useRef(false);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // 시계 — 분 단위면 충분하니 30초마다 갱신.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedIndex(null);
    setCorrectIndex(null);
    submitLockRef.current = false;
    try {
      const q = await getNextQuiz();
      if (!mountedRef.current) return;
      setQuestion(q);
      setNoContent(false);
      startRef.current = Date.now();
    } catch (error) {
      if (!mountedRef.current) return;
      if ((error as AxiosError).response?.status === 409) {
        setNoContent(true);
        setQuestion(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadQuestion();
    return () => {
      mountedRef.current = false;
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, [loadQuestion]);

  const openBoxes = useCallback(() => {
    if (!boxes.data || boxes.data.length === 0) return;
    onOpenBoxes(boxes.data.map((b) => ({ id: b.id, grade: b.grade })));
  }, [boxes.data, onOpenBoxes]);

  async function handleSelect(index: number) {
    if (submitLockRef.current || !question || selectedIndex !== null) return;
    submitLockRef.current = true;
    setSelectedIndex(index);
    try {
      const res = await submitAnswer({
        question_token: question.question_token,
        choice_index: index,
        answer_ms: Date.now() - startRef.current,
      });
      if (!mountedRef.current) return;
      setCorrectIndex(res.correct_index);
      if (res.box_id !== null) boxes.refetch();
      nextTimerRef.current = setTimeout(() => {
        if (mountedRef.current) loadQuestion();
      }, FEEDBACK_MS);
    } catch {
      if (!mountedRef.current) return;
      // 실패 시 선택 해제하고 다시 시도 가능하게.
      setSelectedIndex(null);
      submitLockRef.current = false;
    }
  }

  function choiceVisual(index: number): ChoiceVisual {
    if (correctIndex === null) return 'default';
    if (index === correctIndex) return 'correct';
    if (index === selectedIndex) return 'wrong';
    return 'default';
  }

  // 오른쪽으로 밀면 잠금해제 — RNGH가 터치를 가로채므로(루트뷰) RNGH 제스처를 쓰되,
  // 워클릿 경로가 이 버전 조합에서 불안정해 .runOnJS(true)로 JS 콜백 + RN Animated 사용.
  const dragX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  // 제스처는 useRef로 1회만 생성되므로 콜백 클로저가 첫 렌더의 screenW를 고정한다.
  // 회전 등으로 너비가 바뀌어도 최신값을 쓰도록 ref로 갱신해 참조한다.
  const dimsRef = useRef({ screenW });
  dimsRef.current.screenW = screenW;
  const pan = useRef(
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX(10)
      .failOffsetY([-14, 14]) // 세로/대각선 움직임이 크면 취소 — "오른쪽 밀기"만 받는다.
      .onUpdate((e) => {
        if (e.translationX >= 0) {
          dragX.setValue(Math.min(e.translationX, dimsRef.current.screenW));
        }
      })
      .onEnd((e) => {
        const unlockDist = dimsRef.current.screenW * 0.5; // 화면 절반쯤 밀면 닫힘
        if (e.translationX > unlockDist || e.velocityX > 600) {
          // 절반쯤 밀면 슬라이드로 빠져나가는 대신 그 자리에서 투명해지며 꺼진다.
          Animated.timing(opacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: false,
          }).start(() => onUnlockRef.current());
        } else {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
        }
      }),
  ).current;

  const clock = formatClock(now);

  return (
    <View style={{ flex: 1, backgroundColor: LOCK.bg }}>
      <LockBackground />
      <GestureDetector gesture={pan}>
        <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: dragX }] }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* 상단: 시계 / 액션 */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
              <View>
                <AppText variant="hero" style={{ color: '#fff', fontSize: 50, letterSpacing: -1.5 }}>
                  {clock.time}
                </AppText>
                <AppText variant="caption" style={{ color: LOCK.t2, marginTop: 8 }}>
                  {clock.date}
                </AppText>
              </View>
              <View style={{ gap: 9, alignItems: 'flex-end' }}>
                <PressableScale onPress={onOpenApp}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      height: 36,
                      paddingHorizontal: 13,
                      borderRadius: 10,
                      backgroundColor: LOCK.brandBg,
                      borderWidth: 1,
                      borderColor: LOCK.brandBorder,
                    }}>
                    <AppText variant="label" style={{ color: LOCK.brandText }}>
                      앱 열기
                    </AppText>
                    <Icon name="chevron-right" size={15} color={LOCK.brandText} strokeWidth={2.2} />
                  </View>
                </PressableScale>
                <PressableScale onPress={openBoxes} disabled={boxCount === 0}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      height: 36,
                      paddingHorizontal: 13,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: LOCK.line2,
                      opacity: boxCount === 0 ? 0.5 : 1,
                    }}>
                    <Icon name="gift" size={15} color={LOCK.amber} strokeWidth={2} />
                    <AppText variant="label" style={{ color: LOCK.t1 }}>
                      상자 <AppText variant="label" style={{ color: LOCK.amber }}>{boxCount}</AppText>
                    </AppText>
                  </View>
                </PressableScale>
              </View>
            </View>

            {/* 중앙: 퀴즈 */}
            <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 30 }}>
              {noContent ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Icon name="sparkles" size={44} color={LOCK.amber} />
                  <AppText variant="title" style={{ color: LOCK.t1, textAlign: 'center' }}>
                    오늘 복습할 문제가 없어요
                  </AppText>
                </View>
              ) : loading || !question ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={LOCK.brand} />
                </View>
              ) : (
                <>
                  {/* 문제 카드 */}
                  <View
                    style={{
                      backgroundColor: LOCK.surface,
                      borderWidth: 1,
                      borderColor: LOCK.line,
                      borderRadius: 14,
                      paddingHorizontal: 22,
                      paddingTop: 20,
                      paddingBottom: 26,
                    }}>
                    <AppText
                      variant="micro"
                      style={{ color: LOCK.brand, letterSpacing: 1.5, fontWeight: '700' }}>
                      {quizTypeLabel(question.item_type).toUpperCase()}
                    </AppText>
                    <AppText variant="label" style={{ color: LOCK.t2, marginTop: 11 }}>
                      {quizInstruction(question.item_type, question.question_type)}
                    </AppText>
                    <AppText
                      variant="hero"
                      style={{ color: '#fff', textAlign: 'center', marginTop: 22 }}>
                      {question.prompt}
                    </AppText>
                    {question.reading ? (
                      <AppText
                        variant="caption"
                        style={{ color: LOCK.t3, textAlign: 'center', marginTop: 10 }}>
                        {question.reading}
                      </AppText>
                    ) : null}
                  </View>

                  {/* 4지선다 2×2 — 카드 크기 항상 고정 */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      marginTop: 22,
                      rowGap: 11,
                    }}>
                    {question.choices.map((choice) => (
                      <ChoiceCard
                        key={choice.index}
                        index={choice.index}
                        text={choice.text}
                        visual={choiceVisual(choice.index)}
                        disabled={selectedIndex !== null}
                        onPress={() => handleSelect(choice.index)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* 하단: 밀어서 잠금해제(칸 없이 화면 어디든 스와이프) */}
            <View style={{ paddingBottom: 26, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText variant="caption" style={{ color: LOCK.t3, letterSpacing: 0.3 }}>
                  밀어서 잠금해제
                </AppText>
                <Icon name="chevron-right" size={14} color={LOCK.t3} strokeWidth={2.2} />
              </View>
              <View
                style={{
                  marginTop: 12,
                  width: 128,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** 선택지 1개 — 2×2 그리드용 고정 크기 카드. 번호 배지 + 텍스트(1줄 말줄임). */
function ChoiceCard({
  index,
  text,
  visual,
  disabled,
  onPress,
}: {
  index: number;
  text: string;
  visual: ChoiceVisual;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const style = {
    default: { bg: LOCK.surface2, border: LOCK.line, text: LOCK.t1, badge: 'rgba(255,255,255,0.07)', badgeText: LOCK.t2 },
    correct: { bg: LOCK.successBg, border: LOCK.successBorder, text: '#6FE3A4', badge: LOCK.success, badgeText: '#06210f' },
    wrong: { bg: LOCK.dangerBg, border: LOCK.dangerBorder, text: '#FF8C7B', badge: LOCK.danger, badgeText: '#2a0a06' },
  }[visual];

  const showCheck = visual === 'correct';
  const showCross = visual === 'wrong';

  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.985} style={{ width: '48.5%' }}>
      <View
        style={{
          height: 66,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingHorizontal: 15,
          backgroundColor: style.bg,
          borderWidth: 1,
          borderColor: style.border,
          borderRadius: 12,
        }}>
        <View
          style={{
            width: 23,
            height: 23,
            borderRadius: 7,
            backgroundColor: style.badge,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {showCheck ? (
            <Icon name="check" size={14} color={style.badgeText} strokeWidth={2.8} />
          ) : showCross ? (
            <Icon name="close" size={14} color={style.badgeText} strokeWidth={2.8} />
          ) : (
            <AppText variant="caption" style={{ color: style.badgeText, fontWeight: '700' }}>
              {index + 1}
            </AppText>
          )}
        </View>
        <AppText
          variant="subheading"
          numberOfLines={1}
          style={{ flex: 1, color: style.text }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}
