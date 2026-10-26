import { createContext, useContext } from 'react';
import type { AnalysisSession } from './useAnalysisSession';
import type { LoadedGame } from './types';
import type { ParseMeta } from './pgn';

export type AnalysisContextValue = AnalysisSession & {
  /**
   * Parse a PGN/FEN, sync it into the playable game (so PGN export and the
   * board's base position stay coherent), and open analysis at ply 0.
   */
  loadText: (text: string, source?: LoadedGame['source'], meta?: ParseMeta) => LoadedGame;
};

export const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function useAnalysis(): AnalysisContextValue {
  const value = useContext(AnalysisContext);
  if (!value) throw new Error('useAnalysis must be used inside <AnalysisProvider>.');
  return value;
}
