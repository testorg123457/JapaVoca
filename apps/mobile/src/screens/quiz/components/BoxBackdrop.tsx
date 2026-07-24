/**
 * BoxBackdrop — 상자 개봉 화면의 상자 뒤 배경.
 *
 * 등급별 spec(boxGradeStyle)을 받아 그린다.
 * - glow: 단색 원 두 겹(일반·보라) — 기존 연출 그대로.
 * - radial: 방사 그라데이션 + 비네트 + 동심 헤어라인 링(버건디).
 *
 * ⚠️ react-native-svg의 width/height="100%"는 New Architecture(Fabric)에서 첫
 *    레이아웃 측정과 어긋나 면이 부모를 못 채운다. Gradient.tsx와 같이 onLayout으로
 *    px를 측정해 숫자값을 넘긴다(측정 전엔 렌더하지 않음).
 */
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Rect, RadialGradient, Stop } from 'react-native-svg';

import type { BoxBackdropSpec } from '../boxGradeStyle';

/** 상자가 화면 세로 중 어디에 놓이는지(0~1). 빛의 중심을 상자에 맞춘다. */
const CENTER_Y = 0.46;

export function BoxBackdrop({ spec }: { spec: BoxBackdropSpec }): React.JSX.Element {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
  };

  // 단색 원 두 겹 — 일반·보라. SVG 없이 View만으로 충분하다.
  if (spec.kind === 'glow') {
    return (
      <>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: spec.outer,
            opacity: spec.outerOpacity,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 230,
            height: 230,
            borderRadius: 115,
            backgroundColor: spec.inner,
            opacity: spec.innerOpacity,
          }}
        />
      </>
    );
  }

  const cx = size ? size.w / 2 : 0;
  const cy = size ? size.h * CENTER_Y : 0;
  // 빛이 화면 밖까지 번지도록 반지름을 짧은 변이 아니라 대각선 기준으로 잡는다.
  const r = size ? Math.sqrt(size.w * size.w + size.h * size.h) * 0.6 : 0;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size && size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <RadialGradient id="wine" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
              {spec.stops.map((s) => (
                <Stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </RadialGradient>
            {/* 비네트 — 중앙은 그대로 두고 가장자리만 검게 눌러 시선을 모은다. */}
            <RadialGradient id="vig" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
              <Stop offset="0.45" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity={spec.vignette} />
            </RadialGradient>
            {/* 바닥 빛 웅덩이 — 가운데가 밝고 가장자리로 사라져 경계선이 안 보인다. */}
            {spec.floor && (
              <RadialGradient id="floor" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={spec.floor.color} stopOpacity={spec.floor.opacity} />
                <Stop offset="1" stopColor={spec.floor.color} stopOpacity="0" />
              </RadialGradient>
            )}
          </Defs>

          <Rect x="0" y="0" width={size.w} height={size.h} fill={spec.base} />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#wine)" />

          {/* 바닥 빛 웅덩이 — 상자 아래에 깔아 어두운 상자를 받친다(링보다 뒤). */}
          {spec.floor && (
            <Ellipse
              cx={cx}
              cy={cy + spec.floor.ry * 1.6}
              rx={spec.floor.rx}
              ry={spec.floor.ry}
              fill="url(#floor)"
            />
          )}

          {/* 동심 헤어라인 링 — 상자를 무대 위에 올린 것처럼 보이게 하는 절제된 장치 */}
          {spec.rings.map((ring) => (
            <Circle
              key={ring.r}
              cx={cx}
              cy={cy}
              r={ring.r}
              stroke={ring.color}
              strokeOpacity={ring.opacity}
              strokeWidth={1}
              fill="none"
            />
          ))}

          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#vig)" />
        </Svg>
      ) : null}
    </View>
  );
}
