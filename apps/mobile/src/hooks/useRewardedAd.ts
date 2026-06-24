/**
 * 보상형 광고 1개를 관리하는 공용 훅.
 *
 * show 후 (보상/닫힘/실패) 무엇이든 onDone 을 1회 호출해 호출부가 다음 동작을
 * 진행하게 한다(사용자 블로킹 금지). 광고는 소비되므로 닫힌 뒤 다음 회차용으로
 * 다시 load 한다. 미로드 상태면 onDone 을 즉시 호출한다.
 *
 * 상자 개봉/기프티콘 교환 등 "광고 보고 → 서버 액션" 흐름에서 공용으로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

export function useRewardedAd(unitId: string) {
  const adRef = useRef<RewardedAd | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = ad;

    const fireOnce = () => {
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.();
    };

    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setLoaded(false);
        fireOnce();
        ad.load(); // 다음 광고 미리 로드.
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        setLoaded(false);
        fireOnce();
      }),
    ];
    ad.load();

    return () => {
      onDoneRef.current = null;
      unsubs.forEach((u) => u());
    };
  }, [unitId]);

  /** 광고를 보여주고 끝나면 onDone 호출. 미로드면 즉시 onDone. */
  const showThen = useCallback(
    (onDone: () => void) => {
      const ad = adRef.current;
      if (ad && loaded) {
        onDoneRef.current = onDone;
        ad.show().catch(() => {
          onDoneRef.current = null;
          onDone();
        });
      } else {
        onDone();
      }
    },
    [loaded],
  );

  return { showThen };
}
