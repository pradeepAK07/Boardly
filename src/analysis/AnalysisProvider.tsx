import { useCallback, useMemo, type ReactNode } from 'react';
import { useGameInteraction } from '@/engine/useGameInteraction';
import { parseGame, type ParseMeta } from './pgn';
import { useAnalysisSession } from './useAnalysisSession';
import { AnalysisContext, type AnalysisContextValue } from './context';
import type { LoadedGame } from './types';

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const session = useAnalysisSession();
  const { importPgn } = useGameInteraction();
  const { loadGame } = session;

  const loadText = useCallback(
    (text: string, source: LoadedGame['source'] = 'pgn', meta: ParseMeta = {}) => {
      const game = parseGame(text, source, meta);

      if (!importPgn(text)) {
        throw new Error('The game could not be loaded onto the board.');
      }

      loadGame(game);
      return game;
    },
    [importPgn, loadGame],
  );

  const value = useMemo<AnalysisContextValue>(
    () => ({ ...session, loadText }),
    [session, loadText],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}
