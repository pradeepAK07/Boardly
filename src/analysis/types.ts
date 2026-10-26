/** A UCI score. `mate` is from the side-to-move's point of view. */
export type Score =
  | { type: 'cp'; value: number }
  | { type: 'mate'; value: number };

export type PositionEval = {
  /** Side-to-move POV, exactly as UCI reports it. */
  score: Score;
  /** White POV, with mate folded to +/-MATE_CP. What the eval bar consumes. */
  whiteCp: number;
  /** UCI move, e.g. "g1f3". */
  bestMove: string | null;
  pv: string[];
  depth: number;
  terminal?: 'checkmate' | 'draw';
};

export type PositionNode = {
  /** 0 is the imported start position. */
  ply: number;
  fen: string;
  /** The move that led to this position (null at ply 0). */
  san: string | null;
  uci: string | null;
  /** Colour that played the move that led here. */
  color: 'w' | 'b';
  /** Move number to display, respecting PGN/FEN starts. */
  moveNumber: number;
  lastMove: { from: string; to: string } | null;
  /** Side to move in this position. */
  turn: 'w' | 'b';
};

export type LoadedGame = {
  id: string;
  source: 'chesscom' | 'pgn' | 'fen';
  positions: PositionNode[];
  headers: Record<string, string>;
  white?: string;
  black?: string;
  whiteRating?: number;
  blackRating?: number;
  result?: string;
  timeClass?: string;
  timeControl?: string;
  url?: string;
  endedAt?: number;
};
