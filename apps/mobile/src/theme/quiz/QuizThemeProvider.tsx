/**
 * QuizThemeProvider — 선택된 퀴즈 테마를 Context로 주입.
 * 마운트 시 store에서 선택 id를 읽어 테마 객체를 고정한다(잠금화면은 진입마다 새로 마운트됨).
 */
import React, { createContext, useMemo } from 'react';
import { StatusBar } from 'react-native';

import type { QuizTheme } from './contract';
import { getTheme, DEFAULT_THEME_ID, themesById } from './themes';
import { getQuizThemeId, getQuizPhotoUri } from '../../store/quizTheme';
import { applyCustomPhoto } from './themes/custom';

export const QuizThemeContext = createContext<QuizTheme>(
  themesById[DEFAULT_THEME_ID],
);

export function QuizThemeProvider({ children }: { children: React.ReactNode }) {
  // 커스텀 테마는 저장된 사진을 주입해야 배경이 생긴다.
  const theme = useMemo(
    () => applyCustomPhoto(getTheme(getQuizThemeId()), getQuizPhotoUri()),
    [],
  );
  return (
    <QuizThemeContext.Provider value={theme}>
      <StatusBar barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </QuizThemeContext.Provider>
  );
}
