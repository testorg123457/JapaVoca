/**
 * 상자 등급 공용 — 이름·색·보유 집계.
 *
 * 이름·색·애니메이션·연출 세기까지 **등급에 관한 건 전부 여기 한 곳**에 있다.
 * (예전엔 개봉 화면용 `boxGradeStyle.ts`가 따로 있었는데, 어두운 무대 연출을 버리면서
 *  남을 이유가 사라져 합쳤다.)
 *
 * ⚠️ 순수함수 — 테스트 있음(`__tests__/boxGrade.test.ts`).
 */
import type { AnimationObject } from 'lottie-react-native';

import type { BoxGrade, BoxItem } from '../api/hooks';
import { primitives } from '../theme/tokens';

/**
 * 희귀도 오름차순(낮은 등급이 왼쪽). 홈에서 이 순서로 보여준다.
 * 등급 사다리를 왼→오로 읽는 것과 방향이 같아, 오른쪽 끝이 곧 "제일 좋은 것"이 된다.
 */
export const GRADE_ORDER: BoxGrade[] = ['normal', 'blue', 'purple', 'burgundy'];

export const GRADE_LABEL: Record<BoxGrade, string> = {
  burgundy: '버건디',
  purple: '보라',
  blue: '파랑',
  normal: '일반',
};

/**
 * 등급 점 색. 라이트/다크 어느 배경에서도 보이는 중간 밝기(500)를 쓴다.
 * ⚠️ 일반은 캐시 옐로(#FFCE00)를 그대로 쓰면 흰 배경에서 안 보인다 → 한 단계 진한 600.
 */
export const GRADE_COLOR: Record<BoxGrade, string> = {
  burgundy: primitives.burgundy[500],
  purple: primitives.purple[500],
  blue: primitives.sapphire[500],
  normal: primitives.yellow[600],
};

/**
 * 등급별 Lottie. require는 정적이어야 해서 여기서 미리 해석해 둔다.
 * ⚠️ 넷 다 1150×1150 / 30fps / 150~251프레임으로 규격이 같다. 새 등급도 맞출 것.
 */
export const GRADE_ANIM: Record<BoxGrade, AnimationObject> = {
  normal: require('../assets/gift-box-animation.json'),
  blue: require('../assets/blue-box-animation.json'),
  purple: require('../assets/purple-box-animation.json'),
  burgundy: require('../assets/burgundy-box-animation.json'),
};

/**
 * 결과 화면에서 금액 아래 한 줄.
 *
 * ⚠️ **돈 얘기를 하지 않는다.** "약 2원이에요" 같은 환산은 캐시의 실제 가치를 들이대는
 *    셈이라 김이 샌다. 흔한 등급은 다음 행동으로, 귀한 등급은 운으로 말한다.
 */
export const GRADE_NOTE: Record<BoxGrade, string> = {
  normal: '퀴즈를 풀면 상자가 또 쌓여요',
  blue: '조금 운이 좋았어요',
  purple: '꽤 운이 좋았어요',
  burgundy: '오늘 운이 아주 좋네요',
};

/**
 * 등급 연출 — **밝은 화면용 사다리**.
 *
 * 예전엔 어두운 무대(방사 조명 + 링 + 비네트)로 등급을 벌렸는데, 화면이 밝아지면서
 * 그 장치가 통째로 못 쓰게 됐다. 대신 상자 뒤 **글로우**와 **반짝임** 두 가지로 다시 짠다.
 * 원칙은 그대로다 — 흔한 등급엔 아무것도 켜지 않는다. 그래야 위 등급이 특별해진다.
 *
 * | 등급 | 글로우 | 반짝임 |
 * |---|---|---|
 * | 일반 | ✗ | ✗ |
 * | 파랑 | 옅게 | ✗ |
 * | 보라 | 있음 | 4개 |
 * | 버건디 | 가장 진하게 | 6개 |
 */
export type GradeFlair = {
  /** 상자 뒤 소프트 글로우 세기(0~1). 0이면 안 그린다. */
  glow: number;
  /** 상자 주변 반짝임 개수. 0이면 안 그린다. */
  sparkles: number;
};

export const GRADE_FLAIR: Record<BoxGrade, GradeFlair> = {
  normal: { glow: 0, sparkles: 0 },
  blue: { glow: 0.16, sparkles: 0 },
  purple: { glow: 0.24, sparkles: 4 },
  burgundy: { glow: 0.32, sparkles: 6 },
};

export type GradeCount = { grade: BoxGrade; count: number };

/**
 * 보유 상자를 등급별로 센다. 0개인 등급은 빼고, 희귀도 높은 순으로 준다.
 *
 * ⚠️ 묶음 상자(burst_count 3)도 **1개로 센다**. 인벤토리·광고 횟수가 1개라서다
 *    (캐시만 3번 굴린다). 여기서 3으로 세면 홈 개수와 실제 개봉 횟수가 어긋난다.
 */
export function summarizeBoxes(boxes: BoxItem[] | undefined): GradeCount[] {
  if (!boxes?.length) { return []; }
  const counts = new Map<BoxGrade, number>();
  for (const box of boxes) {
    counts.set(box.grade, (counts.get(box.grade) ?? 0) + 1);
  }
  return GRADE_ORDER
    .map((grade) => ({ grade, count: counts.get(grade) ?? 0 }))
    .filter((g) => g.count > 0);
}
