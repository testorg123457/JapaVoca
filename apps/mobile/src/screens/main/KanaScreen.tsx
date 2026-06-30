/**
 * KanaScreen — 히라가나/가타카나 학습.
 *
 * 상단 토글로 스크립트 전환, 가나표(기본 청음 / 탁음·반탁음 / 요음)를 그리드 셀 + 얇은
 * 구분선으로(카드 X) 보여준다. 셀 탭 → 선택 강조(민트). "가나 퀴즈" 버튼으로 로컬 4지선다.
 *
 * ⚠️ 서버 퀴즈는 word/kanji만 지원 → 가나는 프론트 로컬(data/kana.ts) + KanaQuiz.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Tts from 'react-native-tts';

import { AppHeader, AppText, Button, SectionHeader } from '../../components';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  DAKUTEN_ROWS,
  GOJUON_ROWS,
  YOUON_ROWS,
  glyph,
  type KanaCell,
  type KanaScript,
} from '../../data/kana';
import KanaQuiz from './KanaQuiz';

/** 가나표 한 칸 — 글자 + 로마자. 탭하면 선택 강조. */
function Cell({
  cell,
  script,
  selected,
  onSelect,
}: {
  cell: KanaCell;
  script: KanaScript;
  selected: boolean;
  onSelect: (romaji: string) => void;
}) {
  const c = useThemeColors();
  if (!cell) {
    return <View className="flex-1" style={{ margin: hairline }} />;
  }
  return (
    <Pressable
      onPress={() => {
        onSelect(cell.romaji);
        Tts.stop();
        Tts.speak(glyph(cell, script));
      }}
      className="flex-1 items-center justify-center active:opacity-70"
      style={{
        margin: hairline,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: selected ? c['brand-subtle'] : c['bg-primary'],
        borderWidth: 1,
        borderColor: selected ? c.brand : c['border-tertiary'],
      }}>
      <AppText variant="title" style={{ color: selected ? c.brand : c['text-primary'] }}>
        {glyph(cell, script)}
      </AppText>
      <AppText variant="micro" className="text-text-tertiary" style={{ marginTop: 2 }}>
        {cell.romaji}
      </AppText>
    </Pressable>
  );
}

function Grid({
  title,
  rows,
  script,
  selected,
  onSelect,
}: {
  title: string;
  rows: KanaCell[][];
  script: KanaScript;
  selected: string | null;
  onSelect: (romaji: string) => void;
}) {
  return (
    <View className="gap-sm">
      <SectionHeader title={title} />
      <View>
        {rows.map((row, ri) => (
          <View key={ri} className="flex-row">
            {row.map((cell, ci) => (
              <Cell
                key={ci}
                cell={cell}
                script={script}
                selected={!!cell && cell.romaji === selected}
                onSelect={onSelect}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function KanaScreen(): React.JSX.Element {
  useEffect(() => {
    Tts.setDefaultLanguage('ja-JP');
  }, []);

  const [script, setScript] = useState<KanaScript>('hira');
  const [selected, setSelected] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const TABS: { key: KanaScript; label: string }[] = [
    { key: 'hira', label: '히라가나' },
    { key: 'kata', label: '가타카나' },
  ];

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="히라가나 / 가타카나" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2xl px-xl py-xl">
        {/* 스크립트 토글 */}
        <View className="flex-row" style={{ gap: 8 }}>
          {TABS.map(({ key, label }) => {
            const active = key === script;
            return (
              <Pressable
                key={key}
                onPress={() => setScript(key)}
                className={`flex-1 items-center rounded-full py-md active:opacity-80 ${
                  active ? 'bg-brand' : 'bg-bg-tertiary'
                }`}>
                <AppText variant="label" className={active ? 'text-on-brand' : 'text-text-secondary'}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* 가나 퀴즈 시작 */}
        <Button title="가나 퀴즈 시작" leftIcon="pencil" onPress={() => setQuizOpen(true)} />

        {/* 가나표 */}
        <Grid title="기본 (청음)" rows={GOJUON_ROWS} script={script} selected={selected} onSelect={setSelected} />
        <Grid title="탁음 · 반탁음" rows={DAKUTEN_ROWS} script={script} selected={selected} onSelect={setSelected} />
        <Grid title="요음" rows={YOUON_ROWS} script={script} selected={selected} onSelect={setSelected} />
      </ScrollView>

      <KanaQuiz visible={quizOpen} script={script} onClose={() => setQuizOpen(false)} />
    </View>
  );
}
