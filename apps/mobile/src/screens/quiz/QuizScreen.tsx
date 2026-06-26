/**
 * 퀴즈 화면 — 4지선다 출제/채점 + 정답·오답 피드백 + 상자 획득 연출.
 *
 * 백엔드(api/quiz.ts) 계약상 선택지는 0-based index로 식별하고, 정답 텍스트는
 * 응답에 오지 않으므로 choices[correct_index].text 로 표시한다. 일일 상한
 * 도달은 "정답인데 box_id가 null"로 판별한다(서버 실제 상한과 진행바 표시
 * 상한이 달라도 정확). 퀴즈 중 서버 에러는 조용히 넘기지 않고 홈으로 보낸다.
 *
 * 디자인: Duolingo식 — 큰 문제 카드 + 번호 배지가 달린 큼직한 선택지(누를 맛) +
 * 정답/오답을 색·아이콘으로 즉각 피드백. 색은 테마(다크 대응) 토큰으로.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { AppText, Button, Icon, PressableScale, ProgressBar, Tag } from '../../components';
import { shadowStyle } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  getNextQuiz,
  submitAnswer,
  type QuizAnswerResult,
  type QuizQuestion,
} from '../../api/quiz';
import { useDailyToday } from '../../api/hooks';
import type { MainStackScreenProps } from '../../navigation/types';

/**
 * 일일 상자 획득 상한(진행바 표시용). 서버 MAX_BOXES_PER_DAY(=50)와 맞춰둔다.
 * TODO: 추후 서버 응답으로 내려받아 단일 소스화.
 */
const MAX_DAILY_BOXES = 50;
const NEXT_DELAY_MS = 1200;

type ChoiceVisual = 'default' | 'correctFilled' | 'correctOutline' | 'wrongFilled';

function choiceVisual(
  index: number,
  result: QuizAnswerResult | null,
  selectedIndex: number | null,
): ChoiceVisual {
  if (!result) {
    return 'default';
  }
  const isCorrect = index === result.correct_index;
  const isMine = index === selectedIndex;
  if (isCorrect) {
    return isMine ? 'correctFilled' : 'correctOutline';
  }
  return isMine ? 'wrongFilled' : 'default';
}

export default function QuizScreen({
  navigation,
}: MainStackScreenProps<'Quiz'>): React.JSX.Element {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const daily = useDailyToday();

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [pendingBoxIds, setPendingBoxIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [noContent, setNoContent] = useState(false);

  const startTimeRef = useRef(0);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 동기 제출 락 — setSelectedIndex(state) 갱신 전 더블탭이 두 번 채점되는 것을 막는다.
  const submitLockRef = useRef(false);
  // 언마운트(✕/종료) 후 비동기 resolve가 setState/Alert 하는 것을 막는다.
  const mountedRef = useRef(true);
  // pendingBoxIds 최신값을 타이머/콜백에서 읽기 위한 ref(클로저 캡처 회피).
  const pendingRef = useRef<number[]>([]);
  pendingRef.current = pendingBoxIds;

  const clearNextTimer = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  const goHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleExit = useCallback(() => {
    clearNextTimer();
    if (pendingRef.current.length > 0) {
      navigation.replace('BoxOpen', { boxIds: pendingRef.current });
    } else {
      goHome();
    }
  }, [clearNextTimer, goHome, navigation]);

  const loadNextQuestion = useCallback(async () => {
    clearNextTimer();
    submitLockRef.current = false;
    setLoading(true);
    setSelectedIndex(null);
    setResult(null);
    try {
      const q = await getNextQuiz();
      if (!mountedRef.current) {
        return;
      }
      setQuestion(q);
      startTimeRef.current = Date.now();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      const status = (error as AxiosError).response?.status;
      if (status === 409) {
        setNoContent(true);
      } else {
        Alert.alert('오류', '문제를 불러오지 못했어요. 잠시 후 다시 시도해주세요.', [
          { text: '확인', onPress: goHome },
        ]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [clearNextTimer, goHome]);

  useEffect(() => {
    loadNextQuestion();
    return () => {
      mountedRef.current = false;
      clearNextTimer();
    };
  }, [loadNextQuestion, clearNextTimer]);

  async function handleSelect(index: number) {
    // 동기 락으로 더블탭 차단(state 갱신은 비동기라 단독으로는 경합 가능).
    if (submitLockRef.current || selectedIndex !== null || !question) {
      return;
    }
    submitLockRef.current = true;
    setSelectedIndex(index);
    const answerMs = Date.now() - startTimeRef.current;
    try {
      const res = await submitAnswer({
        question_token: question.question_token,
        choice_index: index,
        answer_ms: answerMs,
      });
      if (!mountedRef.current) {
        return;
      }
      setResult(res);

      if (res.is_correct) {
        setSessionCorrect((prev) => prev + 1);
        if (res.box_id !== null) {
          setPendingBoxIds((ids) => [...ids, res.box_id as number]);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['boxes', 'unopened'] });
      queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });

      // 정답인데 상자가 안 나오면 일일 상한 도달 → 학습 종료.
      if (res.is_correct && res.box_id === null) {
        Alert.alert('오늘 학습 완료!', '오늘 받을 수 있는 상자를 모두 모았어요 🎊', [
          { text: '확인', onPress: handleExit },
        ]);
        return;
      }

      nextTimerRef.current = setTimeout(loadNextQuestion, NEXT_DELAY_MS);
    } catch {
      if (!mountedRef.current) {
        return;
      }
      Alert.alert('오류', '채점에 실패했어요. 잠시 후 다시 시도해주세요.', [
        { text: '확인', onPress: goHome },
      ]);
    }
  }

  function confirmExit() {
    Alert.alert('그만하시겠어요?', '', [
      { text: '계속하기', style: 'cancel' },
      { text: '그만하기', style: 'destructive', onPress: handleExit },
    ]);
  }

  const progress = Math.min(1, (daily.data?.boxes_earned ?? 0) / MAX_DAILY_BOXES);

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      {/* 1. 상단바 */}
      <View className="flex-row items-center justify-between px-xl py-md">
        <Pressable
          onPress={confirmExit}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
          <Icon name="close" size={24} color={c['text-secondary']} />
        </Pressable>
        <Tag label={`정답 ${sessionCorrect}`} variant="brand" leftIcon="check" />
      </View>
      <View className="mx-xl mb-md">
        <ProgressBar progress={progress} height={8} />
      </View>

      {noContent ? (
        <View className="flex-1 items-center justify-center gap-lg px-xl">
          <Icon name="sparkles" size={48} color={c.amber} />
          <AppText variant="title" className="text-text-primary text-center">
            오늘 복습할 단어가 없어요
          </AppText>
          <Button title="홈으로" onPress={goHome} className="self-stretch" />
        </View>
      ) : loading || !question ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={c.brand} />
        </View>
      ) : (
        <View className="flex-1 px-xl">
          {/* 2. 문제 카드 */}
          <QuestionCard
            prompt={question.prompt}
            reading={question.reading}
            jlpt={question.jlpt_level}
          />

          {/* 3. 선택지 */}
          <View className="mt-2xl gap-md">
            {question.choices.map((choice) => (
              <ChoiceButton
                key={choice.index}
                index={choice.index}
                text={choice.text}
                visual={choiceVisual(choice.index, result, selectedIndex)}
                disabled={result !== null}
                onPress={() => handleSelect(choice.index)}
              />
            ))}
          </View>

          {/* 4. 피드백 */}
          <View className="mt-xl items-center justify-center" style={{ minHeight: 88 }}>
            {result !== null && (
              <Feedback result={result} question={question} onNext={loadNextQuestion} />
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/** 문제 카드 — 단어/한자(또는 뜻) + 읽기 + JLPT 뱃지. */
function QuestionCard({
  prompt,
  reading,
  jlpt,
}: {
  prompt: string;
  reading: string;
  jlpt: string;
}): React.JSX.Element {
  return (
    <View
      className="mt-2xl items-center rounded-xl bg-bg-primary px-xl py-4xl"
      style={shadowStyle('md')}>
      {jlpt ? (
        <View className="absolute right-lg top-lg">
          <Tag label={jlpt} variant="brand" />
        </View>
      ) : null}
      <AppText variant="hero" className="text-text-primary text-center">
        {prompt}
      </AppText>
      {reading ? (
        <AppText variant="body" className="mt-sm text-text-tertiary">
          {reading}
        </AppText>
      ) : null}
    </View>
  );
}

/** 선택지 1개 — 번호 배지 + 텍스트, 결과에 따라 색/아이콘 변화. */
function ChoiceButton({
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
  const c = useThemeColors();

  const style = {
    default: { box: c['bg-primary'], border: c['border-secondary'], text: c['text-primary'], badge: c['bg-tertiary'], badgeText: c['text-secondary'] },
    correctFilled: { box: c['success-subtle'], border: c.success, text: c.success, badge: c.success, badgeText: '#FFFFFF' },
    correctOutline: { box: c['bg-primary'], border: c.success, text: c.success, badge: c.success, badgeText: '#FFFFFF' },
    wrongFilled: { box: c['danger-subtle'], border: c.danger, text: c.danger, badge: c.danger, badgeText: '#FFFFFF' },
  }[visual];

  const showCheck = visual === 'correctFilled' || visual === 'correctOutline';
  const showCross = visual === 'wrongFilled';

  return (
    <PressableScale
      disabled={disabled}
      pressedScale={0.98}
      onPress={onPress}
      className="flex-row items-center rounded-md px-lg"
      style={{ height: 60, backgroundColor: style.box, borderColor: style.border, borderWidth: 1.5 }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 28, height: 28, backgroundColor: style.badge }}>
        {showCheck ? (
          <Icon name="check" size={16} color={style.badgeText} strokeWidth={2.6} />
        ) : showCross ? (
          <Icon name="close" size={16} color={style.badgeText} strokeWidth={2.6} />
        ) : (
          <AppText variant="label" style={{ color: style.badgeText }}>
            {index + 1}
          </AppText>
        )}
      </View>
      <AppText variant="subheading" className="ml-md flex-1" style={{ color: style.text }}>
        {text}
      </AppText>
    </PressableScale>
  );
}

/** 정답/오답 피드백 + 상자 획득 연출. */
function Feedback({
  result,
  question,
  onNext,
}: {
  result: QuizAnswerResult;
  question: QuizQuestion;
  onNext: () => void;
}): React.JSX.Element {
  const c = useThemeColors();
  const boxScale = useSharedValue(0);

  useEffect(() => {
    if (result.is_correct && result.box_id !== null) {
      boxScale.value = withSequence(withTiming(1.3, { duration: 180 }), withSpring(1));
    }
  }, [result, boxScale]);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: boxScale.value }] }));

  if (result.is_correct) {
    return (
      <Animated.View entering={FadeInUp} className="items-center gap-sm">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Icon name="check-circle" size={22} color={c.success} />
          <AppText variant="title" className="text-success">
            정답!{result.box_id !== null ? ' 상자 +1' : ''}
          </AppText>
        </View>
        {result.box_id !== null && (
          <Animated.View style={boxStyle}>
            <Icon name="gift" size={40} color={c.amber} />
          </Animated.View>
        )}
        <Button title="다음" variant="soft" size="sm" onPress={onNext} />
      </Animated.View>
    );
  }

  const correctText = question.choices[result.correct_index]?.text ?? '';
  return (
    <Animated.View entering={FadeInUp} className="items-center gap-sm">
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Icon name="close" size={20} color={c.danger} strokeWidth={2.6} />
        <AppText variant="title" className="text-danger">
          오답
        </AppText>
      </View>
      <AppText variant="body" className="text-text-secondary">
        정답: {correctText}
      </AppText>
      <Button title="다음" variant="soft" size="sm" onPress={onNext} />
    </Animated.View>
  );
}
