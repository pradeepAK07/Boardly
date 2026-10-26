import { Vector3 } from 'three';

/**
 * Board grid math for an 8x8 chess board centered at world origin (0, 0, 0).
 *
 * Axis convention (matches the default White camera at negative z, looking
 * toward +z):
 *
 *   - The camera's screen-right direction is world -x, therefore files must
 *     DECREASE along +x:  a-file -> x = +3.5 ... h-file -> x = -3.5.
 *     This puts a-h left-to-right on screen and a1 (dark) in the bottom-left
 *     corner, exactly like a real board from White's side.
 *   - rank 1 is nearest the camera: z = -3.5 ... rank 8 -> z = +3.5.
 *   - y = 0 is the board surface; tiles are TILE_HEIGHT thick, centered on 0,
 *     so BOARD_SURFACE_Y is the walkable top of the tiles.
 *
 * `boardToWorld(..., true)` applies a 180° rotation about Y (the standard
 * "flip board" view), which puts Black at the bottom and the a-file on the
 * right, without moving the camera below the horizon.
 */
export const SQUARE_SIZE = 1;
export const BOARD_FILES = 8;
export const BOARD_RANKS = 8;
export const BOARD_HALF = BOARD_FILES / 2; // 4
export const BOARD_EDGE = BOARD_FILES * SQUARE_SIZE; // 8
export const TILE_HEIGHT = 0.12;
export const BOARD_SURFACE_Y = TILE_HEIGHT / 2; // top of the tiles

export type FileIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Square = `${string}${number}`; // e.g. 'a1' .. 'h8'

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Convert fractional file/rank indices to a world position.
 * `file`/`rank` are 0-based indices; out-of-range values are allowed so UI
 * labels can sit just outside the board (e.g. rank = -1 for the near edge).
 */
export function boardToWorld(
  file: number,
  rank: number,
  boardFlipped = false,
): Vector3 {
  const x = BOARD_HALF - 0.5 - file; // a -> +3.5 ... h -> -3.5
  const z = rank - BOARD_HALF + 0.5; // 1 -> -3.5 ... 8 -> +3.5
  return new Vector3(boardFlipped ? -x : x, 0, boardFlipped ? -z : z);
}

/** Convert algebraic square (e.g. 'e4') to world {x, y, z}. */
export function squareToCoord(square: Square, boardFlipped = false): Vector3 {
  const file = FILES.indexOf(square[0] as never);
  const rank = RANKS.indexOf(Number(square[1]) as never);
  return boardToWorld(file, rank, boardFlipped);
}

/**
 * Convert world {x, z} back to the nearest algebraic square.
 * Returns null if the point is off-board.
 */
export function coordToSquare(x: number, z: number): Square | null {
  const file = Math.round(BOARD_HALF - 0.5 - x);
  const rank = Math.round(z + BOARD_HALF - 0.5);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

/** Convert file/rank indices to world {x, y, z}. */
export function fileRankToCoord(
  file: FileIndex,
  rank: RankIndex,
  boardFlipped = false,
): Vector3 {
  return boardToWorld(file, rank, boardFlipped);
}

/** All 64 squares in algebraic order (a1 -> h8). */
export const ALL_SQUARES: Square[] = (() => {
  const out: Square[] = [];
  for (const rank of RANKS) {
    for (const file of FILES) {
      out.push(`${file}${rank}` as Square);
    }
  }
  return out;
})();
