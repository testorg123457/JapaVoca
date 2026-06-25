/**
 * AppHeader — 앱 상단 버밀리온 헤더 (브랜드 민트와 의도적으로 구분되는 조합).
 *
 * 상태바 영역까지 버밀리온으로 칠하고(top safe-area inset 소유), 위 텍스트/아이콘은 흰색.
 * 화면은 SafeAreaView top edge를 쓰지 말고 이 헤더가 상단 inset을 책임진다.
 *
 * 레이아웃: [back/left] [title] ........ [right]
 *  - showBack: 좌측 뒤로가기(arrow-left) → navigation.goBack()
 *  - left: showBack 대신 둘 좌측 커스텀 노드(예: 홈의 캐시 표시)
 *  - title: 좌측 정렬 타이틀(흰색)
 *  - right: 우측 액션 노드(예: 설정 버튼)
 */
import React from 'react';
import { Pressable, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon from './Icon';

export interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function AppHeader({ title, showBack, onBack, left, right }: AppHeaderProps): React.JSX.Element {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: c.header }}>
      <StatusBar barStyle="light-content" backgroundColor={c.header} />
      <View className="h-14 flex-row items-center justify-between px-xl">
        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
          {showBack ? (
            <Pressable
              onPress={onBack ?? (() => navigation.goBack())}
              hitSlop={10}
              className="active:opacity-60"
              style={{ marginLeft: -4 }}>
              <Icon name="arrow-left" size={24} color={c['on-header']} strokeWidth={2.2} />
            </Pressable>
          ) : (
            left
          )}
          {title ? (
            <AppText variant="title" style={{ color: c['on-header'] }}>
              {title}
            </AppText>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

export default AppHeader;
