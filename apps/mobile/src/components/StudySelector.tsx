/**
 * 학습 트랙 선택 — 온보딩/Settings 공유.
 * controlled: value/onChange. 상단 종류 탭 + 급수 세로 리스트(설명+난이도 막대).
 * 가나 탭 선택 시 JLPT 리스트 대신 히라가나/가타카나 토글 표시.
 * 단일 트랙 — 다른 걸 고르면 이전 선택 해제.
 *
 * 선택 피드백(민트 = '선택됨' 신호):
 *  - 선택 행: 옅은 민트 배경 + 민트 코드/난이도막대/라디오
 *  - PressableScale로 누름 손맛, 체크는 선택 시 스프링으로 등장
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import AppText from './AppText';
import Icon from './Icon';
import { PressableScale } from './PressableScale';
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
  const [tab, setTab] = React.useState<StudyMode>(value.mode ?? 'kanji');

  // 선택 행 틴트(테마 brand에서 파생 → 라이트/다크 모두 안전)
  const tintBg = c.brand + '14'; // ~8%
  const tintBorder = c.brand + '40'; // ~25%

  function pickLevel(level: JlptLevel) {
    onChange({ mode: tab, level, hiragana: false, katakana: false });
  }

  function toggleScript(key: 'hiragana' | 'katakana') {
    const next = { ...value, mode: 'kana' as const, level: null };
    next[key] = !value[key];
    onChange(next);
  }

  /** 오른쪽 라디오(선택 시 민트 + 체크 스프링). */
  function Radio({ on }: { on: boolean }) {
    return (
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 23,
          height: 23,
          backgroundColor: on ? c.brand : 'transparent',
          borderWidth: on ? 0 : 1.8,
          borderColor: c['border-secondary'],
        }}>
        {on ? (
          <Animated.View entering={ZoomIn.springify().damping(13).stiffness(200)}>
            <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {/* 종류 탭 */}
      <View className="flex-row border-b border-border-tertiary" style={{ gap: 18 }}>
        {TABS.map((t) => {
          const active = tab === t.mode;
          return (
            <PressableScale
              key={t.mode}
              onPress={() => setTab(t.mode)}
              pressedScale={0.94}
              style={{ paddingBottom: 11 }}>
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
            </PressableScale>
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
              <PressableScale
                key={item.key}
                onPress={() => toggleScript(item.key)}
                pressedScale={0.985}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 13,
                  paddingHorizontal: 12,
                  borderRadius: 13,
                  borderWidth: 1,
                  borderColor: on ? tintBorder : 'transparent',
                  backgroundColor: on ? tintBg : 'transparent',
                  marginTop: i === 0 ? 0 : 2,
                }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" className="text-text-primary">
                    {item.label}
                  </AppText>
                  <AppText variant="micro" className="text-text-tertiary" style={{ marginTop: 2 }}>
                    {item.sub}
                  </AppText>
                </View>
                <Radio on={on} />
              </PressableScale>
            );
          })}
        </View>
      ) : (
        /* 한자·단어 탭: JLPT 급수 리스트 */
        <View className="mt-md">
          {LEVELS.map((lv, i) => {
            const selected = value.mode === tab && value.level === lv.code;
            return (
              <PressableScale
                key={lv.code}
                onPress={() => pickLevel(lv.code)}
                pressedScale={0.985}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                  paddingVertical: 13,
                  paddingHorizontal: 12,
                  borderRadius: 13,
                  borderWidth: 1,
                  borderColor: selected ? tintBorder : 'transparent',
                  backgroundColor: selected ? tintBg : 'transparent',
                  marginTop: i === 0 ? 0 : 2,
                }}>
                <AppText
                  variant="subheading"
                  style={{
                    width: 32,
                    fontWeight: '800',
                    color: selected ? c.brand : c['text-secondary'],
                  }}>
                  {lv.code}
                </AppText>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" className="text-text-primary">
                    {lv.name}
                  </AppText>
                </View>
                {/* 난이도 막대 5단계 (선택 시 민트) */}
                <View className="flex-row items-end" style={{ gap: 3, height: 16, marginRight: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <View
                      key={n}
                      style={{
                        width: 4,
                        height: 4 + n * 2.4,
                        borderRadius: 1,
                        backgroundColor:
                          n <= lv.difficulty
                            ? selected
                              ? c.brand
                              : c['text-secondary']
                            : c['border-secondary'],
                      }}
                    />
                  ))}
                </View>
                <Radio on={selected} />
              </PressableScale>
            );
          })}
          <View className="flex-row justify-between mt-xs" style={{ paddingHorizontal: 12 }}>
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
