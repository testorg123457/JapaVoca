/**
 * 화면에서 쓰는 데이터 훅 모음 — React Query 기반.
 *
 * 백엔드 실제 응답(apps/server rewards/accounts 코드 직접 확인 기준)에 맞춘
 * 타입을 그대로 노출한다. 캐시 잔액/출석/일일현황은 모두 서버가 단일 진실원.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import apiClient from './client';
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
  push_quiz_reminder: boolean;
  push_marketing: boolean;
  status: string;
  created_at: string;
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<MeResponse>('/api/auth/me/')).data,
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
  push_quiz_reminder?: boolean;
  push_marketing?: boolean;
};

/** 프로필(닉네임/학습 급수) 수정. PATCH 응답(전체 프로필)으로 me 캐시를 갱신. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProfileUpdate) =>
      (await apiClient.patch<MeResponse>('/api/auth/me/', data)).data,
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
  | 'attendance'
  | 'streak'
  | 'ad_bonus'
  | 'exchange'
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

export type BoxGrade = 'normal' | 'rare' | 'epic' | 'legendary' | 'jackpot';
export type BoxItem = { id: number; grade: BoxGrade };

/** 미개봉 캐시상자 인벤토리. */
export function useBoxes() {
  return useQuery({
    queryKey: ['boxes', 'unopened'],
    queryFn: async () => (await apiClient.get<BoxItem[]>('/api/rewards/boxes/')).data,
  });
}

export type AttendanceStatus = {
  checked_in: boolean;
  streak_count: number;
  bonus_cash: number;
};

/** 오늘 출석 상태 조회(읽기 전용). */
export function useAttendanceStatus() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () =>
      (await apiClient.get<AttendanceStatus>('/api/rewards/attendance/today/')).data,
  });
}

/** 출석 체크 뮤테이션. 이미 체크인(409)이면 서버가 돌려준 현재 상태로 캐시만 갱신하고 조용히 무시. */
export function useAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<AttendanceStatus>('/api/rewards/attendance/today/')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] }); // today + month 달력 갱신
      queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // 출석 알림 생성됨
    },
    onError: (error: AxiosError<AttendanceStatus>) => {
      if (error.response?.status === 409 && error.response.data) {
        queryClient.setQueryData(['attendance', 'today'], error.response.data);
      }
    },
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

export type AttendanceDay = {
  date: string; // YYYY-MM-DD
  attended: boolean;
  streak_count: number;
  bonus_cash: number;
  quiz_count: number;
  correct_count: number;
};

export type AttendanceMonth = {
  year: number;
  month: number;
  streak_count: number;
  days: AttendanceDay[];
};

/** 월별 출석/학습량(달력용). Attendance+Daily 정확 데이터(추정 아님). */
export function useAttendanceMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['attendance', 'month', year, month],
    queryFn: async () =>
      (
        await apiClient.get<AttendanceMonth>('/api/rewards/attendance/month/', {
          params: { year, month },
        })
      ).data,
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
