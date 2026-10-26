import * as ChessModule from 'chess.js';
import { MATE_CP } from './engine/uci';
import type { PositionEval } from './types';

export type Quality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const QUALITY_GLYPH: Record<Quality, string> = {
  best: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/** Centipawn loss thresholds, measured from the mover's point of view. */
const INACCURACY = 50;
const MISTAKE = 120;
const BLUNDER = 250;

export function moveQuality(
  before: PositionEval | undefined,
  after: PositionEval | undefined,
  mover: 'w' | 'b',
  playedUci: string,
): Quality | undefined {
  if (!before || !after) return undefined;

  // Convert both evaluations to the mover's point of view. A positive loss
  // means the position got worse for the player who made the move.
  const sign = mover === 'w' ? 1 : -1;
  const loss = Math.max(0, before.whiteCp * sign - after.whiteCp * sign);

  if (before.bestMove === playedUci) return 'best';
  if (loss >= BLUNDER) return 'blunder';
  if (loss >= MISTAKE) return 'mistake';
  if (loss >= INACCURACY) return 'inaccuracy';
  return 'good';
}

/**
 * Checkmate and draws do not need the engine. Keeping them local also avoids
 * `go` on a position with no legal moves.
 */
export function terminalPosition(fen: string): PositionEval | null {
  let chess: ChessModule.Chess;
  try {
    chess = new ChessModule.Chess(fen);
  } catch {
    return null;
  }

  if (chess.isCheckmate()) {
    const turn = chess.turn();
    return {
      score: { type: 'mate', value: 0 },
      whiteCp: turn === 'w' ? -MATE_CP : MATE_CP,
      bestMove: null,
      pv: [],
      depth: 0,
      terminal: 'checkmate',
    };
  }

  if (chess.isDraw() || chess.isStalemate()) {
    return {
      score: { type: 'cp', value: 0 },
      whiteCp: 0,
      bestMove: null,
      pv: [],
      depth: 0,
      terminal: 'draw',
    };
  }

  return null;
}

export function checkSquareFromFen(fen: string): string | null {
  let chess: ChessModule.Chess;
  try {
    chess = new ChessModule.Chess(fen);
  } catch {
    return null;
  }
  if (!chess.inCheck()) return null;

  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece?.type === 'k' && piece.color === chess.turn()) {
        return piece.square;
      }
    }
  }
  return null;
}
