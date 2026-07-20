/**
 * Coin — 캐시(코인) 이미지. 캐시 금액 왼쪽에 놓는 아이콘.
 *
 * 기존 Icon 'coin'(C 글자가 그려진 SVG)을 대체한다 — 코인에 이미 C가 있어
 * 뒤의 "C" 단위 텍스트와 겹쳐 보이던 문제를 없애기 위해, C 없는 코인 이미지를 쓴다.
 */
import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const COIN = require('../assets/coin.png');

export interface CoinProps {
  /** 지름(px). 기본 20. */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function Coin({ size = 20, style }: CoinProps): React.JSX.Element {
  return (
    <Image
      source={COIN}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

export default Coin;
