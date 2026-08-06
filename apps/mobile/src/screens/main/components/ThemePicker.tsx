/**
 * ThemePicker — 화면 테마 선택(시스템 / 라이트 / 다크).
 *
 * ⚠️ 세그먼트 컨트롤([시스템|라이트|다크])을 버렸다. 테마는 **결과가 눈에 보이는 설정**인데
 *    글자 세 개만 늘어놓으면 고르기 전까지 뭐가 바뀌는지 알 수 없다. 게다가 세그먼트는
 *    "탭 전환"의 언어라, 설정 화면에서 쓰면 화면이 바뀌는 것처럼 읽힌다.
 *
 * 대신 **작은 화면 미리보기 카드 3장**을 놓는다. 각 카드가 그 테마의 실제 배경·면·글자
 * 색으로 그려져서, 고르기 전에 결과가 보인다. '시스템'은 라이트·다크를 대각으로 반씩
 * 그려 "기기를 따라간다"를 그림 하나로 말한다.
 *
 * 색은 토큰의 semantic 세트에서 직접 가져온다(하드코딩 금지) — 테마 값이 바뀌면
 * 미리보기도 자동으로 따라온다.
 */
import React from 'react';
import { View } from 'react-native';

import { AppText, Icon, PressableScale } from '../../../components';
import { radius, semantic } from '../../../theme/tokens';
import { useThemeColors, useThemeMode } from '../../../theme/ThemeProvider';
import type { ThemeMode } from '../../../store/theme';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
];

/** 미리보기 한 장에 그릴 색 — 실제 semantic 토큰에서 가져온다. */
function paletteOf(scheme: 'light' | 'dark') {
  const s = semantic[scheme];
  return { bg: s['bg-secondary'], surface: s['bg-primary'], line: s['border-secondary'], ink: s['text-primary'] };
}

/** 화면 축소 모형 — 배경 위에 카드 한 장과 글줄 두 개. 앱의 실제 구조를 닮게. */
function Preview({ scheme, half }: { scheme: 'light' | 'dark'; half?: boolean }) {
  const p = paletteOf(scheme);
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: half ? '50%' : 0,
        right: 0,
        backgroundColor: p.bg,
        paddingHorizontal: 9,
        paddingTop: 12,
      }}>
      <View
        style={{
          height: 26,
          borderRadius: 6,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.line,
          padding: 5,
          gap: 4,
          // '시스템'의 오른쪽 절반은 카드가 잘려 보여야 자연스럽다.
          width: half ? 60 : undefined,
        }}>
        <View style={{ height: 4, width: '70%', borderRadius: 2, backgroundColor: p.ink, opacity: 0.85 }} />
        <View style={{ height: 4, width: '45%', borderRadius: 2, backgroundColor: p.ink, opacity: 0.35 }} />
      </View>
    </View>
  );
}

export function ThemePicker(): React.JSX.Element {
  const c = useThemeColors();
  const { mode, setMode } = useThemeMode();

  return (
    <View className="flex-row px-xl py-md" style={{ gap: 10 }}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <PressableScale
            key={opt.mode}
            onPress={() => setMode(opt.mode)}
            pressedScale={0.97}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, gap: 8 }}>
            {/* 미리보기 — 선택되면 브랜드 테두리로 둘러 확실히 표시한다.
                (체크 아이콘만으론 어느 카드가 켜졌는지 훑을 때 안 잡힌다) */}
            <View
              style={{
                height: 76,
                borderRadius: radius.md,
                overflow: 'hidden',
                borderWidth: active ? 2 : 1,
                borderColor: active ? c.brand : c['border-secondary'],
              }}>
              {opt.mode === 'system' ? (
                <>
                  <Preview scheme="light" />
                  <Preview scheme="dark" half />
                </>
              ) : (
                <Preview scheme={opt.mode} />
              )}
            </View>

            <View className="flex-row items-center justify-center" style={{ gap: 4 }}>
              {active ? <Icon name="check" size={14} color={c.brand} strokeWidth={3} /> : null}
              <AppText
                variant="label"
                style={{ color: active ? c.brand : c['text-secondary'] }}>
                {opt.label}
              </AppText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default ThemePicker;
