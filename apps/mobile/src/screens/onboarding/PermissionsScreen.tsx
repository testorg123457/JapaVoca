/**
 * 권한 허용 — 알림·휴대폰번호(필수)와 오버레이(권장).
 * 필수 권한이 모두 허용되면 onComplete()로 게이트를 재계산해 Main으로 넘어간다.
 * 영구 거부(blocked)면 버튼이 설정 이동으로 바뀌고, 설정에서 돌아오면(AppState active)
 * 자동 재확인한다. 오버레이는 미허용이어도 진행 가능(권장 항목).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

import { AppHeader, AppText, Button, Icon, Tag } from '../../components';
import type { IconName } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  checkNotification,
  checkPhone,
  isIgnoringBatteryOptimizations,
  openAppSettings,
  requestBatteryExemption,
  requestNotification,
  requestPhone,
} from '../../lib/permissions';
import { canDrawOverlays, requestOverlayPermission } from '../../lib/overlay';
import { useOnboardingActions } from '../../navigation/OnboardingStack';

type Row = {
  icon: IconName;
  title: string;
  desc: string;
  granted: boolean;
  required: boolean;
};

export default function PermissionsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { onComplete } = useOnboardingActions();
  const [notif, setNotif] = useState(false);
  const [phone, setPhone] = useState(false);
  const [battery, setBattery] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const completedRef = useRef(false);
  const fireComplete = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const refresh = useCallback(async () => {
    const [n, p, b, o] = await Promise.all([
      checkNotification(),
      checkPhone(),
      isIgnoringBatteryOptimizations(),
      canDrawOverlays(),
    ]);
    setNotif(n);
    setPhone(p);
    setBattery(b);
    setOverlay(o);
    if (n && p && b) {
      setBlocked(false);
    }
    return n && p && b;
  }, []);

  // 마운트 + 설정에서 복귀(AppState active) 시 재확인. 필수 충족되면 자동 진행(중복 호출/언마운트 후
  // 호출 방지: active 플래그 + completedRef).
  useEffect(() => {
    let active = true;
    const checkAndMaybeComplete = () => {
      refresh().then((ok) => {
        if (active && ok) {
          fireComplete();
        }
      });
    };
    checkAndMaybeComplete();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        checkAndMaybeComplete();
      }
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [refresh, fireComplete]);

  async function onPressAllow() {
    if (busy) {
      return;
    }
    if (blocked) {
      openAppSettings();
      return;
    }
    setBusy(true);
    try {
      let anyBlocked = false;
      if (!notif) {
        const r = await requestNotification();
        if (r === 'blocked') anyBlocked = true;
      }
      if (!phone) {
        const r = await requestPhone();
        if (r === 'blocked') anyBlocked = true;
      }
      if (!battery) {
        requestBatteryExemption();
      }
      setBlocked(anyBlocked);
      const ok = await refresh();
      if (ok) {
        fireComplete();
      }
    } finally {
      setBusy(false);
    }
  }

  const rows: Row[] = [
    {
      icon: 'bell',
      title: '알림',
      desc: '캐시 적립·출석 리마인드 알림을 받아요.',
      granted: notif,
      required: true,
    },
    {
      icon: 'shield',
      title: '전화(휴대폰 번호)',
      desc: '본인확인·중복가입 방지를 위해 필요해요.',
      granted: phone,
      required: true,
    },
    {
      icon: 'flame',
      title: '배터리 사용량 최적화 중지',
      desc: '백그라운드 알림·출석 체크가 끊기지 않게 해요.',
      granted: battery,
      required: true,
    },
    {
      icon: 'lock',
      title: '다른 앱 위에 표시',
      desc: '잠금화면 학습(준비 중)에 쓰여요. 지금 건너뛰어도 돼요.',
      granted: overlay,
      required: false,
    },
  ];

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="권한 허용" />
      <View className="flex-1 px-xl py-xl gap-2xl">
        <View className="gap-xs">
          <AppText variant="title" className="text-text-primary">
            원활한 이용을 위해 권한이 필요해요
          </AppText>
          <AppText variant="caption" className="text-text-tertiary">
            알림·전화·배터리 최적화 중지는 필수예요.
          </AppText>
        </View>

        <View className="gap-md">
          {rows.map((row) => (
            <View
              key={row.title}
              className="flex-row items-center bg-bg-primary rounded-lg px-xl py-lg border border-border-tertiary"
              style={{ gap: 14 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 44, height: 44, backgroundColor: c['bg-tertiary'] }}>
                <Icon name={row.icon} size={22} color={c['text-secondary']} />
              </View>
              <View className="flex-1 gap-xs">
                <AppText variant="subheading" className="text-text-primary">
                  {row.title}
                  {row.required ? (
                    <AppText variant="subheading" className="text-brand">
                      {' '}
                      *
                    </AppText>
                  ) : (
                    <AppText variant="caption" className="text-text-tertiary">
                      {' '}
                      (권장)
                    </AppText>
                  )}
                </AppText>
                <AppText variant="caption" className="text-text-tertiary">
                  {row.desc}
                </AppText>
              </View>
              <Tag label={row.granted ? '허용됨' : '필요'} variant={row.granted ? 'success' : 'neutral'} />
            </View>
          ))}
        </View>

        {!overlay ? (
          <Button
            title="다른 앱 위에 표시 허용(선택)"
            variant="soft"
            onPress={requestOverlayPermission}
          />
        ) : null}
      </View>

      <View className="px-xl pb-2xl pt-md gap-sm">
        {blocked ? (
          <AppText variant="caption" className="text-danger text-center">
            권한이 꺼져 있어요. 설정에서 알림·전화 권한을 켜주세요.
          </AppText>
        ) : null}
        <Button
          title={blocked ? '설정으로 이동' : '허용하고 시작'}
          onPress={onPressAllow}
          loading={busy}
        />
      </View>
    </View>
  );
}
