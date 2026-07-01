import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { gray, mint, red, radius as r, scrim } from '../theme/tokens';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string | React.ReactNode;
  cancelText?: string;
  confirmText: string;
  onCancel?: () => void;
  onConfirm: () => void;
  danger?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  danger = false,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  const handleBackdrop = onCancel ?? onConfirm;

  // 닫기 애니메이션
  function animateOut() {
    backdropOpacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(600, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }

  // 열기 애니메이션
  function animateIn() {
    translateY.value = 600;
    backdropOpacity.value = 0;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    });
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      animateOut();
    }
  }, [visible]);

  // mount된 직후 열기 애니메이션 실행
  useEffect(() => {
    if (mounted && visible) {
      animateIn();
    }
  }, [mounted]);

  // 뒤로가기 버튼 처리
  useEffect(() => {
    if (!mounted) { return; }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackdrop();
      return true;
    });
    return () => sub.remove();
  }, [mounted, handleBackdrop]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) { return null; }

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* 스크림 */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
      </Animated.View>

      {/* 시트 */}
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24) },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />

          <AppText variant="title" style={{ color: gray[900], marginBottom: 10 }}>
            {title}
          </AppText>

          {typeof message === 'string' ? (
            <AppText variant="body" style={{ color: gray[600], lineHeight: 22, marginBottom: 20 }}>
              {message}
            </AppText>
          ) : (
            <View style={{ marginBottom: 20 }}>{message}</View>
          )}

          <View style={styles.divider} />

          <View style={styles.btnRow}>
            {cancelText && onCancel && (
              <Pressable onPress={onCancel} style={[styles.btn, styles.btnCancel]}>
                <AppText variant="subheading" style={{ color: gray[600] }}>
                  {cancelText}
                </AppText>
              </Pressable>
            )}
            <Pressable
              onPress={onConfirm}
              style={[
                styles.btn,
                { flex: cancelText ? 2 : 1 },
                { backgroundColor: danger ? red[500] : mint[500] },
              ]}
            >
              <AppText variant="subheading" style={{ color: gray[0] }}>
                {confirmText}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: gray[0],
    borderTopLeftRadius: r.xl,
    borderTopRightRadius: r.xl,
    paddingTop: 12,
    paddingHorizontal: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: gray[200],
    alignSelf: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: gray[100],
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: gray[100],
  },
});
