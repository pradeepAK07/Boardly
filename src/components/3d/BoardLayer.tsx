import type { RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ChessBoard } from "./ChessBoard";
import { PieceManager } from "./PieceManager";
import { usePieceDrag } from "./usePieceDrag";
import { useGameInteraction } from "@/engine/useGameInteraction";

type BoardLayerProps = {
  fen: string;
  selectedSquare: string | null;
  hoveredSquare: string | null;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  suggestedMove: { from: string; to: string } | null;
  legalMoves: string[];
  boardFlipped: boolean;
  analysisMode: boolean;
  orbitRef: RefObject<OrbitControlsImpl | null>;
};

/**
 * Everything that lives on the board. It sits inside the board group so the
 * drag overlay can use square-local coordinates even when the view is flipped.
 */
export function BoardLayer({
  fen,
  selectedSquare,
  hoveredSquare,
  lastMove,
  checkSquare,
  suggestedMove,
  legalMoves,
  boardFlipped,
  analysisMode,
  orbitRef,
}: BoardLayerProps) {
  const { selectSquare, setHovered, metrics, aiEnabled, aiColor } =
    useGameInteraction();

  // The AI plays its own colour, and a finished game is not editable.
  const gameOver = metrics.inCheckmate || metrics.inDraw || metrics.inStalemate;
  const aiTurn = aiEnabled && aiColor !== null && metrics.turn === aiColor;
  const canDrag = !analysisMode && !aiTurn && !gameOver;

  const drag = usePieceDrag({
    enabled: canDrag,
    boardFlipped,
    orbitRef,
  });

  const onSquareClick = analysisMode ? () => {} : selectSquare;

  return (
    <group rotation={[0, boardFlipped ? Math.PI : 0, 0]}>
      <ChessBoard
        fen={fen}
        selectedSquare={selectedSquare}
        hoveredSquare={hoveredSquare}
        lastMove={lastMove}
        checkSquare={checkSquare}
        suggestedMove={suggestedMove}
        legalMoves={legalMoves}
        dragTarget={drag.dragTarget}
        onSquareClick={onSquareClick}
        onSquareHover={setHovered}
        onSquareUnhover={() => setHovered(null)}
      />
      <PieceManager
        fen={fen}
        selectedSquare={selectedSquare}
        hoveredSquare={hoveredSquare}
        lastMove={lastMove}
        animateMoves={!analysisMode && !drag.suppressMoveAnimation}
        draggingFrom={drag.dragVisual?.from ?? null}
        dragVisual={drag.dragVisual}
        onPiecePointerDown={analysisMode ? undefined : drag.onPiecePointerDown}
        onSquareClick={onSquareClick}
        onSquareHover={setHovered}
        onSquareUnhover={() => setHovered(null)}
      />
    </group>
  );
}
