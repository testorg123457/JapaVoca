/**
 * LogSectionHeader — 시간순 목록(캐시 내역·알림)의 그룹 머리.
 *
 * 두 화면이 같은 리듬을 갖도록 한 곳에서 정의한다. 면 색은 행과 **같게**(bg-primary)
 * 둔다 — sticky로 붙을 때 회색 띠가 생기지 않고, 목록이 한 장의 종이로 읽힌다.
 * 구분은 색이 아니라 위쪽 여백과 작은 글자가 담당한다.
 */
import React from 'react';
import { View } from 'react-native';

import AppText from './AppText';

export interface LogSectionHeaderProps {
  title: string;
  /** 목록 맨 처음 그룹이면 위 여백을 줄인다(요약 블록 바로 아래라 이미 떠 있다). */
  first?: boolean;
}

export function LogSectionHeader({ title, first = false }: LogSectionHeaderProps): React.JSX.Element {
  return (
    <View
      className="bg-bg-primary px-xl pb-md"
      style={{ paddingTop: first ? 18 : 26 }}>
      <AppText variant="micro" className="text-text-tertiary" style={{ letterSpacing: 0.2 }}>
        {title}
      </AppText>
    </View>
  );
}

export default LogSectionHeader;
