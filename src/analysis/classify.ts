import * as ChessModule from 'chess.js';
import { MATE_CP } from './engine/uci';
import type { PositionEval } from './types';

export type Quality = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const QUALITY_GLYPH: Record<Quality, string> = {
  brilliant: '!!',
  best: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

export const QUALITY_LABEL: Record<Quality, string> = {
  brilliant: 'Brilliant',
  best: 'Best',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

/** Display order for the grouped move list. */
export const QUALITY_ORDER: Quality[] = [
  'brilliant',
  'best',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

/** Centipawn loss thresholds, measured from the mover's point of view. */
const INACCURACY = 50;
const MISTAKE = 120;
const BLUNDER = 250;

/** A sacrifice only counts as brilliant while the mover is clearly winning. */
const WINNING_CP = 150;

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * True when `uci`, played in `beforeFen`, offers at least two points of
 * material and the opponent can actually take it. This approximates the
 * "winning sacrifice" definition engines and chess sites use.
 */
export function isSacrifice(beforeFen: string, uci: string): boolean {
  try {
    const chess = new ChessModule.Chess(beforeFen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const piece = chess.get(from as ChessModule.Square);
    if (!piece) return false;

    const applied = chess.move({ from, to, promotion: uci[4] as ChessModule.PieceSymbol });
    const movedValue = PIECE_VALUE[applied.promotion ?? piece.type] ?? 0;
    const capturedValue = applied.captured ? (PIECE_VALUE[applied.captured] ?? 0) : 0;

    if (movedValue - capturedValue < 2) return false;

    // After the move it is the opponent's turn; any legal move landing on the
    // destination square is a recapture (en passant included).
    return chess.moves({ verbose: true }).some((move) => move.to === to);
  } catch {
    return false;
  }
}

export function moveQuality(
  before: PositionEval | undefined,
  after: PositionEval | undefined,
  mover: 'w' | 'b',
  playedUci: string,
  beforeFen?: string,
): Quality | undefined {
  if (!before || !after) return undefined;

  // Convert both evaluations to the mover's point of view. A positive loss
  // means the position got worse for the player who made the move.
  const sign = mover === 'w' ? 1 : -1;
  const afterForMover = after.whiteCp * sign;
  const loss = Math.max(0, before.whiteCp * sign - afterForMover);
  const isBest = before.bestMove === playedUci;

  if (
    isBest &&
    beforeFen &&
    afterForMover >= WINNING_CP &&
    isSacrifice(beforeFen, playedUci)
  ) {
    return 'brilliant';
  }

  if (isBest) return 'best';
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
