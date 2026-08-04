/**
 * 화면에서 쓰는 데이터 훅 모음 — React Query 기반.
 *
 * 백엔드 실제 응답(apps/server rewards/accounts 코드 직접 확인 기준)에 맞춘
 * 타입을 그대로 노출한다. 캐시 잔액/일일현황은 모두 서버가 단일 진실원.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import apiClient from './client';
import { getDeviceId } from '../lib/deviceId';
import { isLoggedIn } from '../store/auth';
import { deleteInquiry, getInquiries, getUnreadCount, markAllRead, postInquiry, type Inquiry } from './support';

export type { Inquiry };

export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type MeResponse = {
  id: number;
  provider: 'guest' | 'google' | 'kakao';
  google_uid: string | null;
  email: string | null;
  nickname: string;
  is_guest: boolean;
  selected_jlpt_level: string | null;
  jlpt_level_word: string | null;
  jlpt_level_kanji: string | null;
  study_mode: 'kanji' | 'kanji_word' | 'kana_word' | 'kana' | null;
  study_level: string | null;
  study_kana_hiragana: boolean;
  study_kana_katakana: boolean;
  push_enabled: boolean;
  push_marketing: boolean;
  status: string;
  created_at: string;
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<MeResponse>('/api/auth/me/')).data,
    // 토큰이 없을 때 호출하면 401 → forceSignOut 루프가 생기므로 반드시 가드.
    enabled: isLoggedIn(),
  });
}

export type ProfileUpdate = {
  nickname?: string;
  selected_jlpt_level?: string | null;
  jlpt_level_word?: string | null;
  jlpt_level_kanji?: string | null;
  study_mode?: 'kanji' | 'kanji_word' | 'kana_word' | 'kana' | null;
  study_level?: string | null;
  study_kana_hiragana?: boolean;
  study_kana_katakana?: boolean;
  push_enabled?: boolean;
  push_marketing?: boolean;
};

/** 프로필(닉네임/학습 급수) 수정. PATCH 응답(전체 프로필)으로 me 캐시를 갱신. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProfileUpdate) =>
      (await apiClient.patch<MeResponse>('/api/auth/me/', data)).data,
    // Optimistic — 토글/설정을 누르는 즉시 반영(스위치 깜빡임 방지). 실패 시 롤백.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      const prev = queryClient.getQueryData<MeResponse>(['me']);
      if (prev) {
        queryClient.setQueryData<MeResponse>(['me'], { ...prev, ...data });
      }
      return { prev };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['me'], ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
    },
  });
}

export type WalletResponse = {
  balance: number;
  total_earned: number;
  total_used: number;
};

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await apiClient.get<WalletResponse>('/api/rewards/wallet/')).data,
  });
}

export type LedgerDirection = 'earn' | 'use';
export type LedgerReason =
  | 'quiz_box'
  | 'quiz_milestone'
  | 'referral_inviter'
  | 'referral_invitee'
  | 'exchange'
  | 'exchange_refund'
  | 'admin_adjust';

export type LedgerEntry = {
  id: number;
  direction: LedgerDirection;
  amount: number;
  reason: LedgerReason;
  ref_type: string;
  ref_id: number | null;
  balance_after: number;
  created_at: string;
};

export type LedgerPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: LedgerEntry[];
};

/** 거래 내역(원장) — direction 미지정 시 전체. 페이지네이션(무한 스크롤). */
export function useLedger(direction?: LedgerDirection) {
  return useInfiniteQuery({
    queryKey: ['ledger', direction ?? 'all'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<LedgerPage>('/api/rewards/ledger/', {
        params: { page: pageParam, ...(direction ? { direction } : {}) },
      });
      return response.data;
    },
    initialPageParam: 1,
    // next URL이 있으면 다음 페이지 번호(=지금까지 받은 페이지 수 + 1).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
  });
}

export type BoxGrade = 'normal' | 'purple' | 'burgundy';
/**
 * 미개봉 상자 1개.
 * burst_count: 이 상자가 주는 보상 개수(1 또는 3). 3이어도 인벤토리·광고 횟수는
 * 1개로 센다 — 한 묶음이다. 서버가 상자 생성 시 확률로 정한다.
 */
export type BoxItem = { id: number; grade: BoxGrade; burst_count?: number };

/** 미개봉 캐시상자 인벤토리. */
export function useBoxes() {
  return useQuery({
    queryKey: ['boxes', 'unopened'],
    queryFn: async () => (await apiClient.get<BoxItem[]>('/api/rewards/boxes/')).data,
  });
}

export type DailyToday = {
  quiz_count: number;
  correct_count: number;
  boxes_earned: number;
};

export function useDailyToday() {
  return useQuery({
    queryKey: ['daily', 'today'],
    queryFn: async () => (await apiClient.get<DailyToday>('/api/rewards/daily/today/')).data,
  });
}

// ─── Support / Inquiry ────────────────────────────────────────────────────────

export function useInquiries() {
  return useQuery({
    queryKey: ['inquiries'],
    queryFn: getInquiries,
  });
}

export function usePostInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => postInquiry(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'], exact: true });
    },
  });
}

export function useDeleteInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInquiry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['inquiries', 'unread-count'] });
    },
  });
}

export function useUnreadInquiryCount() {
  return useQuery({
    queryKey: ['inquiries', 'unread-count'],
    queryFn: getUnreadCount,
  });
}

export function useMarkAllInquiriesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['inquiries', 'unread-count'] });
      const previous = queryClient.getQueryData<{ count: number }>(['inquiries', 'unread-count']);
      queryClient.setQueryData(['inquiries', 'unread-count'], { count: 0 });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['inquiries', 'unread-count'], context.previous);
      } else {
        queryClient.removeQueries({ queryKey: ['inquiries', 'unread-count'], exact: true });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['inquiries'], exact: true });
    },
  });
}

/** 현재 활성 퀴즈 세트를 폐기. 없어도 성공. */
export function useAbandonQuizSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/quiz/set/abandon/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', 'set'] });
    },
  });
}


// ── 추천인 ──────────────────────────────────────────────────────────────────────

export type ReferralStatus = {
  /** 내 추천 코드. 게스트는 null. */
  code: string | null;
  is_guest: boolean;
  invited_count: number;
  /** 다음 1명을 초대하면 받을 캐시. 0이면 더 못 받음(강조 해제 신호). */
  next_reward: number;
  /** 초대로 지금까지 실제 받은 캐시 합. */
  earned_cash: number;
  /** 보상을 받을 수 있는 총 초대 인원. */
  max_invites: number;
  /** 코드를 입력하는 쪽이 받는 캐시(평생 1회, 고정). */
  invitee_reward: number;
  /** 내가 이미 추천인을 입력했는지(평생 1회). */
  used_code: boolean;
  /** 지금 추천인 코드를 입력할 수 있는지(기한·1회·게스트 반영). 서버 판단을 그대로 쓴다. */
  can_redeem: boolean;
  /** 입력 기한(ISO). 가입 후 N일. */
  redeem_deadline: string;
};

export function useReferral() {
  return useQuery({
    queryKey: ['referral'],
    queryFn: async () =>
      (await apiClient.get<ReferralStatus>('/api/rewards/referral/')).data,
  });
}

/**
 * 추천인 코드 입력. 성공하면 양쪽에 캐시가 적립되므로 지갑·내역도 갱신한다.
 * 기기 식별자를 함께 보낸다 — 서버가 기기당 1회로 제한한다(부계정 파밍 방어).
 */
export function useRedeemReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const deviceId = await getDeviceId();
      const res = await apiClient.post<ReferralStatus>('/api/rewards/referral/', {
        code,
        device_id: deviceId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
}
