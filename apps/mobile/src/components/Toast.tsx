/**
 * Toast — 앱 공용 토스트(스낵바).
 *
 * 짧은 안내(네트워크 끊김·전송 성공/실패 등)의 단일 표준. 흐름을 막지 않는 안내는
 * 전부 여기로 모은다. 반드시 확인해야 하는 결정은 Alert/ConfirmSheet가 담당한다.
 *
 * 디자인 — **인버스 서피스 바**:
 *  · 그림자 없음. 면을 배경과 반대 밝기(라이트=잉크 / 다크=밝은 면)로 깔면 대비만으로
 *    떠 보인다. 그림자로 띄우던 흰 카드는 배경과 색이 같아 테두리+그림자를 겹쳐 써야
 *    했고 그래서 무겁고 지저분했다. 대비가 할 일을 그림자에 시키지 않는다.
 *  · 테두리도 없음. 라운드는 `radius.lg`(16).
 *  · 상태는 **좌측 점 하나**로만. 인버스 면 위에서 아웃라인 아이콘은 뭉개진다.
 *    ⚠️ 점 색은 면 밝기에 맞춰 뒤집는다 — 잉크 면 위엔 밝은 단계, 밝은 면 위엔 진한 단계.
 *  · 바는 하나다. 새 토스트가 겹쳐 뜨지 않고 **내용만 바꿔 낀다**
 *    ("연결을 다시 시도하는 중… → 연결 안 됨"이 한 자리에서 이어지도록).
 *
 * 구성:
 *  - ToastView    : 순수 표시용. RN <Modal> 위처럼 루트 토스트가 못 덮는 곳에서 직접 렌더.
 *  - ToastProvider: 앱 루트에 한 번. toastBus 리스너로 등록돼 어디서든 온 토스트를 띄운다.
 *  - useToast()   : 화면용 훅. { showToast, showNetworkError }.
 *
 * 색·라운드·간격은 토큰(theme/tokens.ts)만 사용.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, mint, primitives, radius, red, spacing } from '../theme/tokens';
import { useColorSchemeMode, useThemeColors } from '../theme/ThemeProvider';
import {
  emitNetworkError,
  emitToast,
  setToastListener,
  TOAST_DURATION_MS,
  type ToastPayload,
  type ToastVariant,
} from '../lib/toastBus';
import { AppText } from './AppText';

/**
 * 인버스 면 위에서 쓰는 색.
 *
 * 라이트 모드면 바는 잉크(어두움) → 그 위 색은 **밝은** 단계.
 * 다크 모드면 바는 밝은 면 → 그 위 색은 **진한** 단계.
 * (semantic 토큰을 그대로 쓰면 앱 배경 기준이라 인버스 면 위에서 대비가 무너진다.)
 */
function inverseColors(onInk: boolean) {
  return {
    error: onInk ? red[400] : red[500],
    info: onInk ? '#3FD487' : primitives.green[500],
    retrying: onInk ? mint[300] : mint[600],
    action: onInk ? mint[300] : mint[600],
  };
}

export interface ToastViewProps {
  message: string;
  variant?: ToastVariant;
  action?: { label: string; onPress: () => void };
  /** false로 내리면 아래로 사라지고, 끝나면 onHidden을 부른다. */
  visible?: boolean;
  onHidden?: () => void;
  style?: object;
}

/** 진행 중 표시 — 바 아래를 좌우로 훑는 2px 선. 언제 끝날지 모르니 불확정형이다. */
function SweepBar({ color }: { color: string }): React.JSX.Element {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.sweep,
          {
            backgroundColor: color,
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  // 자기 너비(40%)만큼 왼쪽 밖에서 시작해 오른쪽 밖으로 나간다.
                  outputRange: ['-100%', '350%'],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

export function ToastView({
  message,
  variant = 'info',
  action,
  visible = true,
  onHidden,
  style,
}: ToastViewProps): React.JSX.Element {
  const c = useThemeColors();
  const scheme = useColorSchemeMode();
  const anim = useRef(new Animated.Value(0)).current;
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 200 : 150,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        onHiddenRef.current?.();
      }
    });
  }, [anim, visible]);

  // 라이트 모드에선 바가 잉크(어두움)다 — text-primary가 곧 바의 면.
  const onInk = scheme === 'light';
  const tint = inverseColors(onInk);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: c['text-primary'],
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
        style,
      ]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: tint[variant] }]} />
        <AppText
          variant="label"
          numberOfLines={3}
          style={{ color: c['bg-primary'], flex: 1, fontSize: 14, lineHeight: 19 }}>
          {message}
        </AppText>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={10} style={styles.action}>
            <AppText
              variant="label"
              style={{ color: tint.action, fontFamily: fontFamily.bold, fontSize: 14 }}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {variant === 'retrying' ? <SweepBar color={tint.retrying} /> : null}
    </Animated.View>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * 앱 루트에 한 번 마운트한다. toastBus의 단일 리스너로 등록되어, 컴포넌트 밖(React
 * Query 캐시 onError, axios 재시도 등)에서 온 토스트도 화면 하단에 띄운다.
 *
 * 페이로드는 사라짐 애니메이션이 끝난 뒤에 버린다 — 바로 버리면 툭 끊긴다.
 */
export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handle = useCallback(
    (payload: ToastPayload | null) => {
      clearTimer();
      if (payload === null) {
        setVisible(false);
        return;
      }
      setToast(payload);
      setVisible(true);
      // duration이 null이면 스스로 사라지지 않는다(진행 중 상태).
      const duration = payload.duration === undefined ? TOAST_DURATION_MS : payload.duration;
      if (duration !== null) {
        timerRef.current = setTimeout(() => setVisible(false), duration);
      }
    },
    [clearTimer],
  );

  useEffect(() => {
    setToastListener(handle);
    return () => {
      setToastListener(null);
      clearTimer();
    };
  }, [handle, clearTimer]);

  return (
    <View style={styles.root}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { bottom: insets.bottom + spacing['3xl'] }]}>
          <ToastView
            message={toast.message}
            variant={toast.variant}
            action={toast.action}
            visible={visible}
            onHidden={() => setToast(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

/** 화면에서 토스트를 띄운다. Provider 없이도 안전(리스너 없으면 무시). */
export function useToast(): {
  showToast: (message: string, variant?: ToastVariant) => void;
  showNetworkError: () => void;
} {
  return { showToast: emitToast, showNetworkError: emitNetworkError };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
  },
  // 그림자·테두리 없음 — 인버스 면의 대비만으로 떠 보이게 한다.
  bar: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg - 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  action: { paddingLeft: spacing.md, paddingVertical: 2 },
  track: { height: 2, width: '100%', overflow: 'hidden', opacity: 0.9 },
  sweep: { width: '40%', height: '100%', borderRadius: 2 },
});
