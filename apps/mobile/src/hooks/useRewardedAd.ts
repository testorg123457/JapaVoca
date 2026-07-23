/**
 * 보상형 광고 1개를 관리하는 공용 훅.
 *
 * show 후 (보상/닫힘/실패) 무엇이든 onDone 을 1회 호출해 호출부가 다음 동작을
 * 진행하게 한다(사용자 블로킹 금지). onDone(earned, nonce):
 *   - earned: EARNED_REWARD(시청 완료 보상) 수신 여부. 스킵·조기종료·미로드·표시실패는 false.
 *   - nonce: 이 광고 로드에 실린 SSV nonce — ad-status 폴링 키.
 *
 * 광고는 소비되므로 닫힌 뒤 **새 nonce 로 인스턴스를 재생성**해 다음 회차용으로
 * 로드한다(SSV 옵션은 createForAdRequest 시점에 고정되므로 load() 재사용 불가).
 *
 * ssv 옵션을 주면 serverSideVerificationOptions { userId, customData:
 * "<context>:<nonce>" } 를 실어 AdMob SSV 콜백 → 서버 AdRewardLog 와 명시 연결한다.
 *
 * 상자 개봉/기프티콘 교환 등 "광고 보고 → 서버 액션" 흐름에서 공용으로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

/** SSV 연결 옵션 — context 는 서버 AdRewardLog.RewardContext 값과 일치해야 한다. */
export type RewardedSsv = {
  userId: number;
  context: 'exchange' | 'box_open';
};

function genNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useRewardedAd(unitId: string, ssv?: RewardedSsv) {
  const adRef = useRef<RewardedAd | null>(null);
  const onDoneRef = useRef<((earned: boolean, nonce: string) => void) | null>(null);
  const earnedRef = useRef(false);
  const nonceRef = useRef('');
  const [loaded, setLoaded] = useState(false);
  // 광고 소비(CLOSED) 시 +1 → effect 재실행으로 새 nonce 인스턴스 재생성.
  const [generation, setGeneration] = useState(0);

  // 객체 identity 로 인한 불필요한 재생성 방지 — 원시값으로 분해해 deps 에 사용.
  const ssvUserId = ssv?.userId;
  const ssvContext = ssv?.context;

  // generation 은 deps 트리거 전용(값 미사용) — 광고 소비 시 새 nonce 로 재생성.
  useEffect(() => {
    const nonce = genNonce();
    nonceRef.current = nonce;
    earnedRef.current = false;

    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
      ...(ssvUserId != null && ssvContext
        ? {
            serverSideVerificationOptions: {
              userId: String(ssvUserId),
              customData: `${ssvContext}:${nonce}`,
            },
          }
        : {}),
    });
    adRef.current = ad;

    const fireOnce = () => {
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.(earnedRef.current, nonce);
    };

    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      // 시청 완료(보상 확정) — 보통 CLOSED 보다 먼저 온다.
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earnedRef.current = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setLoaded(false);
        fireOnce();
        setGeneration((g) => g + 1); // 소비됨 — 새 nonce 로 재생성·재로드.
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
  }, [unitId, ssvUserId, ssvContext, generation]);

  /** 광고를 보여주고 끝나면 onDone(earned, nonce) 호출. 미로드면 즉시 onDone(false, …). */
  const showThen = useCallback(
    (onDone: (earned: boolean, nonce: string) => void) => {
      const ad = adRef.current;
      if (ad && loaded) {
        earnedRef.current = false;
        onDoneRef.current = onDone;
        ad.show().catch(() => {
          onDoneRef.current = null;
          onDone(false, nonceRef.current);
        });
      } else {
        onDone(false, nonceRef.current);
      }
    },
    [loaded],
  );

  return { showThen };
}
