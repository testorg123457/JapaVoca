import api from './client';
import type { Reading } from './quiz';

export interface ComponentNode {
  character: string;
  meaning_ko: string;
  /** 훈독 우선, 없으면 음독. 최대 3개.
   *  ⚠️ optional — 이 필드가 생기기 전 캐시된 트리엔 없다 */
  readings?: Reading[];
  components: string[];
  is_leaf: boolean;
}

export interface ComponentTreeResponse {
  character: string;
  nodes: Record<string, ComponentNode>;
  root_components: string[];
}

export const getKanjiComponents = (character: string) =>
  api.get<ComponentTreeResponse>(
    `/api/content/kanji/${encodeURIComponent(character)}/components/`,
  );
