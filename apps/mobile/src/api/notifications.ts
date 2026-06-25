/**
 * 알림 API 훅 — 인앱 알림 목록/미읽음수/읽음 + 푸시 토큰 등록.
 *
 * 백엔드 /api/notifications/ (apps/server notifications). 캐시(자산)와 무관한 부가 도메인.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import apiClient from './client';

export type NotificationType =
  | 'attendance'
  | 'streak'
  | 'box'
  | 'exchange'
  | 'quiz_reminder'
  | 'system';

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export type NotificationPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
};

/** 알림 목록(무한 스크롤). */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async ({ pageParam }) =>
      (
        await apiClient.get<NotificationPage>('/api/notifications/', {
          params: { page: pageParam },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
  });
}

/** 미읽음 수(헤더 배지). 가벼우니 30초마다 갱신. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () =>
      (await apiClient.get<{ count: number }>('/api/notifications/unread-count/')).data.count,
    refetchInterval: 30000,
  });
}

/** 단건 읽음. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post(`/api/notifications/${id}/read/`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** 전체 읽음. */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post('/api/notifications/read-all/')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** FCM 토큰 등록/해제. 실제 토큰 획득은 클라 FCM SDK 선결조건 충족 후. */
export async function registerPushToken(token: string, platform: 'android' | 'ios' = 'android') {
  await apiClient.post('/api/notifications/push-token/', { token, platform });
}

export async function unregisterPushToken(token: string) {
  await apiClient.delete('/api/notifications/push-token/', { data: { token } });
}
