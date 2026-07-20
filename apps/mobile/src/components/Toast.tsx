/**
 * Toast — 앱 공용 토스트.
 *
 * 하단에서 살짝 떠오르는 둥근 토스트로, 2.5초 뒤 자동으로 사라진다(버튼 없음).
 * 네트워크 끊김 알림의 표준 UI이자, 문의 전송 등 짧은 안내에도 재사용한다.
 *
 * 구성:
 *  - ToastView    : 순수 표시용(프레젠테이셔널). 마운트 시 페이드+슬라이드로 등장.
 *                   RN <Modal> 위처럼 루트 토스트가 못 덮는 곳에서 직접 렌더해 쓴다.
 *  - ToastProvider: 앱 루트에 한 번 마운트. toastBus 리스너를 등록해 어디서든(React
 *                   Query onError 포함) 뜬 토스트를 화면 하단 오버레이로 렌더한다.
 *  - useToast()   : 화면에서 토스트를 띄우는 훅. { showToast, showNetworkError }.
 *
 * 색·라운드·그림자는 토큰(theme/tokens.ts)만 사용. 흰 면 카드 + 좌측 원형 아이콘 칩
 * (error=경고/danger, info=반짝/brand)에 그림자로 살짝 띄운 밝은 스낵바.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadowStyle, spacing } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import {
  emitNetworkError,
  emitToast,
  setToastListener,
  type ToastPayload,
  type ToastVariant,
} from '../lib/toastBus';
import { AppText } from './AppText';
import Icon from './Icon';

export interface ToastViewProps {
  message: string;
  variant?: ToastVariant;
  style?: object;
}

/**
 * 표시용 토스트 카드. 마운트되는 순간 아래에서 살짝 떠오르며 나타난다.
 * 사라짐은 부모가 언마운트로 처리(기존 배너들과 동일하게 즉시 제거).
 */
export function ToastView({ message, variant = 'info', style }: ToastViewProps): React.JSX.Element {
  const c = useThemeColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  // 흰 카드 + 좌측 원형 아이콘 칩(토스풍). error=경고(danger), info=반짝(brand).
  // 밝은 면 위에 뜨는 깨끗한 스낵바 — 그림자로 살짝 띄운다.
  const isError = variant === 'error';
  const chipBg = isError ? c['danger-subtle'] : c['brand-subtle'];
  const chipFg = isError ? c.danger : c.brand;

  return (
    <Animated.View
      style={[
        styles.card,
        shadowStyle('lg'),
        {
          backgroundColor: c['bg-primary'],
          borderColor: c['border-tertiary'],
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            },
          ],
        },
        style,
      ]}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={isError ? 'alert' : 'sparkles'} size={17} color={chipFg} strokeWidth={2.2} />
      </View>
      <AppText variant="label" style={{ color: c['text-primary'], flex: 1 }}>
        {message}
      </AppText>
    </Animated.View>
  );
}

/** 자동 사라짐 시간(ms). */
const TOAST_DURATION = 2500;

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * 앱 루트에 한 번 마운트한다. toastBus의 단일 리스너로 등록되어, 컴포넌트 밖(React
 * Query 캐시 onError 등)에서 온 토스트도 화면 하단 오버레이로 띄운다.
 */
export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((payload: ToastPayload) => {
    setToast(payload);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  useEffect(() => {
    setToastListener(show);
    return () => {
      setToastListener(null);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [show]);

  return (
    <View style={styles.root}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { bottom: insets.bottom + spacing['3xl'] }]}>
          {/* key = 메시지 → 같은 메시지 반복 시 재애니메이션 없이 타이머만 연장 */}
          <ToastView key={toast.message} message={toast.message} variant={toast.variant} />
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
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 0.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    maxWidth: 420,
  },
});
