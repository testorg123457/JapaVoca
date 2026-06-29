/**
 * 잠금화면 퀴즈 (개편판).
 *
 * 크롬(시계·앱열기·상자배지·밀어서잠금해제)은 현행 그대로 유지.
 * 중앙 퀴즈 영역만 교체:
 *   - 10문제 세트 + 1시간 쿨다운 구조 (GET /api/quiz/set/)
 *   - 오프라인: 로컬 채점 + pendingAnswers 큐, 상자 미지급
 *   - 선택 후 해설 패널(AnswerReveal) — 자동 넘김 제거
 *   - 음성 버튼: react-native-tts 연동 (ja-JP TTS)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Tts from 'react-native-tts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText, Icon, PressableScale } from '../../components';
import {
  getQuizSet,
  submitAnswer,
  syncAnswers,
  toggleBookmark,
  type BoxGrade,
  type QuizSetQuestion,
  type QuizSetResponse,
} from '../../api/quiz';
import {
  getKanjiComponents,
  type ComponentNode,
  type ComponentTreeResponse,
} from '../../api/content';
import { useBoxes } from '../../api/hooks';
import { quizInstruction } from '../../lib/quizCopy';
import {
  addPendingAnswer,
  clearPendingAnswers,
  getCachedSet,
  getCachedComponentTree,
  getCursor,
  getPendingAnswers,
  setCachedSet,
  setCachedComponentTree,
  setCursor,
} from '../../store/quizSet';
import type { MainStackScreenProps } from '../../navigation/types';

export type LockQuizActions = {
  onUnlock: () => void;
  onOpenApp: () => void;
  onOpenBoxes: (boxes: { id: number; grade: BoxGrade }[]) => void;
};

// ── 다크 팔레트 ──────────────────────────────────────────────────────────────────

const LOCK = {
  bg: '#0C0D10',
  surface: '#181B21',
  surface2: '#1E222A',
  surface3: '#252930',
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

// ── 배경 ─────────────────────────────────────────────────────────────────────────

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
            <RadialGradient id="lockGlow" cx="50%" cy="2%" rx="82%" ry="44%" fx="50%" fy="2%">
              <Stop offset="0" stopColor="#1F9660" stopOpacity="0.32" />
              <Stop offset="1" stopColor="#1F9660" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="lockVig" cx="50%" cy="116%" rx="120%" ry="52%" fx="50%" fy="116%">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#lockBg)" />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#lockGlow)" />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#lockVig)" />
        </Svg>
      ) : null}
    </View>
  );
}

// ── 시계 ─────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatClock(d: Date): { time: string; date: string } {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return {
    time: `${hh}:${mm}`,
    date: `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`,
  };
}

// ── 쿨다운 타이머 ─────────────────────────────────────────────────────────────────

function formatRemaining(until: string): string {
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) { return '00:00'; }
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── 음성 버튼 (TTS 연동 전 비활성) ────────────────────────────────────────────────

// TTS 초기화 (앱 기동 시 1회)
Tts.setDefaultLanguage('ja-JP');

function AudioButton({ text }: { text: string }): React.JSX.Element {
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      subRef.current?.remove();
      subRef.current = null;
      Tts.stop();
    };
  }, []);

  const handlePress = useCallback(() => {
    if (speaking) {
      cancelRef.current = true;
      subRef.current?.remove();
      subRef.current = null;
      Tts.stop();
      setSpeaking(false);
      return;
    }

    // ウ・ユウ 형태로 여러 발음이 있을 때 순차 재생 (700ms 간격)
    const readings = text.split('・').map(r => r.trim()).filter(Boolean);
    if (readings.length === 0) { return; }

    cancelRef.current = false;
    setSpeaking(true);

    const playNext = (index: number) => {
      if (cancelRef.current || index >= readings.length) {
        setSpeaking(false);
        return;
      }
      Tts.speak(readings[index]);
      let sub: { remove: () => void } | null = null;
      const onFinish = () => {
        sub?.remove();
        subRef.current = null;
        if (index + 1 < readings.length) {
          setTimeout(() => playNext(index + 1), 600);
        } else {
          setSpeaking(false);
        }
      };
      // NativeEventEmitter.addListener 반환값 사용 (removeListener는 RN 0.65+ 제거됨)
      sub = Tts.addEventListener('tts-finish', onFinish) as unknown as { remove: () => void };
      subRef.current = sub;
    };

    playNext(0);
  }, [text, speaking]);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: speaking ? LOCK.brandText + '22' : 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: speaking ? LOCK.brandText : LOCK.line,
      }}
      onPress={handlePress}>
      <Icon name="volume" size={14} color={LOCK.brandText} strokeWidth={2} />
      <AppText variant="caption" style={{ color: LOCK.brandText }}>
        {speaking ? '■' : '듣기'}
      </AppText>
    </TouchableOpacity>
  );
}

// ── 선택지 카드 ───────────────────────────────────────────────────────────────────

type ChoiceVisual = 'default' | 'correct' | 'wrong' | 'dimmed';

function ChoiceCard({
  text, visual, disabled, onPress,
}: {
  text: string; visual: ChoiceVisual; disabled: boolean; onPress: () => void;
}): React.JSX.Element {
  const style = {
    default: { bg: LOCK.surface2, border: LOCK.line, text: LOCK.t1 },
    correct: { bg: LOCK.successBg, border: LOCK.successBorder, text: '#6FE3A4' },
    wrong:   { bg: LOCK.dangerBg, border: LOCK.dangerBorder, text: '#FF8C7B' },
    dimmed:  { bg: LOCK.surface, border: LOCK.line, text: LOCK.t3 },
  }[visual];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.985}
      style={{ width: '48.5%' }}>
      <View style={{
        height: 66,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingHorizontal: 14,
        backgroundColor: style.bg,
        borderWidth: 1, borderColor: style.border,
        borderRadius: 16,
      }}>
        {visual === 'correct' && <Icon name="check" size={16} color="#6FE3A4" strokeWidth={2.8} />}
        {visual === 'wrong'   && <Icon name="close" size={16} color="#FF8C7B" strokeWidth={2.8} />}
        <AppText
          variant="subheading"
          numberOfLines={1}
          style={{ color: style.text, fontSize: 18, lineHeight: 24 }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}

// ── 구성자 트리 모달 ────────────────────────────────────────────────────────────────

function NodeRow({
  char,
  depth,
  nodes,
  visited,
}: {
  char: string;
  depth: number;
  nodes: Record<string, ComponentNode>;
  visited: Set<string>;
}): React.JSX.Element | null {
  const node = nodes[char];
  const alreadySeen = visited.has(char);
  const newVisited = new Set([...visited, char]);

  if (!node) { return null; }

  const readings = [node.on_reading, node.kun_reading].filter(Boolean).join(' / ');

  return (
    <View>
      <View style={{
        paddingVertical: 8,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderLeftWidth: depth > 0 ? 1 : 0,
        borderLeftColor: LOCK.line,
        marginLeft: depth > 0 ? depth * 20 : 0,
        paddingLeft: depth > 0 ? 12 : 0,
      }}>
        <AppText style={{
          color: depth === 0 ? '#fff' : LOCK.t2,
          fontSize: depth === 0 ? 36 : 28,
          fontWeight: '700', lineHeight: depth === 0 ? 44 : 36,
          paddingBottom: 4,
          minWidth: 40,
        }}>
          {char}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="body" style={{ color: LOCK.t1, fontWeight: depth === 0 ? '700' : '400' }}>
            {node.meaning_ko}
          </AppText>
          {!!readings && (
            <AppText variant="caption" style={{ color: LOCK.t3 }}>{readings}</AppText>
          )}
        </View>
      </View>
      {!alreadySeen && !node.is_leaf && node.components.map(child => (
        <NodeRow
          key={`${child}-${depth + 1}`}
          char={child}
          depth={depth + 1}
          nodes={nodes}
          visited={newVisited}
        />
      ))}
    </View>
  );
}

function KanjiPane({
  character,
}: {
  character: string;
}): React.JSX.Element {
  const [data, setData] = useState<ComponentTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getKanjiComponents(character)
      .then((res: { data: ComponentTreeResponse }) => {
        if (cancelled) { return; }
        setCachedComponentTree(character, res.data);
        setData(res.data);
      })
      .catch(() => {
        if (cancelled) { return; }
        const cached = getCachedComponentTree(character);
        if (cached) { setData(cached); }
        else { setError(true); }
      })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [character]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={LOCK.brand} />
      </View>
    );
  }
  if (error) {
    return (
      <AppText variant="body" style={{ color: LOCK.t3, textAlign: 'center', paddingVertical: 40 }}>
        구성 정보를 불러오지 못했어요
      </AppText>
    );
  }
  if (!data || data.root_components.length === 0) {
    return (
      <AppText variant="body" style={{ color: LOCK.t3 }}>구성 정보 없음</AppText>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      {data.root_components.map(char => (
        <NodeRow
          key={char}
          char={char}
          depth={0}
          nodes={data.nodes}
          visited={new Set([character])}
        />
      ))}
    </View>
  );
}

function ComponentTreeModal({
  characters,
  onClose,
}: {
  characters: string[];
  onClose: () => void;
}): React.JSX.Element {
  const { height: screenH } = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const sheetH = screenH * 0.68;
  const activeChar = characters[tabIndex] ?? characters[0];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* 딤 배경 */}
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={{
          height: sheetH,
          backgroundColor: LOCK.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTopWidth: 1, borderColor: LOCK.line,
        }}>
          {/* 핸들 */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, backgroundColor: LOCK.line, borderRadius: 2 }} />
          </View>

          {/* 헤더: 탭(한자 여러 개) + 닫기 */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0,
            borderBottomWidth: 1, borderBottomColor: LOCK.line,
          }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {characters.map((char, i) => {
                const active = i === tabIndex;
                return (
                  <PressableScale key={char} onPress={() => setTabIndex(i)}>
                    <View style={{
                      paddingHorizontal: 16, paddingVertical: 10,
                      borderBottomWidth: 2.5,
                      borderBottomColor: active ? LOCK.brand : 'transparent',
                    }}>
                      <AppText style={{
                        color: active ? '#fff' : LOCK.t3,
                        fontSize: 28, fontWeight: '700', lineHeight: 34,
                      }}>
                        {char}
                      </AppText>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale onPress={onClose}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: LOCK.surface2,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Icon name="close" size={16} color={LOCK.t2} strokeWidth={2.5} />
              </View>
            </PressableScale>
          </View>

          {/* 본문 */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            key={activeChar}>
            <AppText variant="caption" style={{ color: LOCK.t3, marginBottom: 12 }}>구성</AppText>
            <KanjiPane character={activeChar} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── 결과 패널 (B형 — 풀 헤더 스트라이프) ──────────────────────────────────────────

function AnswerReveal({
  question,
  isCorrect,
  boxGrade,
  selectedIndex,
  offlineMode,
  onNext,
  isLast,
  cursor,
  totalQuestions,
  onShowComponents,
}: {
  question: QuizSetQuestion;
  isCorrect: boolean;
  boxGrade: BoxGrade | null;
  selectedIndex: number | null;
  offlineMode: boolean;
  onNext: () => void;
  isLast: boolean;
  cursor: number;
  totalQuestions: number;
  onShowComponents: (chars: string[]) => void;
}): React.JSX.Element {
  const { detail } = question;
  const [bookmarked, setBookmarked] = useState(false);

  const handleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await toggleBookmark(question.item_type, question.item_id, next);
    } catch {
      setBookmarked(!next);
    }
  };

  const correctText = question.choices.find(c => c.index === question.answer_index)?.text ?? '';
  const selectedText = selectedIndex !== null
    ? (question.choices.find(c => c.index === selectedIndex)?.text ?? '')
    : '';

  const accentBg     = isCorrect ? LOCK.successBg     : LOCK.dangerBg;
  const accentBorder = isCorrect ? LOCK.successBorder  : LOCK.dangerBorder;
  const accentColor  = isCorrect ? LOCK.success        : LOCK.danger;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 }}>

      {/* ── 풀 헤더 스트라이프 ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: accentBg,
        borderRadius: 16,
        borderWidth: 1, borderColor: accentBorder,
        paddingHorizontal: 16, paddingVertical: 13,
        marginBottom: 16,
      }}>
        {/* 결과 텍스트 */}
        <AppText style={{ color: accentColor, fontWeight: '800', fontSize: 17 }}>
          {isCorrect ? '✓  정답입니다!' : '✗  아쉬워요'}
        </AppText>

        {/* 우측: 상자뱃지 + 북마크 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isCorrect && boxGrade && !offlineMode && (
            <View style={{
              backgroundColor: LOCK.amber + '22',
              borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
              borderWidth: 1, borderColor: LOCK.amber + '66',
            }}>
              <AppText variant="caption" style={{ color: LOCK.amber, fontWeight: '700' }}>
                상자 +1
              </AppText>
            </View>
          )}
          {offlineMode && (
            <AppText variant="caption" style={{ color: LOCK.t3 }}>오프라인</AppText>
          )}
          <AppText variant="caption" style={{ color: LOCK.t3 }}>
            {cursor + 1} / {totalQuestions}
          </AppText>
          <PressableScale onPress={handleBookmark}>
            <Icon
              name={bookmarked ? 'bookmark-filled' : 'bookmark'}
              size={20}
              color={bookmarked ? LOCK.amber : LOCK.t3}
              strokeWidth={2}
            />
          </PressableScale>
        </View>
      </View>

      {/* ── 한자 + 정보 가로 배치 ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 16,
        marginBottom: 18,
      }}>
        {/* 한자 크게 */}
        <AppText style={{
          color: '#fff', fontSize: 76, lineHeight: 84,
          letterSpacing: -3, fontWeight: '700',
        }}>
          {detail.surface}
        </AppText>

        {/* 읽기·급수·듣기 */}
        <View style={{ flex: 1, gap: 4 }}>
          {!!detail.meaning && (
            <AppText variant="subheading" style={{ color: LOCK.t1, fontWeight: '700' }}>
              {detail.meaning}
            </AppText>
          )}
          {!!detail.on_reading && (
            <AppText variant="caption" style={{ color: LOCK.t2 }}>{detail.on_reading}</AppText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {!!question.jlpt_level && (
              <View style={{
                backgroundColor: LOCK.brand + '22',
                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <AppText variant="micro" style={{ color: LOCK.brand, fontWeight: '700' }}>
                  {question.jlpt_level}
                </AppText>
              </View>
            )}
            <AudioButton text={detail.on_reading || detail.surface} />
          </View>
        </View>
      </View>

      {/* ── 설명 카드 ── */}
      <View style={{
        backgroundColor: LOCK.surface2,
        borderRadius: 14,
        borderWidth: 1, borderColor: LOCK.line,
        paddingHorizontal: 14, paddingVertical: 12,
        gap: 8, marginBottom: 12,
      }}>
        {!!detail.stroke_count && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <AppText variant="caption" style={{ color: LOCK.t3, width: 44 }}>획수</AppText>
            <AppText variant="body" style={{ color: LOCK.t2 }}>{detail.stroke_count}획</AppText>
          </View>
        )}
        {!!detail.components && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <AppText variant="caption" style={{ color: LOCK.t3, width: 44 }}>구성</AppText>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="body" style={{ color: LOCK.t2 }}>{detail.components}</AppText>
              <PressableScale onPress={() => {
                const chars = [...detail.surface].filter(c => c >= '一' && c <= '鿿');
                onShowComponents(chars.length > 0 ? chars : [detail.surface]);
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  alignSelf: 'flex-start',
                  backgroundColor: LOCK.surface3,
                  borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: LOCK.line,
                }}>
                  <AppText variant="caption" style={{ color: LOCK.t2 }}>구성 자세히 보기</AppText>
                  <AppText variant="caption" style={{ color: LOCK.t3 }}>›</AppText>
                </View>
              </PressableScale>
            </View>
          </View>
        )}
      </View>

      {/* ── 다음 버튼 ── */}
      <PressableScale onPress={onNext}>
        <View style={{
          backgroundColor: LOCK.brand,
          borderRadius: 16, paddingVertical: 15,
          alignItems: 'center',
        }}>
          <AppText variant="label" style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {isLast ? '완료' : '다음 문제'}
          </AppText>
        </View>
      </PressableScale>
    </ScrollView>
  );
}

// ── 상태 타입 ─────────────────────────────────────────────────────────────────────

type Phase =
  | { type: 'loading' }
  | { type: 'playing'; cursor: number; set: QuizSetResponse }
  | {
      type: 'reveal';
      cursor: number;
      set: QuizSetResponse;
      selectedIndex: number;
      isCorrect: boolean;
      boxGrade: BoxGrade | null;
      offlineMode: boolean;
    }
  | { type: 'cooldown'; cooldownUntil: string }
  | { type: 'noContent' };

// ── 진입점 ────────────────────────────────────────────────────────────────────────

export default function LockQuizScreen({
  navigation,
}: MainStackScreenProps<'LockQuiz'>): React.JSX.Element {
  return (
    <LockQuizView
      onUnlock={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
      onOpenApp={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
      onOpenBoxes={(boxes) => navigation.navigate('BoxOpen', { boxes })}
    />
  );
}

// ── 본체 ─────────────────────────────────────────────────────────────────────────

export function LockQuizView({
  onUnlock, onOpenApp, onOpenBoxes,
}: LockQuizActions): React.JSX.Element {
  const boxes = useBoxes();
  const boxCount = boxes.data?.length ?? 0;
  const { width: screenW } = useWindowDimensions();

  const [now, setNow] = useState(() => new Date());
  const [phase, setPhase] = useState<Phase>({ type: 'loading' });
  const [isOnline, setIsOnline] = useState(true);
  const [componentChars, setComponentChars] = useState<string[] | null>(null);

  const startRef = useRef(0);
  const submitLockRef = useRef(false);
  const mountedRef = useRef(true);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 분 단위 시계
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // 오프라인 pending 동기화
  const flushPending = useCallback(async () => {
    const pending = getPendingAnswers();
    if (!pending.length) { return; }
    try {
      await syncAnswers(pending);
      clearPendingAnswers();
    } catch { /* 다음 기회에 재시도 */ }
  }, []);

  // 세트 로드
  const loadSet = useCallback(async () => {
    setPhase({ type: 'loading' });
    submitLockRef.current = false;

    try {
      const set = await getQuizSet();
      if (!mountedRef.current) { return; }
      setIsOnline(true);
      flushPending();

      if (set.cooldown_until && !set.questions.length) {
        setPhase({ type: 'cooldown', cooldownUntil: set.cooldown_until });
        return;
      }
      if (!set.questions.length) {
        setPhase({ type: 'noContent' });
        return;
      }

      setCachedSet(set);

      // 세트 내 한자 추출 → 구성 트리 백그라운드 prefetch (오프라인 대비)
      const kanjiChars = new Set<string>();
      for (const q of set.questions) {
        const surface = q.detail?.surface ?? '';
        for (const c of surface) {
          if (c >= '一' && c <= '鿿') { kanjiChars.add(c); }
        }
      }
      for (const char of kanjiChars) {
        if (!getCachedComponentTree(char)) {
          getKanjiComponents(char)
            .then((res: { data: ComponentTreeResponse }) => setCachedComponentTree(char, res.data))
            .catch(() => {});
        }
      }

      // 서버의 answered 플래그 기준으로 첫 미답변 문항으로 커서 이동
      const firstUnanswered = set.questions.findIndex(q => !q.answered);
      if (firstUnanswered === -1) {
        // 모든 문항이 이미 answered — 새 세트 또는 쿨다운 상태를 다시 요청
        loadSet();
        return;
      }
      setCursor(firstUnanswered);
      startRef.current = Date.now();
      setPhase({ type: 'playing', cursor: firstUnanswered, set });
    } catch (err: any) {
      if (!mountedRef.current) { return; }

      // 네트워크 오류 → 캐시 세트로 오프라인 진행
      if (!err?.response) {
        setIsOnline(false);
        const cached = getCachedSet();
        if (cached && cached.questions.length) {
          const cursor = getCursor();
          const safeCursor = cursor < cached.questions.length ? cursor : 0;
          startRef.current = Date.now();
          setPhase({ type: 'playing', cursor: safeCursor, set: cached });
        } else {
          setPhase({ type: 'noContent' });
        }
        return;
      }
      // 409: 콘텐츠 없음. 그 외 HTTP 오류(404, 500 등)도 noContent로 처리해 무한 로딩 방지.
      setPhase({ type: 'noContent' });
    }
  }, [flushPending]);

  useEffect(() => {
    mountedRef.current = true;
    loadSet();
    return () => {
      mountedRef.current = false;
      if (cooldownTimerRef.current) { clearTimeout(cooldownTimerRef.current); }
    };
  }, [loadSet]);

  // 쿨다운 자동 해제
  useEffect(() => {
    if (phase.type !== 'cooldown') { return; }
    const diff = new Date(phase.cooldownUntil).getTime() - Date.now();
    if (diff <= 0) { loadSet(); return; }
    cooldownTimerRef.current = setTimeout(() => {
      if (mountedRef.current) { loadSet(); }
    }, diff);
    return () => {
      if (cooldownTimerRef.current) { clearTimeout(cooldownTimerRef.current); }
    };
  }, [phase, loadSet]);

  const handleSelect = useCallback(async (choiceIndex: number) => {
    if (submitLockRef.current || phase.type !== 'playing') { return; }
    submitLockRef.current = true;

    const { cursor, set } = phase;
    const question = set.questions[cursor];
    const answerMs = Date.now() - startRef.current;

    if (isOnline) {
      try {
        const res = await submitAnswer({
          question_token: question.question_token,
          choice_index: choiceIndex,
          answer_ms: answerMs,
        });
        if (!mountedRef.current) { return; }
        setIsOnline(true);
        if (res.box_id !== null) { boxes.refetch(); }
        setPhase({
          type: 'reveal', cursor, set,
          selectedIndex: choiceIndex,
          isCorrect: res.is_correct,
          boxGrade: res.box_grade,
          offlineMode: false,
        });
      } catch (err: any) {
        if (!mountedRef.current) { return; }
        if (!err?.response) {
          setIsOnline(false);
          const isCorrect = choiceIndex === question.answer_index;
          addPendingAnswer({
            question_token: question.question_token,
            choice_index: choiceIndex,
            answer_ms: answerMs,
            answered_at: new Date().toISOString(),
          });
          setPhase({ type: 'reveal', cursor, set, selectedIndex: choiceIndex, isCorrect, boxGrade: null, offlineMode: true });
        } else {
          submitLockRef.current = false;
        }
      }
    } else {
      const isCorrect = choiceIndex === question.answer_index;
      addPendingAnswer({
        question_token: question.question_token,
        choice_index: choiceIndex,
        answer_ms: answerMs,
        answered_at: new Date().toISOString(),
      });
      setPhase({ type: 'reveal', cursor, set, selectedIndex: choiceIndex, isCorrect, boxGrade: null, offlineMode: true });
    }
  }, [phase, isOnline, boxes]);

  const handleNext = useCallback(() => {
    if (phase.type !== 'reveal') { return; }
    const { cursor, set } = phase;
    const nextCursor = cursor + 1;

    if (nextCursor >= set.questions.length) {
      // 세트 완료 → 온라인이면 새 세트(서버가 쿨다운 반환), 오프라인이면 noContent
      loadSet();
    } else {
      setCursor(nextCursor);
      startRef.current = Date.now();
      submitLockRef.current = false;
      setPhase({ type: 'playing', cursor: nextCursor, set });
    }
  }, [phase, loadSet]);

  const openBoxes = useCallback(() => {
    if (!boxes.data || !boxes.data.length) { return; }
    onOpenBoxes(boxes.data.map((b) => ({ id: b.id, grade: b.grade })));
  }, [boxes.data, onOpenBoxes]);

  // ── 스와이프 잠금해제 ──────────────────────────────────────────────────────────

  const dragX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  const dimsRef = useRef({ screenW });
  dimsRef.current.screenW = screenW;

  const pan = useRef(
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX(10)
      .failOffsetY([-14, 14])
      .onUpdate((e) => {
        if (e.translationX >= 0) {
          dragX.setValue(Math.min(e.translationX, dimsRef.current.screenW));
        }
      })
      .onEnd((e) => {
        const unlockDist = dimsRef.current.screenW * 0.5;
        if (e.translationX > unlockDist || e.velocityX > 600) {
          Tts.stop();
          Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: false }).start(
            () => onUnlockRef.current(),
          );
        } else {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
        }
      }),
  ).current;

  // ── 렌더 헬퍼 ─────────────────────────────────────────────────────────────────

  const clock = formatClock(now);
  const currentQuestion: QuizSetQuestion | null =
    (phase.type === 'playing' || phase.type === 'reveal')
      ? phase.set.questions[phase.cursor]
      : null;
  const totalQuestions =
    (phase.type === 'playing' || phase.type === 'reveal')
      ? phase.set.questions.length
      : 0;
  const cursorDisplay =
    (phase.type === 'playing' || phase.type === 'reveal') ? phase.cursor + 1 : 0;

  function choiceVisual(index: number, selectedIndex: number | null, correctIndex: number): ChoiceVisual {
    if (selectedIndex === null) { return 'default'; }
    if (index === correctIndex) { return 'correct'; }
    if (index === selectedIndex) { return 'wrong'; }
    return 'dimmed';
  }

  // reveal 단계에서 선택된 인덱스를 알아야 함 → reveal 시 question.answer_index가 correct
  // 사용자가 선택한 인덱스는 저장 안 함(정/오답만 저장). ChoiceVisual 계산을 단순화:
  // - 정답이면 answer_index만 correct, 나머지 dimmed
  // - 오답이면 answer_index correct, 사용자 선택 wrong (별도 추적 필요)
  // 현재 구현은 답안 선택 index를 reveal에 넘기지 않으므로, 오답 시 "정답만 강조"로 단순화.

  // ── 퀴즈 영역 콘텐츠 ──────────────────────────────────────────────────────────

  const renderQuizArea = () => {
    if (phase.type === 'loading') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={LOCK.brand} />
        </View>
      );
    }

    if (phase.type === 'noContent') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Icon name="sparkles" size={44} color={LOCK.amber} />
          <AppText variant="title" style={{ color: LOCK.t1, textAlign: 'center' }}>
            오늘 복습할 문제가 없어요
          </AppText>
        </View>
      );
    }

    if (phase.type === 'cooldown') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Icon name="clock" size={40} color={LOCK.t3} />
          <AppText variant="subheading" style={{ color: LOCK.t1, textAlign: 'center' }}>
            다음 세트까지
          </AppText>
          <CooldownTimer until={phase.cooldownUntil} />
        </View>
      );
    }

    if (!currentQuestion) { return null; }

    // reveal 단계: 문제 영역 전체를 결과 패널로 교체
    if (phase.type === 'reveal') {
      return (
        <AnswerReveal
          question={currentQuestion}
          isCorrect={phase.isCorrect}
          boxGrade={phase.boxGrade}
          selectedIndex={phase.selectedIndex}
          offlineMode={phase.offlineMode}
          onNext={handleNext}
          isLast={phase.cursor + 1 >= totalQuestions}
          cursor={phase.cursor}
          totalQuestions={totalQuestions}
          onShowComponents={setComponentChars}
        />
      );
    }

    // playing 단계
    const showAudio =
      currentQuestion.question_type === 'word_to_meaning' ||
      currentQuestion.item_type === 'kana';

    return (
      <View style={{ flex: 1, paddingTop: 12 }}>
        {/* 진행 표시 */}
        <AppText
          variant="caption"
          style={{ color: LOCK.t3, textAlign: 'center', marginBottom: 6 }}>
          {cursorDisplay} / {totalQuestions}
        </AppText>

        {/* 읽기 */}
        {!!currentQuestion.reading && (
          <AppText
            variant="caption"
            style={{ color: LOCK.t3, textAlign: 'center', letterSpacing: 1.5, marginBottom: 2 }}>
            {currentQuestion.reading}
          </AppText>
        )}

        {/* 문제 */}
        <AppText
          variant="hero"
          style={{
            color: '#fff', fontSize: 52, lineHeight: 58,
            letterSpacing: -1, textAlign: 'center', marginBottom: 6,
          }}>
          {currentQuestion.prompt}
        </AppText>

        {/* 음성 버튼 */}
        {showAudio && (
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <AudioButton text={currentQuestion.detail.reading || currentQuestion.prompt} />
          </View>
        )}

        {/* 지시문 */}
        <AppText
          variant="label"
          style={{ color: LOCK.t2, textAlign: 'center', marginBottom: 16 }}>
          {quizInstruction(currentQuestion.item_type, currentQuestion.question_type)}
        </AppText>

        {/* 선택지 */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap',
          justifyContent: 'space-between', rowGap: 10,
        }}>
          {currentQuestion.choices.map((choice) => (
            <ChoiceCard
              key={choice.index}
              text={choice.text}
              visual="default"
              disabled={false}
              onPress={() => handleSelect(choice.index)}
            />
          ))}
        </View>
      </View>
    );
  };

  // ── 전체 레이아웃 ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: LOCK.bg }}>
      <LockBackground />
      <GestureDetector gesture={pan}>
        <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: dragX }] }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          {/* 상단: 시계 + 액션 (현행 유지) */}
          <View style={{
            paddingHorizontal: 24, paddingTop: 14,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <View>
              <AppText
                variant="hero"
                style={{ color: '#fff', fontSize: 50, letterSpacing: -1.5 }}>
                {clock.time}
              </AppText>
              <AppText variant="caption" style={{ color: LOCK.t2, marginTop: 8 }}>
                {clock.date}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <PressableScale onPress={onOpenApp}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 46 }}>
                  <AppText variant="label" style={{ color: LOCK.t2 }}>앱 열기</AppText>
                  <Icon name="chevron-right" size={15} color={LOCK.t2} strokeWidth={2.4} />
                </View>
              </PressableScale>
              <PressableScale onPress={openBoxes} disabled={boxCount === 0}>
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: LOCK.surface2,
                  borderWidth: 1, borderColor: 'rgba(255,206,0,0.45)',
                  opacity: boxCount === 0 ? 0.45 : 1,
                }}>
                  <Icon name="gift" size={20} color={LOCK.amber} strokeWidth={2} />
                  {boxCount > 0 && (
                    <View style={{
                      position: 'absolute', top: -5, right: -5,
                      minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
                      backgroundColor: LOCK.amber,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AppText variant="micro" style={{ color: '#241b00', fontWeight: '800' }}>
                        {boxCount}
                      </AppText>
                    </View>
                  )}
                </View>
              </PressableScale>
            </View>
          </View>

          {/* 중앙: 퀴즈 */}
          <View style={{ flex: 1, paddingHorizontal: 22 }}>
            {renderQuizArea()}
          </View>

          {/* 하단: 밀어서 잠금해제 */}
          <View style={{ paddingBottom: 26, alignItems: 'center', paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="caption" style={{ color: LOCK.t3, letterSpacing: 0.3 }}>
                밀어서 잠금해제
              </AppText>
              <Icon name="chevron-right" size={14} color={LOCK.t3} strokeWidth={2.2} />
            </View>
            <View style={{
              marginTop: 12, width: 128, height: 5, borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.16)',
            }} />
          </View>

        </SafeAreaView>
        </Animated.View>
      </GestureDetector>

      {/* 구성자 트리 모달 */}
      {componentChars !== null && (
        <ComponentTreeModal
          characters={componentChars}
          onClose={() => setComponentChars(null)}
        />
      )}
    </View>
  );
}

// ── 쿨다운 카운터 ─────────────────────────────────────────────────────────────────

function CooldownTimer({ until }: { until: string }): React.JSX.Element {
  const [remaining, setRemaining] = useState(() => formatRemaining(until));
  useEffect(() => {
    const id = setInterval(() => setRemaining(formatRemaining(until)), 1000);
    return () => clearInterval(id);
  }, [until]);
  return (
    <AppText variant="display" style={{ color: LOCK.brand, fontWeight: '700', letterSpacing: 2 }}>
      {remaining}
    </AppText>
  );
}
