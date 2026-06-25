/**
 * ListSection — ListRow 묶음. (알라미식 풀폭 면 + 그룹 간 큰 여백)
 *
 * 그룹을 둥근 카드로 가두지 않고, 흰 면(bg-primary) 한 장에 상·하 헤어라인만 둘러
 * 풀-블리드처럼 보이게 한다. 그룹 사이는 카드 박스가 아니라 큰 여백으로 구분한다.
 * 선택적 그룹 라벨은 면 위에 작은 caption으로 얹는다.
 *
 * 좌우 패딩(px-xl)은 ListRow가 가지므로 면은 화면 폭을 꽉 채운다 → 부모 ScrollView는
 * 가로 패딩을 주지 않는다(라벨도 여기서 px-xl로 정렬).
 */
import React from 'react';
import { View } from 'react-native';

import AppText from './AppText';

export interface ListSectionProps {
  /** 그룹 라벨(예: "학습 설정"). */
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function ListSection({ title, className = '', children }: ListSectionProps): React.JSX.Element {
  return (
    <View className={className}>
      {title ? (
        <AppText variant="caption" className="mb-sm px-xl text-text-tertiary">
          {title}
        </AppText>
      ) : null}
      <View className="border-y border-border-tertiary bg-bg-primary">{children}</View>
    </View>
  );
}

export default ListSection;
