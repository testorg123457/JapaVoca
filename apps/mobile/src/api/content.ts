import api from './client';

export interface ComponentNode {
  character: string;
  meaning_ko: string;
  on_reading: string;
  kun_reading: string;
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
