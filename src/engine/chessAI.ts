import { Chess } from 'chess.js';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_TABLE_MIDDLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const KING_TABLE_END = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const PIECE_TABLES: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE_MIDDLE,
};

function flipTable(table: number[]): number[] {
  const flipped = new Array(64);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      flipped[i * 8 + j] = table[(7 - i) * 8 + j];
    }
  }
  return flipped;
}

function isEndgame(board: Chess): boolean {
  let whiteMaterial = 0;
  let blackMaterial = 0;
  
  const squares = board.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = squares[r][f];
      if (piece) {
        const value = PIECE_VALUES[piece.type] || 0;
        if (piece.color === 'w') whiteMaterial += value;
        else blackMaterial += value;
      }
    }
  }
  
  // Endgame if both sides have less than 1300 material (roughly queen + minor piece)
  return whiteMaterial < 1300 && blackMaterial < 1300;
}

export function evaluatePosition(chess: Chess): number {
  let score = 0;
  const endgame = isEndgame(chess);
  const board = chess.board();
  
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      
      const pieceValue = PIECE_VALUES[piece.type] || 0;
      const squareIndex = r * 8 + f;
      let positionalValue = 0;
      
      const table = PIECE_TABLES[piece.type] || [];
      if (table.length > 0) {
        if (piece.type === 'k' && endgame) {
          positionalValue = KING_TABLE_END[squareIndex];
        } else {
          positionalValue = table[squareIndex];
        }
        
        // Flip for black pieces
        if (piece.color === 'b') {
          positionalValue = flipTable(table)[squareIndex];
          if (piece.type === 'k' && endgame) {
            positionalValue = flipTable(KING_TABLE_END)[squareIndex];
          }
        }
      }
      
      const totalValue = pieceValue + positionalValue;
      
      if (piece.color === 'w') {
        score += totalValue;
      } else {
        score -= totalValue;
      }
    }
  }
  
  // Checkmate/stalemate bonuses
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return 0;
  }
  
  // Check bonus
  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -50 : 50;
  }
  
  // Mobility bonus
  const mobility = chess.moves().length;
  score += chess.turn() === 'w' ? mobility * 2 : -mobility * 2;
  
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean
): { score: number; move: string | null } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluatePosition(chess), move: null };
  }

  const moves = chess.moves({ verbose: true });
  
  // Simple move ordering: captures first, then checks
  moves.sort((a, b) => {
    if (a.captured && !b.captured) return -1;
    if (!a.captured && b.captured) return 1;
    if (a.san.includes('+') && !b.san.includes('+')) return -1;
    if (!a.san.includes('+') && b.san.includes('+')) return 1;
    return 0;
  });

  let bestMove: string | null = null;

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      
      if (evaluation.score > maxEval) {
        maxEval = evaluation.score;
        bestMove = move.from + move.to + (move.promotion || '');
      }
      alpha = Math.max(alpha, evaluation.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      
      if (evaluation.score < minEval) {
        minEval = evaluation.score;
        bestMove = move.from + move.to + (move.promotion || '');
      }
      beta = Math.min(beta, evaluation.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

export function getAIMove(fen: string, difficulty: AIDifficulty = 'medium'): string | null {
  const chess = new Chess(fen);
  
  if (chess.isGameOver()) return null;
  
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  // Easy: random move
  if (difficulty === 'easy') {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return randomMove.from + randomMove.to + (randomMove.promotion || '');
  }
  
  // Medium: depth 2
  // Hard: depth 3
  const depth = difficulty === 'hard' ? 3 : 2;
  
  const result = minimax(chess, depth, -Infinity, Infinity, chess.turn() === 'w');
  
  if (result.move) {
    return result.move;
  }
  
  // Fallback to random
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  return randomMove.from + randomMove.to + (randomMove.promotion || '');
}

export function makeAIMove(
  chess: Chess,
  difficulty: AIDifficulty = 'medium',
  onMove?: (move: string) => void
): boolean {
  const moveStr = getAIMove(chess.fen(), difficulty);
  if (!moveStr) return false;
  
  const from = moveStr.slice(0, 2);
  const to = moveStr.slice(2, 4);
  const promotion = moveStr.length > 4 ? moveStr[4] : undefined;
  
  const move = chess.move({ from, to, promotion });
  if (move && onMove) {
    onMove(moveStr);
  }
  return !!move;
}