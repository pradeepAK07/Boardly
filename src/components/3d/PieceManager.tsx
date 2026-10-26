import { useMemo, useRef, useEffect, useState } from "react";
import * as ChessModule from "chess.js";
import { gsap } from "gsap";
import { ChessPiece, type PieceColor, type PieceType } from "./ChessPiece";
import { squareToCoord, BOARD_SURFACE_Y, FILES } from "../../engine/boardMath";

export type BoardArray = Array<Array<{
  type: PieceType;
  color: PieceColor;
} | null> | null>;

type VerboseMove = {
  from: string;
  to: string;
  color: PieceColor;
  captured?: PieceType;
  promotion?: PieceType;
  flags: string;
};

type AnimatedMove = {
  from: string;
  to: string;
  isCapture: boolean;
  capturedType?: PieceType;
  capturedSquare?: string;
  capturedColor?: PieceColor;
  rookFrom?: string;
  rookTo?: string;
};

type PieceManagerProps = {
  fen: string;
  selectedSquare: string | null;
  hoveredSquare: string | null;
  /** The move that produced the current FEN, used to animate it. */
  lastMove: { from: string; to: string } | null;
  /**
   * Analysis navigation jumps between arbitrary plies, so those position
   * changes must snap rather than animate a move that may have gone backwards.
   */
  animateMoves?: boolean;
  onSquareClick: (square: string) => void;
  onSquareHover: (square: string) => void;
  onSquareUnhover: () => void;
};

function fenToBoard(fen: string): BoardArray {
  const chess = new ChessModule.Chess(fen);
  return chess.board() as BoardArray;
}

function squareFromIndices(fileIdx: number, rankIdx: number): string {
  return `${FILES[fileIdx]}${8 - rankIdx}`;
}

/**
 * Build the animation description for a move from the position *before* it was
 * played. Using chess.js' verbose move data gets castling, en passant and
 * promotion right, which a plain from/to FEN diff cannot do.
 */
function describeMove(prevFen: string, move: { from: string; to: string }): AnimatedMove | null {
  let prev: ChessModule.Chess;
  try {
    prev = new ChessModule.Chess(prevFen);
  } catch {
    return null;
  }

  const candidates = prev.moves({ square: move.from as never, verbose: true }) as VerboseMove[];
  const played = candidates.find((m) => m.to === move.to);
  if (!played) return null;

  const moverColor = played.color;
  const isEnPassant = played.flags.includes("e");
  const isKingsideCastle = played.flags.includes("k");
  const isQueensideCastle = played.flags.includes("q");
  const rank = move.from[1];

  return {
    from: played.from,
    to: played.to,
    isCapture: !!played.captured,
    capturedType: played.captured,
    // En passant captures a pawn beside the destination square, not on it.
    capturedSquare: played.captured
      ? isEnPassant
        ? `${move.to[0]}${move.from[1]}`
        : move.to
      : undefined,
    capturedColor: played.captured
      ? moverColor === "w"
        ? "b"
        : "w"
      : undefined,
    rookFrom: isKingsideCastle ? `h${rank}` : isQueensideCastle ? `a${rank}` : undefined,
    rookTo: isKingsideCastle ? `f${rank}` : isQueensideCastle ? `d${rank}` : undefined,
  };
}

function arcPosition(
  from: string,
  to: string,
  progress: number,
  lift: number,
): [number, number, number] {
  const a = squareToCoord(from as never);
  const b = squareToCoord(to as never);
  return [
    a.x + (b.x - a.x) * progress,
    BOARD_SURFACE_Y + Math.sin(progress * Math.PI) * lift,
    a.z + (b.z - a.z) * progress,
  ];
}

export const PieceManager = ({
  fen,
  selectedSquare,
  hoveredSquare,
  lastMove,
  animateMoves = true,
  onSquareClick,
  onSquareHover,
  onSquareUnhover,
}: PieceManagerProps) => {
  const prevFenRef = useRef(fen);
  const prevAnimateRef = useRef(animateMoves);
  const [animatingMove, setAnimatingMove] = useState<AnimatedMove | null>(null);
  const [progress, setProgress] = useState(1);

  // Detect FEN changes and animate the move that produced them.
  useEffect(() => {
    const prevFen = prevFenRef.current;
    const wasAnimating = prevAnimateRef.current;
    prevAnimateRef.current = animateMoves;

    if (fen === prevFen && wasAnimating === animateMoves) return;
    prevFenRef.current = fen;

    // Undo / history navigation / reset clear lastMove, so those changes snap
    // into place instead of animating a move that no longer happened. The same
    // applies when entering or leaving analysis mode.
    if (!lastMove || !animateMoves || !wasAnimating) {
      setAnimatingMove(null);
      setProgress(1);
      return;
    }

    const move = describeMove(prevFen, lastMove);
    if (!move) return;

    setAnimatingMove(move);
    setProgress(0);

    const tween = { v: 0 };
    gsap.to(tween, {
      v: 1,
      duration: 0.45,
      ease: "power2.inOut",
      onUpdate: () => setProgress(tween.v),
      onComplete: () => setAnimatingMove(null),
    });

    return () => {
      gsap.killTweensOf(tween);
    };
  }, [fen, lastMove, animateMoves]);

  const board = useMemo(() => fenToBoard(fen), [fen]);

  const pieces: React.ReactElement[] = [];

  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    const row = board[rankIdx];
    if (!row) continue;
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const cell = row[fileIdx];
      if (!cell) continue;
      const square = squareFromIndices(fileIdx, rankIdx);
      const basePos = squareToCoord(square as never);
      const pos: [number, number, number] = [basePos.x, BOARD_SURFACE_Y, basePos.z];

      let animatedPos: [number, number, number] | undefined;
      const animating = animatingMove && progress < 1;

      if (animating) {
        if (animatingMove.to === square) {
          animatedPos = arcPosition(animatingMove.from, animatingMove.to, progress, 0.7);
        } else if (animatingMove.rookTo === square && animatingMove.rookFrom) {
          // Castling: the rook travels along with the king.
          animatedPos = arcPosition(animatingMove.rookFrom, animatingMove.rookTo, progress, 0.45);
        }
      }

      pieces.push(
        <ChessPiece
          key={square}
          color={cell.color}
          type={cell.type}
          position={pos}
          isHovered={hoveredSquare === square}
          isSelected={selectedSquare === square}
          animatedPosition={animatedPos}
          animatedScale={animatedPos ? 1 : undefined}
          // A moving piece is not a static target: the square it is flying over
          // must stay clickable, so only resting pieces take pointer events.
          isInteractive={!animatedPos}
          onPointerOver={() => onSquareHover(square)}
          onPointerOut={onSquareUnhover}
          onPointerDown={() => onSquareClick(square)}
        />,
      );
    }
  }

  // Captured piece sliding off the board while the capturing piece arrives.
  let capturedPieceJSX: React.ReactElement | null = null;
  if (
    animatingMove &&
    animatingMove.isCapture &&
    animatingMove.capturedSquare &&
    animatingMove.capturedType &&
    animatingMove.capturedColor &&
    progress < 1
  ) {
    const start = squareToCoord(animatingMove.capturedSquare as never);
    const endX = start.x > 0 ? -7 : 7;
    capturedPieceJSX = (
      <ChessPiece
        color={animatingMove.capturedColor}
        type={animatingMove.capturedType}
        position={[
          start.x + (endX - start.x) * progress,
          BOARD_SURFACE_Y + 1.1 * progress,
          start.z,
        ]}
        animatedScale={1 - progress * 0.75}
        isHovered={false}
        isSelected={false}
        isInteractive={false}
        onPointerOver={() => {}}
        onPointerOut={() => {}}
        onPointerDown={() => {}}
      />
    );
  }

  return (
    <>
      {pieces}
      {capturedPieceJSX}
    </>
  );
};
