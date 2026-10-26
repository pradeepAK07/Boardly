import { useState, useMemo, useCallback } from 'react';
import * as ChessModule from 'chess.js';

export type Move = { from: string; to: string; promotion?: string };

export type BoardMetrics = {
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  turnLabel: string;
  inCheck: boolean;
  inCheckmate: boolean;
  inStalemate: boolean;
  inDraw: boolean;
  captured: { white: string[]; black: string[] };
  history: Move[];
  /** SAN (algebraic) notation for each move in `history`, for display. */
  sanHistory: string[];
  moveCount: number;
};

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function toMove(raw: { from: string; to: string; promotion?: string }): Move {
  const move: Move = { from: raw.from, to: raw.to };
  if (raw.promotion) move.promotion = raw.promotion;
  return move;
}

export function useChessGame(initialFen: string = INITIAL_FEN) {
  const [chess] = useState(() => new ChessModule.Chess(initialFen));
  const [history, setHistory] = useState<Move[]>([]);
  // Position the move list is replayed from (differs from the initial position
  // after loading a PGN that starts from a custom FEN).
  const [baseFen, setBaseFen] = useState(initialFen);
  // Bumped after every mutation so consumers re-render even when the move list
  // would be referentially unchanged.
  const [, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const metrics = useMemo((): BoardMetrics => {
    // Derive captured pieces and SAN notation by replaying the move list from
    // the position the game started from.
    // `captured.white` = white pieces that were captured, etc.
    const captured = { white: [] as string[], black: [] as string[] };
    const sanHistory: string[] = [];
    try {
      const replay = new ChessModule.Chess(baseFen);
      for (const move of history) {
        const result = replay.move(move);
        if (!result) break;
        sanHistory.push(result.san);
        if (result.captured) {
          const capturedColor = result.color === 'w' ? 'black' : 'white';
          // Keep chess.js' piece symbol casing ('p', 'n', ...): the captured
          // panel groups by those exact keys.
          captured[capturedColor].push(result.captured);
        }
      }
    } catch {
      // Ignore replay errors (e.g. a hand-edited history) — the board FEN below
      // is still authoritative.
    }
    while (sanHistory.length < history.length) {
      const m = history[sanHistory.length];
      sanHistory.push(`${m.from}-${m.to}${m.promotion ? `=${m.promotion.toUpperCase()}` : ''}`);
    }

    return {
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn() as 'w' | 'b',
      turnLabel: chess.turn() === 'w' ? 'White' : 'Black',
      inCheck: chess.inCheck(),
      inCheckmate: chess.isCheckmate(),
      inStalemate: chess.isStalemate(),
      inDraw: chess.isDraw(),
      captured,
      history,
      sanHistory,
      moveCount: history.length,
    };
    // `history` changes on every mutation (chess.js mutates its instance in
    // place, so its identity never changes).
  }, [chess, history, baseFen]);

  const resetGame = useCallback(
    (fen: string = INITIAL_FEN) => {
      chess.reset();
      let base = INITIAL_FEN;
      if (fen !== INITIAL_FEN) {
        try {
          chess.load(fen);
          base = fen;
        } catch {
          // Not a valid FEN — stay at the initial position instead of crashing.
          chess.reset();
        }
      }
      setBaseFen(base);
      setHistory([]);
      bump();
    },
    [chess, bump],
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const move: Move = { from, to };
      if (promotion) move.promotion = promotion;

      const result = chess.move(move);
      if (!result) return false;

      setHistory((prev) => [...prev, move]);
      bump();
      return true;
    },
    [chess, bump],
  );

  const navigateTo = useCallback(
    (moveIndex: number) => {
      if (moveIndex < 0 || moveIndex > history.length) return;

      try {
        chess.load(baseFen);
      } catch {
        chess.reset();
      }
      const newHistory: Move[] = [];
      for (let i = 0; i < moveIndex; i++) {
        const result = chess.move(history[i]);
        if (!result) break;
        newHistory.push(history[i]);
      }
      setHistory(newHistory);
      bump();
    },
    [chess, history, baseFen, bump],
  );

  const undoMove = useCallback((): boolean => {
    const last = chess.undo();
    if (!last) return false;
    setHistory((prev) => prev.slice(0, -1));
    bump();
    return true;
  }, [chess, bump]);

  /**
   * Load a game from PGN text (headers optional). Also accepts a bare FEN for
   * convenience. Returns true when something was actually loaded.
   */
  const importPgn = useCallback(
    (text: string): boolean => {
      const source = text.trim();
      if (!source) return false;

      const parsed = new ChessModule.Chess();
      // PGN headers look like [Event "..."]; a FEN is a single line with
      // slash-separated ranks. Anything else is handed to the PGN parser first.
      const looksLikePgn = /\[\s*[A-Za-z]+\s+"/.test(source);
      const looksLikeFen =
        !looksLikePgn && source.includes('/') && source.split(/\s+/).length >= 4;
      let parsedOk = false;

      if (!looksLikeFen) {
        try {
          parsed.loadPgn(source);
          parsedOk = true;
        } catch {
          parsedOk = false;
        }
      }

      if (!parsedOk) {
        try {
          parsed.load(source);
          parsedOk = true;
        } catch {
          return false;
        }
      }

      const verbose = parsed.history({ verbose: true }) as Array<{
        from: string;
        to: string;
        promotion?: string;
      }>;
      const moves = verbose.map(toMove);

      // A PGN may start from a custom position via a [FEN "..."] header, and a
      // bare FEN import is itself the start position of the move list.
      const fenHeader = source.match(/\[FEN\s+"([^"]+)"\]/);
      let base = fenHeader ? fenHeader[1] : looksLikeFen ? source : INITIAL_FEN;

      try {
        chess.load(base);
      } catch {
        base = INITIAL_FEN;
        chess.reset();
      }

      const applied: Move[] = [];
      for (const move of moves) {
        if (!chess.move(move)) break;
        applied.push(move);
      }

      setBaseFen(base);
      setHistory(applied);
      bump();
      return true;
    },
    [chess, bump],
  );

  return {
    chess,
    metrics,
    resetGame,
    makeMove,
    undoMove,
    navigateTo,
    importPgn,
  };
}
