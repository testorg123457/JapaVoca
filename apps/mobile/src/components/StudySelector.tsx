/**
 * 학습 트랙 선택 — 에디토리얼 톤(각진 마감, 잉크 위계). 온보딩/Settings 공유.
 * controlled: value/onChange. 상단 종류 탭 + 급수 세로 리스트(설명+난이도 막대).
 * 가나 탭 선택 시 JLPT 리스트 대신 히라가나/가타카나 토글 표시.
 * 단일 트랙 — 다른 걸 고르면 이전 선택 해제.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import AppText from './AppText';
import Icon from './Icon';
import { useThemeColors } from '../theme/ThemeProvider';
import {
  LEVELS,
  TABS,
  type JlptLevel,
  type StudyMode,
  type StudySelection,
} from '../screens/onboarding/studyContent';

export interface StudySelectorProps {
  value: StudySelection;
  onChange: (s: StudySelection) => void;
}

export function StudySelector({ value, onChange }: StudySelectorProps): React.JSX.Element {
  const c = useThemeColors();
  const [tab, setTab] = useState<StudyMode>(value.mode ?? 'kanji');

  function pickLevel(level: JlptLevel) {
    onChange({ mode: tab, level, hiragana: false, katakana: false });
  }

  function toggleScript(key: 'hiragana' | 'katakana') {
    const next = { ...value, mode: 'kana' as const, level: null };
    next[key] = !value[key];
    onChange(next);
  }

  return (
    <View>
      {/* 종류 탭 */}
      <View className="flex-row border-b border-border-tertiary" style={{ gap: 18 }}>
        {TABS.map((t) => {
          const active = tab === t.mode;
          return (
            <Pressable
              key={t.mode}
              onPress={() => setTab(t.mode)}
              style={{ paddingBottom: 11 }}
              className="active:opacity-60">
              <AppText
                variant="subheading"
                className={active ? 'text-text-primary' : 'text-text-tertiary'}
                style={{ fontWeight: active ? '800' : '600' }}>
                {t.label}
              </AppText>
              {active ? (
                <View
                  style={{
                    height: 2.5,
                    backgroundColor: c['text-primary'],
                    marginTop: 9,
                    borderRadius: 2,
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'kana' ? (
        /* 가나 탭: 히라가나 / 가타카나 토글 */
        <View className="mt-md">
          {(
            [
              { key: 'hiragana', label: '히라가나', sub: 'あいうえお…' },
              { key: 'katakana', label: '가타카나', sub: 'アイウエオ…' },
            ] as { key: 'hiragana' | 'katakana'; label: string; sub: string }[]
          ).map((item, i) => {
            const on = value.mode === 'kana' && value[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleScript(item.key)}
                className={`flex-row items-center active:opacity-70 ${
                  i === 0 ? '' : 'border-t border-border-tertiary'
                }`}
                style={{ paddingVertical: 15, gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" className="text-text-primary">
                    {item.label}
                  </AppText>
                  <AppText variant="micro" className="text-text-tertiary" style={{ marginTop: 2 }}>
                    {item.sub}
                  </AppText>
                </View>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: on ? c['text-primary'] : 'transparent',
                    borderWidth: on ? 0 : 1.6,
                    borderColor: c['border-secondary'],
                  }}>
                  {on ? <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        /* 한자·단어 탭: JLPT 급수 리스트 */
        <View className="mt-md">
          {LEVELS.map((lv, i) => {
            const selected = value.mode === tab && value.level === lv.code;
            return (
              <Pressable
                key={lv.code}
                onPress={() => pickLevel(lv.code)}
                className={`flex-row items-center active:opacity-70 ${
                  i === 0 ? '' : 'border-t border-border-tertiary'
                }`}
                style={{ paddingVertical: 15, gap: 14 }}>
                <AppText
                  variant="subheading"
                  className={selected ? 'text-text-primary' : 'text-text-secondary'}
                  style={{ width: 34, fontWeight: '800' }}>
                  {lv.code}
                </AppText>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" className="text-text-primary">
                    {lv.name}
                  </AppText>
                </View>
                {/* 난이도 막대 5단계 */}
                <View
                  className="flex-row items-end"
                  style={{ gap: 3, height: 16, marginRight: 12 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <View
                      key={n}
                      style={{
                        width: 4,
                        height: 4 + n * 2.4,
                        borderRadius: 1,
                        backgroundColor:
                          n <= lv.difficulty ? c['text-secondary'] : c['border-secondary'],
                      }}
                    />
                  ))}
                </View>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: selected ? c['text-primary'] : 'transparent',
                    borderWidth: selected ? 0 : 1.6,
                    borderColor: c['border-secondary'],
                  }}>
                  {selected ? (
                    <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          <View className="flex-row justify-between mt-xs" style={{ paddingHorizontal: 2 }}>
            <AppText variant="micro" className="text-text-tertiary">
              쉬움
            </AppText>
            <AppText variant="micro" className="text-text-tertiary">
              어려움
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

export default StudySelector;
