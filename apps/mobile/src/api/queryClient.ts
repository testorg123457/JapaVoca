/**
 * React Query 클라이언트 — 앱 전역 단일 인스턴스.
 *
 * 네트워크 끊김(서버 무응답) 오류는 캐시 레벨 onError에서 한 번에 잡아 공용 토스트로
 * 알린다(화면마다 처리 불필요). 서버가 응답한 오류(4xx/5xx)는 여기서 토스트를 띄우지
 * 않고 각 화면이 알아서 다룬다.
 *
 * 재시도: 네트워크 오류만 최대 2회 재시도(일시적 끊김 자동 복구). 그 외 오류는
 * 재시도하지 않는다(4xx/5xx를 반복 호출하지 않도록).
 * (⚠️ refetchOnReconnect는 NetInfo 연동이 있어야 동작하므로 지금은 켜지 않는다.)
 */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { emitNetworkError } from '../lib/toastBus';
import { isNetworkError } from './errors';

function notifyIfNetworkError(error: unknown): void {
  if (isNetworkError(error)) emitNetworkError();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyIfNetworkError }),
  mutationCache: new MutationCache({ onError: notifyIfNetworkError }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => isNetworkError(error) && failureCount < 2,
    },
  },
});

export default queryClient;
