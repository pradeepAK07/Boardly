import * as ChessModule from 'chess.js';
import type { Score } from '../types';

/** Mate is folded into a large centipawn value so the bar needs one number. */
export const MATE_CP = 100_000;

export type InfoLine = {
  depth: number;
  multipv: number;
  score: Score;
  pv: string[];
};

/** Parse a UCI `info ... score ... pv ...` line. */
export function parseInfo(line: string): InfoLine | null {
  if (!line.startsWith('info ') || line.startsWith('info string')) return null;

  const tokens = line.split(/\s+/);
  let depth = 0;
  let multipv = 1;
  let score: Score | null = null;
  const pv: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'depth':
        depth = Number(tokens[++i]);
        break;
      case 'multipv':
        multipv = Number(tokens[++i]);
        break;
      case 'score':
        if (tokens[i + 1] === 'cp') {
          score = { type: 'cp', value: Number(tokens[i + 2]) };
          i += 2;
        } else if (tokens[i + 1] === 'mate') {
          score = { type: 'mate', value: Number(tokens[i + 2]) };
          i += 2;
        }
        break;
      case 'pv':
        pv.push(...tokens.slice(i + 1));
        i = tokens.length;
        break;
    }
  }

  return score ? { depth, multipv, score, pv } : null;
}

/**
 * UCI reports scores from the side-to-move POV. Normalize to White POV so a
 * single evaluation bar can render every position.
 */
export function toWhiteCp(score: Score, turn: 'w' | 'b'): number {
  let raw: number;
  if (score.type === 'cp') {
    raw = score.value;
  } else if (score.value === 0) {
    // The side to move is checkmated.
    raw = -MATE_CP;
  } else {
    raw = (score.value > 0 ? 1 : -1) * (MATE_CP - Math.abs(score.value));
  }
  return turn === 'w' ? raw : -raw;
}

/** Human label from White's point of view. */
export function formatEval(score: Score, turn: 'w' | 'b'): string {
  const white = toWhiteCp(score, turn);
  if (score.type === 'mate') {
    if (score.value === 0) return '#';
    return `${white > 0 ? '+' : '-'}M${Math.abs(score.value)}`;
  }
  return `${white >= 0 ? '+' : ''}${(white / 100).toFixed(2)}`;
}

export function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null;
  try {
    const chess = new ChessModule.Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';
