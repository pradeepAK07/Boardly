import { createContext, useContext } from 'react';
import type { BoardTheme, ThemePalette } from './themes';

export type ThemeContextValue = {
  theme: BoardTheme;
  palette: ThemePalette;
  setTheme: (theme: BoardTheme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return value;
}
