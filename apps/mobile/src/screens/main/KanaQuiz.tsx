/**
 * KanaQuiz — 가나 로컬 4지선다 퀴즈 (모달).
 *
 * 서버 미지원이라 프론트 로컬 데이터(data/kana.ts)로 동작. 캐시/원장과 무관한 순수 연습.
 * 글자→발음 / 발음→글자 두 방향을 랜덤으로 섞어 10문제 출제.
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText, Button, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { ALL_KANA, glyph, type KanaScript } from '../../data/kana';

const QUESTION_COUNT = 10;

type Question = {
  prompt: string;
  answer: string;
  options: string[];
  /** glyph→romaji 인지 romaji→glyph 인지 (라벨용). */
  askRomaji: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 정답 제외 후보에서 중복 없이 n개 뽑기. */
function pickDistractors(pool: string[], answer: string, n: number): string[] {
  const uniq = Array.from(new Set(pool.filter((v) => v !== answer)));
  return shuffle(uniq).slice(0, n);
}

function buildSession(script: KanaScript): Question[] {
  const picks = shuffle(ALL_KANA).slice(0, QUESTION_COUNT);
  return picks.map((cell) => {
    const askRomaji = Math.random() < 0.5;
    if (askRomaji) {
      const answer = cell.romaji;
      const distractors = pickDistractors(ALL_KANA.map((c) => c.romaji), answer, 3);
      return { prompt: glyph(cell, script), answer, options: shuffle([answer, ...distractors]), askRomaji };
    }
    const answer = glyph(cell, script);
    const distractors = pickDistractors(ALL_KANA.map((c) => glyph(c, script)), answer, 3);
    return { prompt: cell.romaji, answer, options: shuffle([answer, ...distractors]), askRomaji };
  });
}

export interface KanaQuizProps {
  visible: boolean;
  script: KanaScript;
  onClose: () => void;
}

export function KanaQuiz({ visible, script, onClose }: KanaQuizProps): React.JSX.Element {
  const c = useThemeColors();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // 모달이 열릴 때마다 새 세션 생성.
  useEffect(() => {
    if (visible) {
      setQuestions(buildSession(script));
      setIndex(0);
      setPicked(null);
      setCorrectCount(0);
    }
  }, [visible, script]);

  const q = questions[index];
  const finished = questions.length > 0 && index >= questions.length;

  function choose(option: string) {
    if (picked || !q) {
      return;
    }
    setPicked(option);
    if (option === q.answer) {
      setCorrectCount((n) => n + 1);
    }
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-bg-secondary">
        {/* 상단 바 */}
        <View className="flex-row items-center justify-between px-xl pb-md pt-2xl">
          <Pressable onPress={onClose} hitSlop={10} className="active:opacity-60">
            <Icon name="close" size={24} color={c['text-secondary']} />
          </Pressable>
          <AppText variant="subheading" className="text-text-secondary">
            {finished ? '완료' : `${Math.min(index + 1, QUESTION_COUNT)} / ${QUESTION_COUNT}`}
          </AppText>
          <View style={{ width: 24 }} />
        </View>

        {finished ? (
          <View className="flex-1 items-center justify-center gap-lg px-xl">
            <Icon name="check-circle" size={56} color={c.success} />
            <AppText variant="display" className="text-text-primary">
              {correctCount} / {QUESTION_COUNT} 정답
            </AppText>
            <View className="mt-md w-full gap-md">
              <Button title="다시 풀기" onPress={() => setQuestions(buildSession(script))} />
              <Button title="닫기" variant="soft" onPress={onClose} />
            </View>
          </View>
        ) : q ? (
          <View className="flex-1 px-xl">
            {/* 문제 */}
            <View className="flex-1 items-center justify-center gap-sm">
              <AppText variant="caption" className="text-text-tertiary">
                {q.askRomaji ? '이 글자의 발음은?' : '이 발음의 글자는?'}
              </AppText>
              <AppText style={{ fontSize: 96, lineHeight: 110, color: c['text-primary'] }}>
                {q.prompt}
              </AppText>
            </View>

            {/* 선택지 */}
            <View className="gap-md pb-2xl">
              {q.options.map((option) => {
                const isAnswer = option === q.answer;
                const isPicked = option === picked;
                const showResult = picked !== null;
                let bg = c['bg-primary'];
                let border = c['border-secondary'];
                let textColor = c['text-primary'];
                if (showResult && isAnswer) {
                  bg = c['success-subtle'];
                  border = c.success;
                  textColor = c.success;
                } else if (showResult && isPicked && !isAnswer) {
                  bg = c['danger-subtle'];
                  border = c.danger;
                  textColor = c.danger;
                }
                return (
                  <Pressable
                    key={option}
                    onPress={() => choose(option)}
                    disabled={showResult}
                    className="rounded-md px-xl py-lg active:opacity-80"
                    style={{ backgroundColor: bg, borderWidth: 1, borderColor: border }}>
                    <AppText variant="title" style={{ color: textColor, textAlign: 'center' }}>
                      {option}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* 다음 */}
            <View className="pb-2xl">
              <Button
                title={index === QUESTION_COUNT - 1 ? '결과 보기' : '다음'}
                onPress={next}
                disabled={picked === null}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export default KanaQuiz;
