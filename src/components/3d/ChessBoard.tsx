import { useMemo } from "react";
import { SquareHighlight } from "./SquareHighlight";
import { MoveIndicator } from "./MoveIndicator";
import {
  fileRankToCoord,
  SQUARE_SIZE,
  TILE_HEIGHT,
  FILES,
} from "../../engine/boardMath";
import type { FileIndex, RankIndex } from "../../engine/boardMath";
import * as ChessModule from "chess.js";
import type { Square } from "chess.js";

// Warm wooden board: light squares stay clearly paler than the ivory pieces,
// dark squares are deep walnut so the near-black pieces still read against them.
const LIGHT_COLOR = 0xcdb891;
const DARK_COLOR = 0x7a5c3c;

type TileProps = {
  file: FileIndex;
  rank: RankIndex;
  square: string;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  legalMoves: string[];
  boardFen: string;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onPointerDown: () => void;
};

function Tile({
  file,
  rank,
  square,
  isSelected,
  isLastMove,
  isCheck,
  legalMoves,
  boardFen,
  onPointerOver,
  onPointerOut,
  onPointerDown,
}: TileProps) {
  // Standard chessboard: a1 (file 0, rank 0) is DARK, so light squares are
  // where (file + rank) is odd. The visual flip is handled by rotating the
  // whole board group, so physical square colours never change here.
  const isLight = (file + rank) % 2 === 1;
  const pos = fileRankToCoord(file, rank);

  const isLegal = legalMoves?.includes(square);
  const isCaptureTarget = isLegal && isPieceAtSquare(square, boardFen);

  // Legal move highlight colors - distinct green for both light/dark squares
  const LEGAL_LIGHT_COLOR = 0x22c55e; // darker green for light squares
  const LEGAL_DARK_COLOR = 0x4ade80; // brighter green for dark squares

  return (
    <mesh
      position={[pos.x, 0, pos.z]}
      receiveShadow
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      // A box tile is intersected twice by one ray (entry + exit faces), so
      // without this the click handler would run twice with stale state.
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown();
      }}
    >
      <boxGeometry args={[SQUARE_SIZE, TILE_HEIGHT, SQUARE_SIZE]} />
      <meshStandardMaterial
        color={isLegal ? (isLight ? LEGAL_LIGHT_COLOR : LEGAL_DARK_COLOR) : (isLight ? LIGHT_COLOR : DARK_COLOR)}
        transparent={isLegal}
        opacity={isLegal ? 0.6 : 1}
        roughness={0.75}
        metalness={0.05}
      />
      {isSelected && <SquareHighlight kind="select" />}
      {isLastMove && <SquareHighlight kind="last-move" />}
      {isCheck && <SquareHighlight kind="check" />}
      {isLegal && <MoveIndicator isCapture={isCaptureTarget} />}
    </mesh>
  );
}

function isPieceAtSquare(square: string, fen: string): boolean {
  try {
    const chess = new ChessModule.Chess(fen);
    return !!chess.get(square as Square);
  } catch {
    return false;
  }
}

type ChessBoardProps = {
  fen: string;
  selectedSquare: string | null;
  hoveredSquare: string | null;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  legalMoves: string[];
  onSquareClick: (square: string) => void;
  onSquareHover: (square: string) => void;
  onSquareUnhover: () => void;
};

export function ChessBoard({
  fen,
  selectedSquare,
  lastMove,
  checkSquare,
  legalMoves,
  onSquareClick,
  onSquareHover,
  onSquareUnhover,
}: ChessBoardProps) {
  const lastMoveSquares = useMemo(() => {
    if (!lastMove) return new Set<string>();
    return new Set([lastMove.from, lastMove.to]);
  }, [lastMove]);

  const tiles = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const internalRank = rank as RankIndex;
        const internalFile = file as FileIndex;
        const square = `${FILES[file]}${rank + 1}`;
        out.push(
          <Tile
            key={`${file}-${rank}`}
            file={internalFile}
            rank={internalRank}
            square={square}
            isSelected={selectedSquare === square}
            isLastMove={lastMoveSquares.has(square)}
            isCheck={checkSquare === square}
            legalMoves={legalMoves}
            boardFen={fen}
            onPointerOver={() => onSquareHover(square)}
            onPointerOut={onSquareUnhover}
            onPointerDown={() => onSquareClick(square)}
          />
        );
      }
    }
    return out;
  }, [selectedSquare, lastMoveSquares, checkSquare, legalMoves, fen, onSquareClick, onSquareHover, onSquareUnhover]);

  return <group>{tiles}</group>;
}
