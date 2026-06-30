import { useContext } from 'react';
import { QuizThemeContext } from './QuizThemeProvider';
import type { QuizTheme } from './contract';

/** 현재 퀴즈 테마. QuizThemeProvider 하위에서만 의미 있음. */
export function useQuizTheme(): QuizTheme {
  return useContext(QuizThemeContext);
}
