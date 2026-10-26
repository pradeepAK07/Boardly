import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeContext, type ThemeContextValue } from './context';
import {
  DEFAULT_THEME,
  isBoardTheme,
  THEMES,
  type BoardTheme,
} from './themes';

const STORAGE_KEY = 'chess-playground:theme';

function readStoredTheme(): BoardTheme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isBoardTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<BoardTheme>(readStoredTheme);

  const setTheme = useCallback((next: BoardTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API should never stop the user from switching themes.
    }
  }, []);

  // Useful for debugging and future CSS hooks; the scene reads the context.
  useEffect(() => {
    document.documentElement.dataset.boardTheme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, palette: THEMES[theme], setTheme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
