/**
 * 일본어 번역 API — 이미지 OCR+번역 / 텍스트 재번역.
 *
 * 이미지는 multipart FormData(파일)로 업로드한다(base64 변환 없음).
 * JWT는 공용 apiClient가 자동 주입한다.
 */
import apiClient from './client';

export interface TranslateImageResult {
  original: string;
  korean: string;
}

export async function translateImage(fileUri: string): Promise<TranslateImageResult> {
  const form = new FormData();
  form.append('image', { uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' } as never);
  const res = await apiClient.post<TranslateImageResult>('/api/translate/image/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function translateText(text: string): Promise<{ korean: string }> {
  const res = await apiClient.post<{ korean: string }>('/api/translate/text/', { text });
  return res.data;
}
