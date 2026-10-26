import * as ChessModule from 'chess.js';
import type { LoadedGame, PositionNode } from './types';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type VerboseMove = {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  color: 'w' | 'b';
};

export type ParseMeta = Partial<
  Pick<
    LoadedGame,
    | 'white'
    | 'black'
    | 'whiteRating'
    | 'blackRating'
    | 'result'
    | 'timeClass'
    | 'timeControl'
    | 'url'
    | 'endedAt'
  >
>;

/** Accept 4/5/6-field FENs (players often omit the clocks). */
export function normalizeFen(input: string): string | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 4 || parts.length > 6) return null;

  if (parts.length === 4) parts.push('0', '1');
  if (parts.length === 5) parts.push('1');

  const fen = parts.join(' ');
  const validation = ChessModule.validateFen(fen);
  return validation.ok ? fen : null;
}

/**
 * Replay the moves once and record every position. The rest of the analysis
 * feature navigates this array instead of mutating a chess.js instance, so
 * stepping backwards can never destroy later moves.
 */
export function buildPositions(baseFen: string, moves: VerboseMove[]): PositionNode[] {
  const replay = new ChessModule.Chess(baseFen);
  const positions: PositionNode[] = [
    {
      ply: 0,
      fen: replay.fen(),
      san: null,
      uci: null,
      color: replay.turn(),
      moveNumber: Number(replay.fen().split(' ')[5] ?? 1),
      lastMove: null,
      turn: replay.turn(),
    },
  ];

  moves.forEach((move, index) => {
    const applied = replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });

    if (!applied) {
      throw new Error(`Illegal move ${index + 1}: ${move.san || `${move.from}${move.to}`}`);
    }

    const fullmove = Number(replay.fen().split(' ')[5]);
    positions.push({
      ply: index + 1,
      fen: replay.fen(),
      san: applied.san,
      uci: `${applied.from}${applied.to}${applied.promotion ?? ''}`,
      color: applied.color,
      // After White's move the fullmove number is unchanged; after Black's it
      // has already advanced, so subtract one to label the move just played.
      moveNumber: applied.color === 'w' ? fullmove : fullmove - 1,
      lastMove: { from: applied.from, to: applied.to },
      turn: replay.turn(),
    });
  });

  return positions;
}

export function parseGame(
  text: string,
  source: LoadedGame['source'] = 'pgn',
  meta: ParseMeta = {},
): LoadedGame {
  const raw = text.trim();
  if (!raw) throw new Error('Nothing to import.');

  const hasPgnTags = /\[\s*[A-Za-z]+\s+"/.test(raw);

  // A bare FEN is a one-position game.
  if (!hasPgnTags) {
    const fen = normalizeFen(raw);
    if (fen) {
      const chess = new ChessModule.Chess(fen);
      return {
        id: `fen:${hash(raw)}`,
        source: 'fen',
        headers: {},
        positions: [
          {
            ply: 0,
            fen,
            san: null,
            uci: null,
            color: chess.turn(),
            moveNumber: Number(fen.split(' ')[5] ?? 1),
            lastMove: null,
            turn: chess.turn(),
          },
        ],
        ...meta,
      };
    }
  }

  const chess = new ChessModule.Chess();
  try {
    chess.loadPgn(raw, { strict: false });
  } catch {
    throw new Error('That text is not a valid PGN or FEN.');
  }

  const headers = chess.getHeaders();
  const fenHeader =
    headers.SetUp === '1' && headers.FEN ? normalizeFen(headers.FEN) : null;
  const baseFen = fenHeader ?? DEFAULT_FEN;
  const moves = chess.history({ verbose: true }) as VerboseMove[];

  if (moves.length === 0 && headers.FEN && !fenHeader) {
    throw new Error('The PGN has a [FEN] header that is not a valid position.');
  }

  return {
    id: `pgn:${hash(raw)}`,
    source,
    headers,
    positions: buildPositions(baseFen, moves),
    white: headers.White || undefined,
    black: headers.Black || undefined,
    result: headers.Result || undefined,
    timeControl: headers.TimeControl || undefined,
    ...meta,
  };
}

function hash(input: string): string {
  let value = 5381;
  for (let i = 0; i < input.length; i++) {
    value = ((value << 5) + value + input.charCodeAt(i)) | 0;
  }
  return Math.abs(value).toString(36);
}
