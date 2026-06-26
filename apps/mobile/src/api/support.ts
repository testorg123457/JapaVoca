/**
 * 문의하기 API.
 *
 * 백엔드 계약(apps/server support/views.py):
 *   POST /api/support/inquiries/        → { id, content, created_at, answer, answered_at, is_answer_read }
 *   GET /api/support/inquiries/         → Inquiry[]
 *   GET /api/support/inquiries/unread-count/  → { count }
 *   PATCH /api/support/inquiries/mark-all-read/  → 204 No Content
 */
import apiClient from './client';

export type Inquiry = {
  id: number;
  content: string;
  created_at: string;
  answer: string | null;
  answered_at: string | null;
  is_answer_read: boolean;
};

export async function postInquiry(content: string): Promise<Inquiry> {
  return (await apiClient.post<Inquiry>('/api/support/inquiries/', { content })).data;
}

export async function getInquiries(): Promise<Inquiry[]> {
  return (await apiClient.get<Inquiry[]>('/api/support/inquiries/')).data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return (await apiClient.get<{ count: number }>('/api/support/inquiries/unread-count/')).data;
}

export async function markAllRead(): Promise<void> {
  await apiClient.patch('/api/support/inquiries/mark-all-read/');
}

export async function deleteInquiry(id: number): Promise<void> {
  await apiClient.delete(`/api/support/inquiries/${id}/`);
}
