/**
 * Icon — react-native-svg 기반 라인 아이콘 시스템.
 *
 * 왜 이게 중요한가: 이모지(🏠💰🎁…)를 기능 아이콘으로 쓰면 OS마다 모양/색/정렬이
 * 제각각이라 즉시 "개발자가 만든 앱"으로 읽힌다. 토스·당근·배민은 모두 일관된
 * 커스텀 아이콘셋을 쓴다. 여기서는 lucide 풍의 24그리드 라인 아이콘을 직접 그린다.
 *
 * 규칙:
 *  - 24×24 viewBox, 라인 두께 일관(기본 2), 둥근 캡/조인(배민식 둥글둥글 톤).
 *  - 색은 호출부가 토큰 색을 넘긴다(기본은 현재 텍스트색 계열). fill형 아이콘(coin/flame
 *    /sparkles)은 color를 채움으로, 나머지는 stroke로 적용.
 *  - 이모지는 "보상 연출"처럼 콘텐츠성 표현에만 남기고, 구조/내비/상태에는 이 아이콘만.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { gray } from '../theme/tokens';

export type IconName =
  | 'home'
  | 'wallet'
  | 'settings'
  | 'flame'
  | 'gift'
  | 'check'
  | 'check-circle'
  | 'close'
  | 'chevron-right'
  | 'chevron-down'
  | 'coin'
  | 'book'
  | 'pencil'
  | 'sparkles'
  | 'user'
  | 'document'
  | 'shield'
  | 'logout'
  | 'arrow-up-right'
  | 'arrow-down-left'
  | 'google';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** stroke형 아이콘의 선 두께(기본 2). fill형엔 무시. */
  strokeWidth?: number;
}

/** stroke형: fill 없음 + 둥근 캡/조인. */
const STROKE = (color: string, strokeWidth: number) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function Icon({ name, size = 24, color = gray[900], strokeWidth = 2 }: IconProps) {
  const s = STROKE(color, strokeWidth);
  const fill = { fill: color };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {(() => {
        switch (name) {
          case 'home':
            return (
              <>
                <Path d="M4 11.4 L12 4.5 L20 11.4" {...s} />
                <Path d="M6 10.3 V19 a1 1 0 0 0 1 1 H17 a1 1 0 0 0 1-1 V10.3" {...s} />
                <Path d="M10 20 V14.5 a1 1 0 0 1 1-1 H13 a1 1 0 0 1 1 1 V20" {...s} />
              </>
            );
          case 'wallet':
            return (
              <>
                <Rect x="3" y="6" width="18" height="13" rx="3.5" {...s} />
                <Path d="M3 9.5 H21" {...s} />
                <Circle cx="16.5" cy="14" r="1.4" {...fill} />
              </>
            );
          case 'settings': // 슬라이더형 — 기어보다 단순하고 또렷. 선 위에 단색 노브.
            return (
              <>
                <Path d="M4 7 H20 M4 12 H20 M4 17 H20" {...s} />
                <Circle cx="9" cy="7" r="2.6" {...fill} />
                <Circle cx="15" cy="12" r="2.6" {...fill} />
                <Circle cx="8" cy="17" r="2.6" {...fill} />
              </>
            );
          case 'flame': // 연속 출석(스트릭) — 채움형
            return (
              <Path
                d="M12.5 3 c.3 2.2 2 3.3 3.2 4.9 1.2 1.5 1.8 3.2 1.8 5.1 a5.5 5.5 0 0 1-11 0 c0-1.6 .6-3 1.6-4 .2 1.3 1 2 1.9 2 1.2 0 1.7-1 1.4-2.4 -.4-1.9 0-4 -.4-5.6z"
                {...fill}
              />
            );
          case 'gift':
            return (
              <>
                <Rect x="3.5" y="8.5" width="17" height="3.8" rx="1" {...s} />
                <Path d="M12 8.5 V20.5" {...s} />
                <Path d="M18.5 12.3 V19 a1.5 1.5 0 0 1-1.5 1.5 H7 a1.5 1.5 0 0 1-1.5-1.5 V12.3" {...s} />
                <Path d="M12 8.5 S10.5 3.5 8 3.5 a2.3 2.3 0 0 0 0 5z" {...s} />
                <Path d="M12 8.5 S13.5 3.5 16 3.5 a2.3 2.3 0 0 1 0 5z" {...s} />
              </>
            );
          case 'check':
            return <Path d="M5 12.5 L10 17.5 L19 7" {...s} />;
          case 'check-circle':
            return (
              <>
                <Circle cx="12" cy="12" r="9" {...s} />
                <Path d="M8 12.2 L11 15.2 L16 8.8" {...s} />
              </>
            );
          case 'close':
            return <Path d="M6 6 L18 18 M18 6 L6 18" {...s} />;
          case 'chevron-right':
            return <Path d="M9 5.5 L15.5 12 L9 18.5" {...s} />;
          case 'chevron-down':
            return <Path d="M5.5 9 L12 15.5 L18.5 9" {...s} />;
          case 'coin': // 캐시 — 채움형 동전 + 안쪽 C
            return (
              <>
                <Circle cx="12" cy="12" r="9" {...fill} />
                <Path
                  d="M14.5 9.3 a4 4 0 1 0 0 5.4"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
              </>
            );
          case 'book': // 단어 — 펼친 책
            return (
              <>
                <Path d="M12 6.5 C10 5 7.5 4.5 4.5 4.5 V17 c3 0 5.5 .5 7.5 2 2-1.5 4.5-2 7.5-2 V4.5 c-3 0-5.5 .5-7.5 2z" {...s} />
                <Path d="M12 6.5 V19" {...s} />
              </>
            );
          case 'pencil': // 한자 — 쓰기(펜)
            return (
              <>
                <Path d="M4 20 H8 L18.5 9.5 a2 2 0 0 0-3-3 L5 17 V20z" {...s} />
                <Path d="M14.5 7.5 L16.5 9.5" {...s} />
                <Path d="M4 20 H10" {...s} />
              </>
            );
          case 'sparkles': // 보상/강조 — 4각 반짝임(채움)
            return (
              <>
                <Path d="M12 3 L13.7 9 19 10.7 13.7 12.4 12 18 10.3 12.4 5 10.7 10.3 9z" {...fill} />
                <Path d="M18.5 4 L19.3 6.4 21.7 7.2 19.3 8 18.5 10.4 17.7 8 15.3 7.2 17.7 6.4z" {...fill} />
              </>
            );
          case 'user':
            return (
              <>
                <Circle cx="12" cy="8" r="4" {...s} />
                <Path d="M4.5 20 c0-4 3.5-6.2 7.5-6.2 s7.5 2.2 7.5 6.2" {...s} />
              </>
            );
          case 'document':
            return (
              <>
                <Path d="M6 3 H13.5 L18 7.5 V20 a1 1 0 0 1-1 1 H7 a1 1 0 0 1-1-1 V4 a1 1 0 0 1 1-1z" {...s} />
                <Path d="M13.5 3 V7.5 H18" {...s} />
                <Path d="M9 13 H15 M9 16.5 H13" {...s} />
              </>
            );
          case 'shield':
            return (
              <>
                <Path d="M12 3 L19 5.5 V11 c0 4.5-3 7.6-7 9 -4-1.4-7-4.5-7-9 V5.5z" {...s} />
                <Path d="M9 11.5 L11.2 13.7 15 9.8" {...s} />
              </>
            );
          case 'logout':
            return (
              <>
                <Path d="M14 5 H6 a1 1 0 0 0-1 1 V18 a1 1 0 0 0 1 1 H14" {...s} />
                <Path d="M17 8 L21 12 L17 16" {...s} />
                <Path d="M21 12 H10" {...s} />
              </>
            );
          case 'arrow-up-right':
            return (
              <>
                <Circle cx="12" cy="12" r="9" {...s} />
                <Path d="M9.5 14.5 L14.5 9.5 M10.5 9.5 H14.5 V13.5" {...s} />
              </>
            );
          case 'arrow-down-left':
            return (
              <>
                <Circle cx="12" cy="12" r="9" {...s} />
                <Path d="M14.5 9.5 L9.5 14.5 M13.5 14.5 H9.5 V10.5" {...s} />
              </>
            );
          case 'google': // 멀티컬러 G (브랜드 가이드 색)
            return (
              <>
                <Path d="M21.6 12.2 c0-.7-.1-1.4-.2-2H12 v3.8 h5.4 a4.6 4.6 0 0 1-2 3 v2.5 h3.2 c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
                <Path d="M12 22 c2.7 0 5-0.9 6.6-2.4 l-3.2-2.5 c-.9.6-2 1-3.4 1 a5.9 5.9 0 0 1-5.5-4.1 H3.2 v2.6 A10 10 0 0 0 12 22z" fill="#34A853" />
                <Path d="M6.5 14 a5.9 5.9 0 0 1 0-3.8 V7.6 H3.2 a10 10 0 0 0 0 9z" fill="#FBBC05" />
                <Path d="M12 6.1 c1.5 0 2.8.5 3.9 1.5 l2.9-2.9 A10 10 0 0 0 3.2 7.6 l3.3 2.6 A5.9 5.9 0 0 1 12 6.1z" fill="#EA4335" />
              </>
            );
          default:
            return null;
        }
      })()}
    </Svg>
  );
}

export default Icon;
