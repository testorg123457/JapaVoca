/**
 * ListSection — ListRow 묶음. (알라미식 풀폭 면 + 그룹 간 큰 여백)
 *
 * 기본(풀폭): 그룹을 둥근 카드로 가두지 않고, 흰 면(bg-primary) 한 장에 상·하 헤어라인만
 * 둘러 풀-블리드처럼 보이게 한다. 그룹 사이는 카드 박스가 아니라 큰 여백으로 구분한다.
 * 설정처럼 텍스트 위주의 긴 리스트 화면용.
 *
 * inset: 홈 시트처럼 "면 위에 얹힌" 문맥에서는 풀폭 대신 좌우 여백 + 둥근 모서리 그룹으로.
 * (카드 남용 금지 원칙의 예외가 아니라, 시트 위 진입 그룹 하나를 하나의 덩어리로 묶는 용도.)
 *
 * 좌우 패딩(px-xl)은 ListRow가 가지므로 부모 ScrollView는 가로 패딩을 주지 않는다.
 */
import React from 'react';
import { View } from 'react-native';

import { hairline } from '../theme/tokens';
import AppText from './AppText';

export interface ListSectionProps {
  /** 그룹 라벨(예: "학습 설정"). */
  title?: string;
  /** true면 풀폭 대신 좌우 여백 + 둥근 그룹(홈 시트용). */
  inset?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ListSection({ title, inset = false, className = '', children }: ListSectionProps): React.JSX.Element {
  return (
    <View className={className}>
      {title ? (
        <AppText variant="label" className={`mb-sm text-text-tertiary ${inset ? 'ml-4xl' : 'px-xl'}`}>
          {title}
        </AppText>
      ) : null}
      {inset ? (
        <View
          className="mx-xl overflow-hidden rounded-lg border-border-secondary bg-bg-primary"
          style={{ borderWidth: hairline }}>
          {children}
        </View>
      ) : (
        <View className="border-y border-border-tertiary bg-bg-primary">{children}</View>
      )}
    </View>
  );
}

export default ListSection;
