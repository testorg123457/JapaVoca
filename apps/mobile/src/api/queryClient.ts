/**
 * React Query 클라이언트 — 앱 전역 단일 인스턴스.
 *
 * 네트워크 끊김(서버 무응답) 오류는 캐시 레벨 onError에서 한 번에 잡아 공용 토스트로
 * 알린다(화면마다 처리 불필요). 서버가 응답한 오류(4xx/5xx)는 여기서 토스트를 띄우지
 * 않고 각 화면이 알아서 다룬다.
 *
 * 재시도: 여기서 하지 않는다. 네트워크 끊김 재시도는 axios 레이어(api/retry.ts)로
 * 옮겼다 — React Query를 거치지 않는 직접 호출(퀴즈 세트·채점·북마크)까지 함께
 * 덮기 위해서. 여기에도 남겨두면 두 겹이 곱해져 재시도가 과해진다.
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
    queries: { retry: false },
  },
});

export default queryClient;
