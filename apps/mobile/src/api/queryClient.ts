/**
 * React Query 클라이언트 — 앱 전역 단일 인스턴스.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export default queryClient;
