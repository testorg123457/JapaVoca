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

import { emitNetworkError, setNetworkRetryAction } from '../lib/toastBus';
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

/**
 * 네트워크 토스트의 "다시 시도" — 지금 화면이 쓰고 있는 쿼리만 다시 부른다.
 *
 * 토스트는 어떤 요청이 실패했는지 모른다. 그래서 무엇을 다시 부를지는 api 레이어가
 * 정해 여기서 한 번 등록한다. `type: 'active'`라 화면 밖 캐시까지 긁지 않는다.
 * ⚠️ 쿼리(GET)만 다시 부른다 — 실패한 mutation을 자동으로 재실행하면 캐시 적립·
 *    상자 개봉이 중복될 수 있다(CLAUDE.md 캐시 정합성).
 */
setNetworkRetryAction(() => {
  queryClient.refetchQueries({ type: 'active' });
});

export default queryClient;
