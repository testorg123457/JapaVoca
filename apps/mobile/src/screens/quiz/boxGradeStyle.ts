/**
 * 상자 등급별 개봉 화면 연출 설정.
 *
 * BoxOpenScreen이 등급마다 if를 늘리지 않도록 한 곳에 모은 순수 매핑.
 * 색은 토큰(primitives/mint)에서만 가져오고 하드코딩하지 않는다.
 * ⚠️ 순수함수 — 테스트 있음(`__tests__/boxGradeStyle.test.ts`).
 */
import type { AnimationObject } from 'lottie-react-native';

import type { BoxGrade } from '../../api/hooks';
import { mint, primitives } from '../../theme/tokens';

/**
 * 상자 뒤 배경 연출.
 * - `glow`: 단색 원 두 겹(일반·보라). 가볍고 단순.
 * - `radial`: 방사 그라데이션 + 비네트 + 헤어라인 링(버건디). 최고 등급 전용으로,
 *   면이 아니라 "빛이 번지는 무대"처럼 보이게 해 아래 등급과 격을 벌린다.
 */
export type BoxBackdropSpec =
  | {
      kind: 'glow';
      outer: string;
      outerOpacity: number;
      inner: string;
      innerOpacity: number;
    }
  | {
      kind: 'radial';
      /** 화면 바닥 단색 */
      base: string;
      /** 중심(상자 위치)에서 바깥으로 가는 stop. offset 0~1 오름차순 */
      stops: { offset: number; color: string; opacity: number }[];
      /** 가장자리를 검게 눌러 시선을 중앙으로 모은다. 0이면 끔 */
      vignette: number;
      /** 동심 헤어라인 링(반지름 px) */
      rings: { r: number; color: string; opacity: number }[];
    };

export type BoxGradeStyle = {
  /** Lottie 소스. require는 정적이어야 하므로 여기서 미리 해석해 둔다. */
  anim: AnimationObject;
  /** 개봉 화면 전체 배경 */
  bg: string;
  /** 상자 뒤 배경 연출 */
  backdrop: BoxBackdropSpec;
  /**
   * 등급 뱃지. null이면 뱃지를 그리지 않는다(일반 상자).
   * 일반은 "그냥 상자"라 등급을 알릴 필요가 없다.
   */
  badge: { label: string; bg: string; border: string; text: string } | null;
};

const wine = primitives.burgundy;
const purple = primitives.purple[500];

/** 버건디 화면 바닥 — 다른 등급보다 더 어둡게 깔아 와인빛만 뜨게 한다. */
const WINE_BASE = '#07070A';

const STYLES: Record<BoxGrade, BoxGradeStyle> = {
  normal: {
    anim: require('../../assets/gift-box-animation.json'),
    bg: mint[900],
    backdrop: {
      kind: 'glow',
      outer: mint[700],
      outerOpacity: 0.55,
      inner: mint[500],
      innerOpacity: 0.12,
    },
    badge: null,
  },
  purple: {
    anim: require('../../assets/purple-box-animation.json'),
    // 기존 #1C0B36은 채도·농도가 너무 높아 답답했다. 보라기가 남은 차분한
    // 자주-차콜로 낮춘다(상자의 보라가 배경에 먹히지 않을 만큼만 어둡게).
    bg: '#2A2440',
    backdrop: {
      kind: 'glow',
      outer: purple,
      outerOpacity: 0.3,
      inner: purple,
      innerOpacity: 0.16,
    },
    badge: {
      label: '✦ 보라 상자',
      bg: `${purple}2E`,
      border: `${purple}88`,
      text: '#C9B4FF',
    },
  },
  burgundy: {
    anim: require('../../assets/burgundy-box-animation.json'),
    bg: WINE_BASE,
    backdrop: {
      kind: 'radial',
      base: WINE_BASE,
      // 중심의 와인빛이 넓게 번지다 바닥색으로 사라진다. 경계가 보이면 안 되므로
      // 마지막 stop은 바닥색과 같은 색을 투명도 0으로 둔다.
      stops: [
        { offset: 0, color: wine[500], opacity: 0.24 },
        { offset: 0.34, color: wine[700], opacity: 0.3 },
        { offset: 0.72, color: wine[900], opacity: 0.2 },
        { offset: 1, color: WINE_BASE, opacity: 0 },
      ],
      vignette: 0.55,
      rings: [
        { r: 144, color: wine[500], opacity: 0.34 },
        { r: 186, color: wine[500], opacity: 0.14 },
      ],
    },
    badge: {
      label: '✦ 버건디 상자',
      bg: `${wine[500]}2B`,
      border: `${wine[500]}8C`,
      text: wine[300],
    },
  },
};

/** 등급 → 연출 설정. 모르는 등급(서버가 먼저 나간 경우)은 일반으로 폴백. */
export function boxGradeStyle(grade: BoxGrade | string): BoxGradeStyle {
  return STYLES[grade as BoxGrade] ?? STYLES.normal;
}
