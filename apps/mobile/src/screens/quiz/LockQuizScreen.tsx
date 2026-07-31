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
} from 'react-native';
import Tts from 'react-native-tts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

import { AppText, Icon, PressableScale, useToast } from '../../components';
import {
  getQuizSet,
  submitAnswer,
  syncAnswers,
  toggleBookmark,
  type BoxGrade,
  type QuizSetQuestion,
  type QuizSetResponse,
} from '../../api/quiz';
import type { BoxItem } from '../../api/hooks';
import {
  getKanjiComponents,
  type ComponentNode,
  type ComponentTreeResponse,
} from '../../api/content';
import { useBoxes } from '../../api/hooks';
import { quizInstruction } from '../../lib/quizCopy';
import { readingLine, speakList } from '../../lib/readingView';
import { playSfx, preloadSfx } from '../../lib/sfx';
import {
  addPendingAnswer,
  clearCachedSet,
  removePendingAnswers,
  getCachedSet,
  getCachedComponentTree,
  getCursor,
  getPendingAnswers,
  markAnswered,
  setCachedSet,
  setCachedComponentTree,
  setCursor,
  setLastReview,
  type ReviewEntry,
  type ReviewData,
} from '../../store/quizSet';
import { QuizReviewModal } from './QuizReviewModal';
import type { MainStackScreenProps } from '../../navigation/types';
import { QuizThemeProvider } from '../../theme/quiz/QuizThemeProvider';
import { useQuizTheme } from '../../theme/quiz/useQuizTheme';
import { withAlpha } from '../../theme/quiz/withAlpha';
import {
  CARD_INNER_W_DEFAULT, CARD_INNER_W_PANEL, ChoiceCard, choiceFontSize,
} from './components/ChoiceCard';
import { QuizBackground } from './components/QuizBackground';
import { AudioButton } from './components/AudioButton';
import { canApplyReveal } from './revealPatch';

export type LockQuizActions = {
  onUnlock: () => void;
  onOpenApp: () => void;
  onOpenBoxes: (boxes: BoxItem[]) => void;
};

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
  const theme = useQuizTheme();
  const c = theme.colors;
  const node = nodes[char];
  const alreadySeen = visited.has(char);
  const newVisited = new Set([...visited, char]);

  if (!node) { return null; }

  const readings = (node.readings ?? []).map(r => r.display).join(' · ');

  return (
    <View>
      <View style={{
        paddingVertical: 8,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderLeftWidth: depth > 0 ? 1 : 0,
        borderLeftColor: c.line,
        marginLeft: depth > 0 ? depth * 20 : 0,
        paddingLeft: depth > 0 ? 12 : 0,
      }}>
        <AppText style={{
          color: depth === 0 ? c.textPrimary : c.textSecondary,
          fontSize: depth === 0 ? 36 : 28,
          fontWeight: '700', lineHeight: depth === 0 ? 44 : 36,
          paddingBottom: 4,
          minWidth: 40,
        }}>
          {char}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="body" style={{ color: c.textPrimary, fontWeight: depth === 0 ? '700' : '400' }}>
            {node.meaning_ko}
          </AppText>
          {!!readings && (
            <AppText variant="caption" style={{ color: c.textTertiary }}>{readings}</AppText>
          )}
        </View>
      </View>
      {/* ⚠️ key에 인덱스를 넣는다. 林(木+木)처럼 같은 구성자가 반복되는 한자가 있어
          글자만으로는 형제 간 key가 겹친다. */}
      {!alreadySeen && !node.is_leaf && node.components.map((child, i) => (
        <NodeRow
          key={`${depth + 1}-${i}-${child}`}
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
  const theme = useQuizTheme();
  const c = theme.colors;
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
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }
  if (error) {
    return (
      <AppText variant="body" style={{ color: c.textTertiary, textAlign: 'center', paddingVertical: 40 }}>
        구성 정보를 불러오지 못했어요
      </AppText>
    );
  }
  if (!data || !data.nodes[character]) {
    return (
      <AppText variant="body" style={{ color: c.textTertiary }}>구성 정보 없음</AppText>
    );
  }
  // depth 0 = 이 한자 자신, depth 1 = 구성자, depth 2~ = 구성자의 구성자.
  // (예전엔 구성자부터 그리고 본체는 visited로 배제해서, 정작 공부 중인 한자의
  //  뜻·음훈독을 볼 수 없었다. 본체를 트리 뿌리로 세운다.)
  return (
    <View style={{ gap: 4 }}>
      <NodeRow char={character} depth={0} nodes={data.nodes} visited={new Set()} />
      {data.root_components.length === 0 && (
        <AppText variant="caption" style={{ color: c.textTertiary, marginTop: 4 }}>
          더 쪼갤 구성자가 없어요
        </AppText>
      )}
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
  const theme = useQuizTheme();
  const c = theme.colors;
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
          backgroundColor: c.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTopWidth: 1, borderColor: c.line,
        }}>
          {/* 핸들 */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2 }} />
          </View>

          {/* 헤더: 탭(한자 여러 개) + 닫기 */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0,
            borderBottomWidth: 1, borderBottomColor: c.line,
          }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {characters.map((char, i) => {
                const active = i === tabIndex;
                return (
                  <PressableScale key={char} onPress={() => setTabIndex(i)}>
                    <View style={{
                      paddingHorizontal: 16, paddingVertical: 10,
                      borderBottomWidth: 2.5,
                      borderBottomColor: active ? c.brand : 'transparent',
                    }}>
                      <AppText style={{
                        color: active ? c.textPrimary : c.textTertiary,
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
                backgroundColor: c.surface,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Icon name="close" size={16} color={c.textSecondary} strokeWidth={2.5} />
              </View>
            </PressableScale>
          </View>

          {/* 본문 */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            key={activeChar}>
            <AppText variant="caption" style={{ color: c.textTertiary, marginBottom: 12 }}>구성</AppText>
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
  offlineMode,
  onNext,
  isLast,
  cursor,
  totalQuestions,
  onShowComponents,
  onNetworkError,
}: {
  question: QuizSetQuestion;
  isCorrect: boolean;
  boxGrade: BoxGrade | null;
  offlineMode: boolean;
  onNext: () => void;
  isLast: boolean;
  cursor: number;
  totalQuestions: number;
  onShowComponents: (chars: string[]) => void;
  onNetworkError: () => void;
}): React.JSX.Element {
  const theme = useQuizTheme();
  const c = theme.colors;
  const { detail } = question;
  const [bookmarked, setBookmarked] = useState(false);

  const handleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await toggleBookmark(question.item_type, question.item_id, next);
    } catch (err: any) {
      setBookmarked(!next);
      if (!err?.response) { onNetworkError(); }
    }
  };

  const accentBg    = isCorrect ? withAlpha(c.correct, 0.12) : withAlpha(c.wrong, 0.12);
  const accentColor = isCorrect ? c.correct                  : c.wrong;

  // 정답 순간 연출 — 결과 아이콘 칩 pop, 정답 글자·정보 블록은 아래에서 올라오며 fade-in.
  // 마운트 시 1회.
  const chipScale = useRef(new Animated.Value(0)).current;
  const boxScale = useRef(new Animated.Value(0)).current;
  const revealFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(chipScale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
    Animated.timing(revealFade, { toValue: 1, duration: 260, delay: 80, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "상자 +1" 뱃지는 별도 effect다.
  // ⚠️ 위 마운트 effect에 같이 두면 안 된다. 낙관적 UI로 화면을 먼저 넘기기 때문에
  //    boxGrade는 마운트 시엔 null이고 서버 응답이 온 뒤 채워진다. [] 의존성이면 그 전환을
  //    놓쳐서 애니메이션이 시작되지 않고, opacity가 0에 머물러 뱃지가 아예 안 보인다.
  const showBoxBadge = isCorrect && !!boxGrade && !offlineMode;
  useEffect(() => {
    if (!showBoxBadge) { return; }
    Animated.spring(boxScale, { toValue: 1, friction: 4.5, tension: 170, useNativeDriver: true }).start();
  }, [showBoxBadge, boxScale]);
  const revealTranslate = revealFade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  // 정답 글자 크기 — 글자 수 기반(한자·가나 공통). 긴 단어일수록 작게, 단계는 완만하게.
  const surfaceLen = [...detail.surface].length;
  const surfaceFontSize = surfaceLen <= 4 ? 70 : surfaceLen <= 6 ? 56 : 44;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 }}>

      {/* ── 결과 스트라이프 (아이콘 칩 + 텍스트, 테두리 없이 면만) ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: accentBg,
        borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 16,
      }}>
        {/* 결과: 아이콘 칩(pop) + 텍스트 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Animated.View style={{
            width: 26, height: 26, borderRadius: 13,
            backgroundColor: withAlpha(accentColor, 0.2),
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: chipScale }],
          }}>
            <Icon name={isCorrect ? 'check' : 'close'} size={15} color={accentColor} strokeWidth={3} />
          </Animated.View>
          <AppText style={{ color: accentColor, fontWeight: '800', fontSize: 17 }}>
            {isCorrect ? '정답입니다!' : '아쉬워요'}
          </AppText>
        </View>

        {/* 우측: 상자뱃지 + 북마크 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {showBoxBadge && (
            <Animated.View style={{
              backgroundColor: withAlpha(c.amber, 0.16),
              borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
              transform: [{ scale: boxScale }], opacity: boxScale,
            }}>
              <AppText variant="caption" style={{ color: c.amber, fontWeight: '700' }}>
                상자 +1
              </AppText>
            </Animated.View>
          )}
          {offlineMode && (
            <AppText variant="caption" style={{ color: c.textTertiary }}>오프라인</AppText>
          )}
          <AppText variant="caption" style={{ color: c.textTertiary }}>
            {cursor + 1} / {totalQuestions}
          </AppText>
          <PressableScale onPress={handleBookmark} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon
              name={bookmarked ? 'bookmark-filled' : 'bookmark'}
              size={20}
              color={bookmarked ? c.amber : c.textTertiary}
              strokeWidth={2}
            />
          </PressableScale>
        </View>
      </View>

      {/* ── 정답 글자(위) + 정보(아래) — 아래에서 올라오며 fade-in ── */}
      <Animated.View style={{ marginBottom: 18, gap: 12, opacity: revealFade, transform: [{ translateY: revealTranslate }] }}>
        {/* 정답 글자 — 글자 수 기반 크기(한자·가나 공통). adjustsFontSizeToFit은 극단(8자+) 안전망. */}
        <AppText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{
            color: c.textPrimary,
            fontSize: surfaceFontSize, lineHeight: surfaceFontSize * 1.12,
            letterSpacing: -1.5, fontWeight: '700',
          }}>
          {detail.surface}
        </AppText>

        {/* 뜻·읽기·급수·듣기 — 글자 아래 */}
        <View style={{ gap: 6 }}>
          {!!detail.meaning && (
            <AppText variant="subheading" style={{ color: c.textPrimary, fontWeight: '700' }}>
              {detail.meaning}
            </AppText>
          )}
          {!!readingLine(detail) && (
            <AppText variant="caption" style={{ color: c.textSecondary }}>{readingLine(detail)}</AppText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {!!question.jlpt_level && (
              <View style={{
                backgroundColor: withAlpha(c.brand, 0.13),
                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <AppText variant="micro" style={{ color: c.brand, fontWeight: '700' }}>
                  {question.jlpt_level}
                </AppText>
              </View>
            )}
            <AudioButton readings={speakList(detail)} />
          </View>
        </View>
      </Animated.View>

      {/* ── 설명 카드 ── */}
      <View style={{
        backgroundColor: c.surface,
        borderRadius: 14,
        borderWidth: 1, borderColor: c.line,
        paddingHorizontal: 14, paddingVertical: 12,
        gap: 8, marginBottom: 12,
      }}>
        {!!detail.stroke_count && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <AppText variant="caption" style={{ color: c.textTertiary, width: 44 }}>획수</AppText>
            <AppText variant="body" style={{ color: c.textSecondary }}>{detail.stroke_count}획</AppText>
          </View>
        )}
        {!!detail.components && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <AppText variant="caption" style={{ color: c.textTertiary, width: 44 }}>구성</AppText>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="body" style={{ color: c.textSecondary }}>{detail.components}</AppText>
              <PressableScale onPress={() => {
                // 중복 제거 — 日曜日처럼 같은 한자가 두 번 나오면 탭이 두 개 생기고
                // key도 겹친다. 같은 글자는 한 번만 보여주면 된다.
                const chars = [...new Set(
                  [...detail.surface].filter(ch => ch >= '一' && ch <= '鿿'),
                )];
                onShowComponents(chars.length > 0 ? chars : [detail.surface]);
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  alignSelf: 'flex-start',
                  backgroundColor: c.surfaceAlt,
                  borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6,
                }}>
                  <AppText variant="caption" style={{ color: c.textSecondary, fontWeight: '600' }}>구성 자세히 보기</AppText>
                  <Icon name="chevron-right" size={13} color={c.textTertiary} strokeWidth={2.4} />
                </View>
              </PressableScale>
            </View>
          </View>
        )}
      </View>

      {/* ── 사용 단어 (가나 퀴즈 전용) ── */}
      {question.item_type === 'kana' && !!detail.example_words?.length && (
        <View style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1, borderColor: c.line,
          paddingHorizontal: 14, paddingVertical: 12,
          marginBottom: 12,
        }}>
          <AppText variant="caption" style={{ color: c.textTertiary, marginBottom: 10 }}>
            사용 단어
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {detail.example_words.map((ex) => (
              <PressableScale
                key={ex.surface}
                onPress={() => { Tts.speak(ex.surface); }}
                pressedScale={0.96}
                style={{ flex: 1 }}>
                <View style={{
                  backgroundColor: withAlpha(c.brand, 0.07),
                  borderRadius: 10,
                  borderWidth: 1, borderColor: withAlpha(c.brand, 0.15),
                  paddingHorizontal: 12, paddingVertical: 10,
                  gap: 2,
                }}>
                  <AppText style={{ color: c.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>
                    {ex.surface}
                  </AppText>
                  {!!ex.kanji && (
                    <AppText variant="caption" style={{ color: c.textTertiary }}>
                      {ex.kanji}
                    </AppText>
                  )}
                  {!!ex.meaning && (
                    <AppText variant="body" style={{ color: c.textSecondary }}>
                      {ex.meaning}
                    </AppText>
                  )}
                </View>
              </PressableScale>
            ))}
          </View>
        </View>
      )}

      {/* ── 예문 (가나 단어 전용) ── */}
      {question.item_type === 'word' && question.word_type === 'kana' && !!detail.examples?.length && (
        <View style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1, borderColor: c.line,
          paddingHorizontal: 14, paddingVertical: 12,
          gap: 12, marginBottom: 12,
        }}>
          <AppText variant="caption" style={{ color: c.textTertiary }}>
            예문
          </AppText>
          {detail.examples.map((ex, i) => (
            <View
              key={i}
              style={{
                gap: 3,
                paddingTop: i === 0 ? 0 : 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.line,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <AppText style={{ color: c.textPrimary, fontSize: 17, fontWeight: '700', lineHeight: 24, flex: 1 }}>
                  {ex.origin}
                </AppText>
                <AudioButton readings={[ex.reading || ex.origin]} />
              </View>
              {!!ex.reading && ex.reading !== ex.origin && (
                <AppText variant="caption" style={{ color: c.textTertiary }}>
                  {ex.reading}
                </AppText>
              )}
              {!!ex.translation && (
                <AppText variant="body" style={{ color: c.textSecondary }}>
                  {ex.translation}
                </AppText>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── 다음 버튼 ── */}
      <PressableScale onPress={onNext} pressedScale={0.98}>
        <View style={{
          backgroundColor: c.brand,
          borderRadius: 16, paddingVertical: 16,
          alignItems: 'center',
        }}>
          <AppText variant="label" style={{ color: c.onBrand, fontWeight: '800', fontSize: 16 }}>
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
    <QuizThemeProvider>
      <LockQuizView
        onUnlock={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onOpenApp={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        onOpenBoxes={(boxes) => navigation.navigate('BoxOpen', { boxes })}
      />
    </QuizThemeProvider>
  );
}

// ── 본체 ─────────────────────────────────────────────────────────────────────────

export function LockQuizView({
  onUnlock, onOpenApp, onOpenBoxes,
}: LockQuizActions): React.JSX.Element {
  const theme = useQuizTheme();
  const c = theme.colors;
  const { showToast, showNetworkError } = useToast();
  const queryClient = useQueryClient();
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
  // 서버가 답안 토큰을 거부했을 때, 결과 화면을 걷어내지 않고 '다음'에서 세트를 다시 받도록 예약.
  const resyncOnNextRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef<Promise<void> | null>(null);
  const reviewEntriesRef = useRef<ReviewEntry[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lastReviewData, setLastReviewDataState] = useState<ReviewData | null>(null);

  // 분 단위 시계
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  /**
   * 오프라인 pending 동기화.
   *
   * ⚠️ 진행 중인 flush가 있으면 그 프로미스를 **그대로 돌려준다**. boolean 플래그로
   *    "이미 도는 중이니 그냥 반환"하면, 아래 loadSet의 `await flushPending()`이
   *    즉시 통과해 세트 조회가 동기화를 앞질러 버린다(고치려던 버그가 그대로 재현).
   */
  const flushPending = useCallback((): Promise<void> => {
    if (flushingRef.current) { return flushingRef.current; }
    const pending = getPendingAnswers();
    if (!pending.length) { return Promise.resolve(); }

    const task = (async () => {
      try {
        await syncAnswers(pending);
        // 보낸 것만 뺀다 — 전송 중에 새로 쌓인 답까지 지우면 그 답이 사라진다.
        removePendingAnswers(pending.map(a => a.question_token));
      } catch { /* 다음 기회에 재시도 */ }
    })().finally(() => { flushingRef.current = null; });

    flushingRef.current = task;
    return task;
  }, []);

  // 세트 로드
  const loadSet = useCallback(async (opts?: { forceServer?: boolean; notifyOnNetworkFailure?: boolean }) => {
    submitLockRef.current = false;
    reviewEntriesRef.current = [];

    // 캐시된 세트가 있고 마지막 문제 전이면 서버 요청 없이 즉시 재개.
    // 마지막 문제(cursor === length-1)는 이전 세션에서 이미 제출됐을 수 있으므로 서버 확인.
    // forceServer면 캐시가 서버와 어긋났다고 이미 확인된 상태라 캐시를 건너뛰고 서버로 확인한다.
    const cached = getCachedSet();
    const savedCursor = getCursor();
    if (!opts?.forceServer && cached && savedCursor < cached.questions.length - 1) {
      startRef.current = Date.now();
      setPhase({ type: 'playing', cursor: savedCursor, set: cached });
      // 캐시로 재개해도 밀린 답은 비운다(진행을 막지는 않으므로 기다리지 않는다).
      flushPending();
      return;
    }

    setPhase({ type: 'loading' });

    try {
      // ⚠️ 반드시 getQuizSet() 앞에서 기다린다.
      //    밀린 답을 올리기 전에 세트를 받아오면 서버의 answered 플래그가 낡은 값이라,
      //    이미 푼 문항을 '안 푼 것'으로 보고 방금 끝낸 세트를 처음부터 다시 풀게 된다.
      await flushPending();
      const set = await getQuizSet();
      if (!mountedRef.current) { return; }
      setIsOnline(true);

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
        for (const ch of surface) {
          if (ch >= '一' && ch <= '鿿') { kanjiChars.add(ch); }
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
        // 모든 문항이 이미 answered — 새 세트 또는 쿨다운 상태를 다시 요청.
        // ⚠️ 한 번만 다시 묻는다. 서버가 계속 같은(전부 답한) 세트를 주면 무한 재귀로
        //    네트워크를 두들기게 된다. 캐시를 비우고 서버 기준으로 한 번만 재조회한다.
        if (opts?.forceServer) {
          setPhase({ type: 'noContent' });
          return;
        }
        clearCachedSet();
        loadSet({ forceServer: true });
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
        if (opts?.notifyOnNetworkFailure) { showNetworkError(); }
        const cached = getCachedSet();
        // ⚠️ 커서가 세트 끝을 넘었다고 0으로 되돌리면 안 된다. 그러면 이미 다 푼 세트를
        //    1번부터 통째로 다시 풀리고, 그 답들은 온라인 복귀 후 전부 '이미 채점됨'으로
        //    버려진다(SRS·상자·통계 반영 없음). 캐시의 answered 플래그로 이어갈 자리를 찾고,
        //    남은 문항이 없으면 오프라인에서 할 게 없으므로 그대로 알린다.
        const resumeAt = cached
          ? cached.questions.findIndex(q => !q.answered)
          : -1;
        if (cached && cached.questions.length && resumeAt !== -1) {
          setCursor(resumeAt);
          startRef.current = Date.now();
          setPhase({ type: 'playing', cursor: resumeAt, set: cached });
        } else {
          setPhase({ type: 'noContent' });
        }
        return;
      }
      // 409: 콘텐츠 없음. 그 외 HTTP 오류(404, 500 등)도 noContent로 처리해 무한 로딩 방지.
      setPhase({ type: 'noContent' });
    }
  }, [flushPending, showNetworkError]);

  useEffect(() => {
    mountedRef.current = true;
    preloadSfx(); // 첫 정답에서 소리가 안 나지 않게 미리 디코딩
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

  /**
   * 복습(오답노트)은 사용자가 닫을 때만 닫힌다.
   *
   * ⚠️ 예전엔 phase가 playing/noContent가 되면 복습을 자동으로 닫았는데, 세트를 끝내면
   *    복습을 열자마자 loadSet()이 돌기 때문에 새 세트가 바로 잡히는 순간 복습이 꺼져버렸다
   *    (다 읽기도 전에). 새 세트는 복습 뒤에서 대기시키고, 닫아야 보이게 한다.
   */
  const handleCloseReview = useCallback(() => {
    setReviewOpen(false);
    // 복습을 읽는 동안 흐른 시간이 새 세트 첫 문제의 answer_ms에 섞이지 않게 다시 시작.
    startRef.current = Date.now();
  }, []);

  /**
   * 답이 확정된 순간 호출 — 복습 데이터 적재 + 효과음.
   * (온라인 채점 / 제출 중 끊김 / 오프라인, 세 경로 모두 여기를 지난다)
   */
  const recordEntry = useCallback((question: QuizSetQuestion, selectedIndex: number, isCorrect: boolean) => {
    playSfx(isCorrect ? 'correct' : 'wrong');
    reviewEntriesRef.current = [
      ...reviewEntriesRef.current.filter(e => e.question.question_token !== question.question_token),
      { question, selectedIndex, isCorrect },
    ];
  }, []);

  /**
   * reveal 단계를 뒤늦게 보정한다. 서버 응답이 오기 전에 화면을 이미 넘겼으므로,
   * 도착 시점에 사용자가 아직 같은 문항의 결과를 보고 있을 때만 반영한다.
   * (다음 문제로 넘어갔거나 세트를 다시 받았으면 그냥 버린다)
   */
  const patchReveal = useCallback((cursor: number, token: string, patch: Partial<Extract<Phase, { type: 'reveal' }>>) => {
    setPhase(prev => (canApplyReveal(prev, cursor, token) ? { ...prev, ...patch } : prev));
  }, []);

  /**
   * 선택지를 누른 순간.
   *
   * ⚠️ 서버 채점을 기다리지 않는다. 예전엔 `await submitAnswer()` 뒤에 reveal로 넘어가서
   *    정답 표시·효과음·상자 뱃지가 전부 왕복 시간만큼 밀렸다(체크리스트 D "반응이 즉각적이지 않음").
   *    정답키(`answer_index`)는 오프라인 채점용으로 이미 세트 페이로드에 들어있으니,
   *    그걸로 즉시 판정해 화면을 넘기고 서버 응답으로 뒤에서 보정한다.
   *
   *    낙관적으로 앞당기는 건 *표시*뿐이다. 상자 지급·캐시 적립은 그대로 서버가 결정하고,
   *    클라이언트는 응답이 온 뒤에만 뱃지를 띄운다(CLAUDE.md: 캐시는 서버에서 검증).
   */
  const handleSelect = useCallback((choiceIndex: number) => {
    if (submitLockRef.current || phase.type !== 'playing') { return; }
    submitLockRef.current = true;

    const { cursor, set } = phase;
    const question = set.questions[cursor];
    const answerMs = Date.now() - startRef.current;
    const token = question.question_token;
    const isCorrect = choiceIndex === question.answer_index;

    const queueOffline = () => {
      addPendingAnswer({
        question_token: token,
        choice_index: choiceIndex,
        answer_ms: answerMs,
        answered_at: new Date().toISOString(),
      });
    };

    // ── 즉시 반응 ──
    if (!isOnline) { queueOffline(); }
    recordEntry(question, choiceIndex, isCorrect);
    markAnswered(cursor); // 제출 즉시 진행 확정 — 결과 화면에서 나갔다 와도 다시 안 나오게
    setPhase({
      type: 'reveal', cursor, set,
      selectedIndex: choiceIndex,
      isCorrect,
      boxGrade: null,        // 서버 응답이 오면 patchReveal로 채운다
      offlineMode: !isOnline,
    });

    if (!isOnline) { return; }

    // ── 뒤에서 서버 채점 ──
    submitAnswer({ question_token: token, choice_index: choiceIndex, answer_ms: answerMs })
      .then(res => {
        if (!mountedRef.current) { return; }
        setIsOnline(true);
        if (res.box_id !== null) { boxes.refetch(); }
        // ⚠️ 반드시 number 로 확인한다. 필드를 안 주는 서버 응답에선 milestone_bonus 가
        //    undefined 인데, `!== null` 로 검사하면 통과해 오답에도 "정답 undefined개" 토스트가 뜬다.
        if (typeof res.milestone_bonus === 'number' && res.milestone_bonus > 0) {
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
          const countPart = typeof res.today_correct_count === 'number'
            ? `정답 ${res.today_correct_count}개! `
            : '';
          showToast(`${countPart}캐시 ${res.milestone_bonus} 획득`, 'info');
        }
        // 로컬 판정과 서버 판정은 같은 correct_index에서 나오므로 어긋날 일이 없다.
        // 그래도 어긋나면 서버가 맞다 — SRS·캐시가 서버 판정으로 기록되기 때문.
        if (res.is_correct !== isCorrect) {
          recordEntry(question, choiceIndex, res.is_correct);
        }
        patchReveal(cursor, token, { isCorrect: res.is_correct, boxGrade: res.box_grade });
      })
      .catch((err: any) => {
        if (!mountedRef.current) { return; }
        if (!err?.response) {
          // 제출 중 망이 끊겼다 — 표시는 이미 로컬 판정으로 맞게 나가 있으니 큐에만 넣는다.
          setIsOnline(false);
          queueOffline();
          patchReveal(cursor, token, { offlineMode: true });
        } else {
          // 서버가 토큰을 거부(만료/이미 채점됨 등) — 로컬 캐시 커서가 서버와 어긋난 상태다.
          // 같은 토큰을 재시도해봐야 계속 실패하므로 세트를 서버 기준으로 다시 받아야 한다.
          // 다만 지금 화면엔 결과가 이미 떠 있으므로 그 자리에서 걷어내지 않고,
          // '다음'을 누를 때 재조회하도록 예약한다(결과를 보다가 화면이 튀는 걸 막는다).
          resyncOnNextRef.current = true;
        }
      });
  }, [phase, isOnline, boxes, recordEntry, patchReveal, queryClient, showToast]);

  const handleNext = useCallback(() => {
    if (phase.type !== 'reveal') { return; }
    const { cursor, set } = phase;
    const nextCursor = cursor + 1;

    // 서버가 토큰을 거부해 세트가 어긋난 상태 — 결과를 다 보여준 뒤 여기서 다시 받는다.
    if (resyncOnNextRef.current) {
      resyncOnNextRef.current = false;
      submitLockRef.current = false;
      clearCachedSet();
      loadSet({ forceServer: true, notifyOnNetworkFailure: true });
      return;
    }

    if (nextCursor >= set.questions.length) {
      // 세트 완료 → 복습 데이터 저장 후 즉시 복습 화면 열기, 쿨다운은 백그라운드 진행
      clearCachedSet(); // 캐시 클리어: loadSet()이 캐시 히트 대신 서버 요청하도록
      if (reviewEntriesRef.current.length > 0) {
        const reviewData: ReviewData = {
          setId: set.set_id,
          completedAt: new Date().toISOString(),
          entries: reviewEntriesRef.current,
        };
        setLastReview(reviewData);
        setLastReviewDataState(reviewData);
        setReviewOpen(true);
      }
      loadSet();
    } else {
      setCursor(nextCursor);
      startRef.current = Date.now();
      submitLockRef.current = false;
      setPhase({ type: 'playing', cursor: nextCursor, set });
    }
  }, [phase, loadSet]);

  /**
   * 상자 뱃지 → 개봉 화면.
   *
   * ⚠️ 연타를 막아야 한다. 막지 않으면 개봉 화면이 스택에 두 번 쌓여서, 하나를 닫고
   *    뒤로 가면 또 상자 화면이 나온다. (홈도 같은 이유로 잠금을 걸어 뒀다)
   *    화면으로 돌아오면 잠금을 푼다.
   */
  const boxNavLockRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      boxNavLockRef.current = false;
    }, []),
  );
  const openBoxes = useCallback(() => {
    if (boxNavLockRef.current || !boxes.data || !boxes.data.length) { return; }
    boxNavLockRef.current = true;
    onOpenBoxes(boxes.data);
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
          <ActivityIndicator color={c.brand} />
        </View>
      );
    }

    if (phase.type === 'noContent') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Icon name="sparkles" size={44} color={c.amber} />
          <AppText variant="title" style={{ color: c.textPrimary, textAlign: 'center' }}>
            오늘 복습할 문제가 없어요
          </AppText>
        </View>
      );
    }

    if (phase.type === 'cooldown') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Icon name="clock" size={40} color={c.textTertiary} />
          <AppText variant="subheading" style={{ color: c.textPrimary, textAlign: 'center' }}>
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
          offlineMode={phase.offlineMode}
          onNext={handleNext}
          isLast={phase.cursor + 1 >= totalQuestions}
          cursor={phase.cursor}
          totalQuestions={totalQuestions}
          onShowComponents={setComponentChars}
          onNetworkError={showNetworkError}
        />
      );
    }

    // playing 단계
    const showAudio =
      currentQuestion.question_type === 'word_to_meaning' ||
      currentQuestion.item_type === 'kana';

    // 네 선택지가 같은 크기를 쓰도록 가장 긴 것 기준으로 한 번에 정한다(ChoiceCard 주석 참고).
    // 사진 테마는 패널이 한 겹 더 있어 카드가 좁으므로 그 폭으로 계산한다.
    const choiceSize = choiceFontSize(
      currentQuestion.choices.map((ch) => ch.text),
      theme.shape.contentPanel ? CARD_INNER_W_PANEL : CARD_INNER_W_DEFAULT,
    );

    return (
      // 문제+선택지 블록을 약 6px 위로: 세로 중앙 정렬이라 하단 여백을 12 늘리면 중앙이 6 위로 이동.
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 32 }}>
      {/* contentPanel 테마(사용자 사진 배경)는 문제+선택지를 한 판 위에 올려
          어떤 사진이 깔려도 내용 영역만은 평평하게 유지한다. */}
      <View style={theme.shape.contentPanel ? {
        backgroundColor: withAlpha(c.bg, 0.82),
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.line,
        paddingHorizontal: 14,
        paddingTop: 18,
        paddingBottom: 16,
      } : undefined}>
        {/* 읽기 + 문제 — 사진 배경 테마는 뒤에 스크림을 깔아 항상 읽히게 함 */}
        <View style={theme.shape.needsTextScrim ? {
          backgroundColor: withAlpha(c.surface, 0.88),
          borderRadius: theme.shape.radius.card,
          paddingVertical: 14,
          marginBottom: 6,
        } : { marginBottom: 6 }}>
          {!!currentQuestion.reading && (
            <AppText
              variant="caption"
              style={{ color: c.textTertiary, textAlign: 'center', letterSpacing: 1.5, marginBottom: 2 }}>
              {currentQuestion.reading}
            </AppText>
          )}

          <AppText
            variant="hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              color: c.textPrimary, fontSize: 58, lineHeight: 66,
              letterSpacing: -1, textAlign: 'center', fontWeight: '700',
            }}>
            {currentQuestion.prompt}
          </AppText>
        </View>

        {/* 음성 버튼 */}
        {showAudio && (
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <AudioButton readings={speakList(currentQuestion.detail)} />
          </View>
        )}

        {/* 지시문 */}
        <AppText
          variant="label"
          style={{ color: c.textSecondary, textAlign: 'center', marginBottom: 22, fontSize: 15 }}>
          {quizInstruction(currentQuestion.item_type, currentQuestion.question_type)}
        </AppText>

        {/* 선택지 */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap',
          justifyContent: 'space-between', rowGap: 12,
        }}>
          {currentQuestion.choices.map((choice) => (
            <ChoiceCard
              key={choice.index}
              text={choice.text}
              visual="default"
              disabled={false}
              fontSize={choiceSize}
              onPress={() => handleSelect(choice.index)}
            />
          ))}
        </View>
      </View>
      </View>
    );
  };

  // ── 전체 레이아웃 ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <QuizBackground />
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
                style={{ color: c.textPrimary, fontSize: 54, letterSpacing: -1.5 }}>
                {clock.time}
              </AppText>
              <AppText
                variant="caption"
                style={{ color: c.textSecondary, marginTop: 8, fontSize: 16, lineHeight: 21 }}>
                {clock.date}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PressableScale onPress={onOpenApp}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3, height: 40,
                  paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: withAlpha(c.textPrimary, 0.07),
                }}>
                  <AppText variant="label" style={{ color: c.textSecondary, fontWeight: '700' }}>앱 열기</AppText>
                  <Icon name="chevron-right" size={15} color={c.textSecondary} strokeWidth={2.4} />
                </View>
              </PressableScale>
              <PressableScale onPress={openBoxes} disabled={boxCount === 0}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: withAlpha(c.amber, 0.15),
                  opacity: boxCount === 0 ? 0.4 : 1,
                }}>
                  <Icon name="gift" size={20} color={c.amber} strokeWidth={2} />
                  {boxCount > 0 && (
                    <View style={{
                      position: 'absolute', top: -5, right: -5,
                      minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
                      backgroundColor: c.amber,
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

          {/* 진행 게이지 — 상단 정보. 지나온 문제=brand, 현재=brandSoft, 남은 것=옅게. */}
          {(phase.type === 'playing' || phase.type === 'reveal') && (
            <View style={{ paddingHorizontal: 24, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: totalQuestions }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1, height: 6, borderRadius: 3,
                      backgroundColor:
                        i < phase.cursor
                          ? c.brand
                          : i === phase.cursor
                            ? c.brandSoft
                            : withAlpha(c.textTertiary, 0.28),
                    }}
                  />
                ))}
              </View>
              <AppText variant="caption" style={{ color: c.textSecondary, fontWeight: '700' }}>
                {cursorDisplay} / {totalQuestions}
              </AppText>
            </View>
          )}

          {/* 중앙: 퀴즈 */}
          <View style={{ flex: 1, paddingHorizontal: 22 }}>
            {renderQuizArea()}
          </View>

          {/* 하단: 밀어서 잠금해제 */}
          <View style={{ paddingBottom: 26, alignItems: 'center', paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="caption" style={{ color: c.textTertiary, letterSpacing: 0.3 }}>
                밀어서 잠금해제
              </AppText>
              <Icon name="chevron-right" size={14} color={c.textTertiary} strokeWidth={2.2} />
            </View>
            <View style={{
              marginTop: 12, width: 128, height: 5, borderRadius: 3,
              backgroundColor: withAlpha(c.textTertiary, 0.5),
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

      {/* 복습 화면 — 세트 완료 즉시 자동 열림. 닫는 건 사용자만(새 세트는 뒤에서 대기) */}
      {reviewOpen && lastReviewData && (
        <QuizReviewModal
          data={lastReviewData}
          cooldownUntil={phase.type === 'cooldown' ? phase.cooldownUntil : undefined}
          nextStatus={
            phase.type === 'playing' ? 'ready'
              : phase.type === 'noContent' ? 'unavailable'
                : 'waiting'
          }
          onClose={handleCloseReview}
        />
      )}
    </View>
  );
}

// ── 쿨다운 카운터 ─────────────────────────────────────────────────────────────────

function CooldownTimer({ until }: { until: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const c = theme.colors;
  const [remaining, setRemaining] = useState(() => formatRemaining(until));
  useEffect(() => {
    const id = setInterval(() => setRemaining(formatRemaining(until)), 1000);
    return () => clearInterval(id);
  }, [until]);
  return (
    <AppText variant="display" style={{ color: c.brand, fontWeight: '700', letterSpacing: 2 }}>
      {remaining}
    </AppText>
  );
}
