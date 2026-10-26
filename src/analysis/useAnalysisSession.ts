import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStockfish } from './engine/useStockfish';
import { toWhiteCp, isAbortError } from './engine/uci';
import { checkSquareFromFen, moveQuality, terminalPosition, type Quality } from './classify';
import type { LoadedGame, PositionEval, PositionNode } from './types';

export const DEEP_DEPTH = 18;
export const BULK_DEPTH = 12;

/** Two positions that differ only in the move counters are the same position. */
export const cacheKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

export type AnalysisProgress = { done: number; total: number };

export function useAnalysisSession() {
  const [enabled, setEnabled] = useState(false);
  const [game, setGame] = useState<LoadedGame | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [evals, setEvals] = useState<Record<string, PositionEval>>({});
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { ready, error: engineError, live, analyze, stop } = useStockfish(enabled);

  // The cache is mirrored in a ref so the sequential bulk loop always sees the
  // evaluations written by the previous iteration.
  const evalsRef = useRef(evals);
  const batchToken = useRef(0);
  const bulkRunning = useRef(false);

  const positions = useMemo(() => game?.positions ?? [], [game]);
  const current = positions[viewIndex];

  const storeEval = useCallback((key: string, value: PositionEval) => {
    evalsRef.current = { ...evalsRef.current, [key]: value };
    setEvals(evalsRef.current);
  }, []);

  const analyzePosition = useCallback(
    async (position: PositionNode, depth = DEEP_DEPTH): Promise<PositionEval> => {
      const key = cacheKey(position.fen);
      const terminal = terminalPosition(position.fen);
      if (terminal) {
        if (!evalsRef.current[key]) storeEval(key, terminal);
        return terminal;
      }

      const cached = evalsRef.current[key];
      if (cached && cached.depth >= depth) return cached;

      const result = await analyze(position.fen, { depth });
      const value: PositionEval = {
        ...result,
        whiteCp: toWhiteCp(result.score, position.turn),
      };
      storeEval(key, value);
      return value;
    },
    [analyze, storeEval],
  );

  const goToPly = useCallback(
    (ply: number) => {
      const max = Math.max(0, positions.length - 1);
      setViewIndex(Math.max(0, Math.min(ply, max)));
    },
    [positions.length],
  );

  const next = useCallback(() => goToPly(viewIndex + 1), [goToPly, viewIndex]);
  const previous = useCallback(() => goToPly(viewIndex - 1), [goToPly, viewIndex]);

  /** Deep-analyse the viewed position, debounced so arrow-key spam is cheap. */
  useEffect(() => {
    if (!enabled || !ready || !current || progress) return;

    const cached =
      evalsRef.current[cacheKey(current.fen)] ?? terminalPosition(current.fen);
    if (cached && (cached.terminal || cached.depth >= DEEP_DEPTH)) return;

    const timer = setTimeout(() => {
      // `progress` only updates after a render; a timer armed just before
      // analyzeAll() starts must not stop the batch's first search.
      if (bulkRunning.current) return;
      analyzePosition(current, DEEP_DEPTH).catch((cause) => {
        if (!isAbortError(cause)) setError((cause as Error).message);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [enabled, ready, current, analyzePosition, progress]);

  const analyzeAll = useCallback(
    async (depth = BULK_DEPTH) => {
      if (positions.length === 0) return;

      const token = ++batchToken.current;
      bulkRunning.current = true;
      setError(null);
      setProgress({ done: 0, total: positions.length });

      try {
        for (let index = 0; index < positions.length; index++) {
          if (batchToken.current !== token) break;
          try {
            await analyzePosition(positions[index], depth);
          } catch (cause) {
            if (isAbortError(cause)) break;
            throw cause;
          }
          if (batchToken.current !== token) break;
          setProgress({ done: index + 1, total: positions.length });
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        if (batchToken.current === token) {
          bulkRunning.current = false;
          setProgress(null);
        }
      }
    },
    [positions, analyzePosition],
  );

  const cancel = useCallback(() => {
    batchToken.current += 1;
    bulkRunning.current = false;
    stop();
    setProgress(null);
  }, [stop]);

  const loadGame = useCallback((loaded: LoadedGame) => {
    batchToken.current += 1;
    bulkRunning.current = false;
    stop();
    setGame(loaded);
    setViewIndex(0);
    setProgress(null);
    setError(null);
    setEnabled(true);
  }, [stop]);

  const open = useCallback(() => {
    setError(null);
    setEnabled(true);
  }, []);

  const close = useCallback(() => {
    batchToken.current += 1;
    bulkRunning.current = false;
    stop();
    setProgress(null);
    setEnabled(false);
  }, [stop]);

  const reset = useCallback(() => {
    batchToken.current += 1;
    bulkRunning.current = false;
    stop();
    setGame(null);
    setViewIndex(0);
    setEvals({});
    evalsRef.current = {};
    setProgress(null);
    setError(null);
    setEnabled(false);
  }, [stop]);

  const currentEval = useMemo((): PositionEval | null => {
    if (!enabled || !current) return null;

    const stored = evals[cacheKey(current.fen)] ?? terminalPosition(current.fen);
    if (stored) return stored;

    if (live) {
      return {
        score: live.score,
        whiteCp: toWhiteCp(live.score, current.turn),
        bestMove: live.pv[0] ?? null,
        pv: live.pv,
        depth: live.depth,
      };
    }
    return null;
  }, [enabled, current, evals, live]);

  const qualityFor = useCallback(
    (position: PositionNode): Quality | undefined => {
      if (!game || position.ply === 0) return undefined;
      return moveQuality(
        evals[cacheKey(game.positions[position.ply - 1].fen)],
        evals[cacheKey(position.fen)],
        position.color,
        position.uci ?? '',
      );
    },
    [game, evals],
  );

  const viewCheckSquare = useMemo(
    () => (enabled && current ? checkSquareFromFen(current.fen) : null),
    [enabled, current],
  );

  return {
    enabled,
    ready,
    error: error ?? engineError,
    clearError: () => setError(null),

    game,
    positions,
    viewIndex,
    current,
    viewFen: enabled && current ? current.fen : null,
    viewLastMove: enabled && current ? current.lastMove : null,
    viewCheckSquare,

    evals,
    currentEval,
    live,
    progress,

    goToPly,
    next,
    previous,
    analyzePosition,
    analyzeAll,
    cancel,
    qualityFor,

    loadGame,
    open,
    close,
    reset,
  };
}

export type AnalysisSession = ReturnType<typeof useAnalysisSession>;
