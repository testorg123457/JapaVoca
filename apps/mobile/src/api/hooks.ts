/**
 * 화면에서 쓰는 데이터 훅 모음 — React Query 기반.
 *
 * 백엔드 실제 응답(apps/server rewards/accounts 코드 직접 확인 기준)에 맞춘
 * 타입을 그대로 노출한다. 캐시 잔액/출석/일일현황은 모두 서버가 단일 진실원.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import apiClient from './client';

export type MeResponse = {
  id: number;
  google_uid: string;
  email: string;
  nickname: string;
  selected_jlpt_level: string | null;
  status: string;
  created_at: string;
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<MeResponse>('/api/auth/me/')).data,
  });
}

export type WalletResponse = { balance: number };

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await apiClient.get<WalletResponse>('/api/rewards/wallet/')).data,
  });
}

export type BoxGrade = 'normal' | 'rare' | 'jackpot';
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
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['daily', 'today'] });
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
