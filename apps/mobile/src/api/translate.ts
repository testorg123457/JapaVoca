/**
 * 일본어 번역 API — 이미지 OCR+번역 / 텍스트 재번역.
 *
 * 이미지는 multipart FormData(파일)로 업로드한다(base64 변환 없음).
 * JWT는 공용 apiClient가 자동 주입한다.
 */
import apiClient from './client';

/**
 * 번역 요청 상한(ms). 공용 기본값(12초)보다 길게 준다 —
 * 이미지 업로드 + 서버의 Gemini OCR·번역 왕복이라 수십 초가 정상 범위다.
 */
const TRANSLATE_TIMEOUT_MS = 60000;

export interface TranslateImageResult {
  original: string;
  korean: string;
}

export async function translateImage(fileUri: string): Promise<TranslateImageResult> {
  const form = new FormData();
  form.append('image', { uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' } as never);
  const res = await apiClient.post<TranslateImageResult>('/api/translate/image/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: TRANSLATE_TIMEOUT_MS,
  });
  return res.data;
}

export async function translateText(text: string): Promise<{ korean: string }> {
  const res = await apiClient.post<{ korean: string }>('/api/translate/text/', { text }, {
    timeout: TRANSLATE_TIMEOUT_MS,
  });
  return res.data;
}
