import { createContext, useContext, useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { Chess as ChessInstance, Square } from "chess.js";
import { useChessGame, type BoardMetrics } from "./useChessGame";
import { getAIMove, type AIDifficulty } from "./chessAI";

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

/** Outcome of releasing a dragged piece over a square. */
export type DropResult = 'moved' | 'promotion' | 'returned';

export type InteractionState = {
  selectedSquare: string | null;
  hoveredSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  isDragging: boolean;
  promotionMove: { from: string; to: string } | null;
  metrics: BoardMetrics;
  chess: ChessInstance;
  aiEnabled: boolean;
  aiDifficulty: AIDifficulty;
  aiColor: 'w' | 'b' | null;
  boardFlipped: boolean;
  showCaptured: boolean;
};

export type InteractionActions = {
  selectSquare: (square: string) => void;
  clearSelection: () => void;
  setHovered: (square: string | null) => void;
  setDragging: (dragging: boolean) => void;
  attemptMove: (from: string, to: string) => void;
  dropOnSquare: (from: string, to: string | null) => DropResult;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  resolvePromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  resetGame: (fen?: string) => void;
  setAIEnabled: (enabled: boolean) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  setAIColor: (color: 'w' | 'b' | null) => void;
  makeAIMove: () => void;
  setBoardFlipped: (flipped: boolean) => void;
  setShowCaptured: (show: boolean) => void;
  navigateTo: (moveIndex: number) => void;
  undoMove: () => boolean;
  importPgn: (text: string) => boolean;
};

type MoveTarget = { to: string; promotion?: string };

const GameInteractionContext = createContext<
  (InteractionState & InteractionActions) | null
>(null);

// The hook and its provider deliberately live together so the context stays
// private; the fast-refresh warning is only a HMR nicety.
// eslint-disable-next-line react-refresh/only-export-components
export function useGameInteraction() {
  const ctx = useContext(GameInteractionContext);
  if (!ctx) {
    throw new Error(
      "useGameInteraction must be used within GameInteractionProvider",
    );
  }
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
  initialFen?: string;
};

export function GameInteractionProvider({
  children,
  initialFen,
}: ProviderProps) {
  const {
    chess,
    metrics,
    resetGame: resetChess,
    makeMove: rawMakeMove,
    navigateTo: rawNavigateTo,
    undoMove: rawUndoMove,
    importPgn: rawImportPgn,
  } = useChessGame(initialFen);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(
    null,
  );
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  
  // AI state
  const [aiEnabled, setAIEnabled] = useState(false);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [aiColor, setAIColor] = useState<'w' | 'b' | null>(null);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [showCaptured, setShowCaptured] = useState(true);
  const aiThinkingRef = useRef(false);

  // legalMoves computed from selectedSquare + chess state
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const moves = chess.moves({ square: selectedSquare as Square, verbose: true }) as MoveTarget[];
    return moves.map((m) => m.to);
  }, [selectedSquare, chess]);

  // checkSquare: return the square of the king in check, or null
  const checkSquare = useMemo(() => {
    if (!metrics.inCheck) return null;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell && cell.type === "k" && cell.color === metrics.turn) {
          const internalRank = 7 - r;
          return `${["a", "b", "c", "d", "e", "f", "g", "h"][f]}${internalRank + 1}`;
        }
      }
    }
    return null;
  }, [metrics.inCheck, metrics.turn, chess]);

  // makeMove: public function that handles promotion. Goes through the same
  // rawMakeMove path as normal moves so the move history (and therefore the
  // rendered FEN / captured pieces) stays in sync, including promotions.
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const success = rawMakeMove(from, to, promotion);
      if (!success) return false;

      setLastMove({ from, to });
      setSelectedSquare(null);
      setHoveredSquare(null);
      return true;
    },
    [rawMakeMove],
  );

  // attemptMove: make the move via rawMakeMove, track lastMove (for internal use)
  const attemptMove = useCallback(
    (from: string, to: string) => {
      const success = rawMakeMove(from, to);
      if (!success) return;

      setLastMove({ from, to });
      setSelectedSquare(null);
      setHoveredSquare(null);
    },
    [rawMakeMove],
  );

  // dropOnSquare: finish a drag. Returns what happened so the view can either
  // keep the piece at the drop square or animate it back to its origin.
  const dropOnSquare = useCallback(
    (from: string, to: string | null): DropResult => {
      setIsDragging(false);
      if (!to || to === from) return "returned";

      const piece = chess.get(from as Square);
      if (!piece || piece.color !== metrics.turn) return "returned";

      const moves = chess.moves({
        square: from as Square,
        verbose: true,
      }) as MoveTarget[];
      const target = moves.find((m) => m.to === to);
      if (!target) return "returned";

      if (target.promotion) {
        setPromotionMove({ from, to });
        setSelectedSquare(null);
        setHoveredSquare(null);
        return "promotion";
      }

      if (!rawMakeMove(from, to)) return "returned";
      setLastMove({ from, to });
      setSelectedSquare(null);
      setHoveredSquare(null);
      return "moved";
    },
    [chess, metrics.turn, rawMakeMove],
  );

  // selectSquare: set selected square, or attempt move if it's a legal target
  const selectSquare = useCallback(
    (square: string) => {
      if (isDragging) return;
      const piece = chess.get(square as Square);
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      if (piece && piece.color === metrics.turn) {
        setSelectedSquare(square);
      } else if (selectedSquare && legalMoves.includes(square)) {
        // Pawn reaching the last rank: ask the player which piece to promote to
        // instead of attempting an incomplete move (chess.js would reject it).
        const moves = chess.moves({
          square: selectedSquare as Square,
          verbose: true,
        }) as MoveTarget[];
        const needsPromotion = moves.some(
          (m) => m.to === square && m.promotion,
        );
        if (needsPromotion) {
          setPromotionMove({ from: selectedSquare, to: square });
          return;
        }
        attemptMove(selectedSquare, square);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, chess, metrics.turn, legalMoves, isDragging, attemptMove],
  );

  // resolvePromotion: finish a pending pawn promotion with the chosen piece
  const resolvePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!promotionMove) return;
      const success = rawMakeMove(promotionMove.from, promotionMove.to, piece);
      if (success) {
        setLastMove({ ...promotionMove });
        setSelectedSquare(null);
        setHoveredSquare(null);
      }
      setPromotionMove(null);
    },
    [promotionMove, rawMakeMove],
  );

  const cancelPromotion = useCallback(() => {
    setPromotionMove(null);
    setSelectedSquare(null);
  }, []);

  // clearSelection: no-op - selection is only cleared by explicit click actions in selectSquare
  // This prevents indicators from disappearing when mouse leaves piece to click on them
  const clearSelection = useCallback(() => {}, []);

  // setHovered: set the hovered square (gated by !isDragging)
  const setHovered = useCallback(
    (square: string | null) => {
      if (isDragging) return;
      setHoveredSquare(square);
    },
    [isDragging],
  );

  // setDragging: toggle dragging state
  const setDragging = useCallback(
    (dragging: boolean) => setIsDragging(dragging),
    [],
  );

  // makeAIMove: trigger AI to make a move
  const makeAIMove = useCallback(() => {
    if (aiThinkingRef.current || !aiEnabled || !aiColor || metrics.turn !== aiColor) return;
    if (metrics.inCheckmate || metrics.inDraw || metrics.inStalemate) return;
    
    aiThinkingRef.current = true;
    
    // Small delay to show "thinking"
    setTimeout(() => {
      const moveStr = getAIMove(chess.fen(), aiDifficulty);
      if (moveStr) {
        const from = moveStr.slice(0, 2);
        const to = moveStr.slice(2, 4);
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

        if (rawMakeMove(from, to, promotion)) {
          setLastMove({ from, to });
          setSelectedSquare(null);
        }
      }
      aiThinkingRef.current = false;
    }, 300);
  }, [aiEnabled, aiColor, aiDifficulty, chess, rawMakeMove, metrics.turn, metrics.inCheckmate, metrics.inDraw, metrics.inStalemate]);

  // Auto-trigger AI move when it's AI's turn
  useEffect(() => {
    if (aiEnabled && aiColor && metrics.turn === aiColor && !aiThinkingRef.current) {
      makeAIMove();
    }
  }, [metrics.turn, aiEnabled, aiColor, makeAIMove]);

  // resetGame: reset chess state and UI state
  const resetGame = useCallback((fen?: string) => {
    resetChess(fen);
    setSelectedSquare(null);
    setHoveredSquare(null);
    setLastMove(null);
    setIsDragging(false);
    setPromotionMove(null);
    aiThinkingRef.current = false;
  }, [resetChess]);

  // History navigation. These clear the pending selection and set the
  // last-move highlight to the move that is now current.
  const navigateTo = useCallback(
    (moveIndex: number) => {
      rawNavigateTo(moveIndex);
      const last = moveIndex > 0 ? metrics.history[moveIndex - 1] : null;
      setLastMove(last ? { from: last.from, to: last.to } : null);
      setSelectedSquare(null);
      setHoveredSquare(null);
      setPromotionMove(null);
    },
    [rawNavigateTo, metrics.history],
  );

  const undoMove = useCallback((): boolean => {
    if (!rawUndoMove()) return false;
    const remaining = metrics.history.slice(0, -1);
    const last = remaining[remaining.length - 1] ?? null;
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setSelectedSquare(null);
    setHoveredSquare(null);
    setPromotionMove(null);
    return true;
  }, [rawUndoMove, metrics.history]);

  const importPgn = useCallback(
    (text: string): boolean => {
      if (!rawImportPgn(text)) return false;
      setLastMove(null);
      setSelectedSquare(null);
      setHoveredSquare(null);
      setPromotionMove(null);
      aiThinkingRef.current = false;
      return true;
    },
    [rawImportPgn],
  );

  // value: the context value object
  const value = useMemo(
    () => ({
      selectedSquare,
      hoveredSquare,
      legalMoves,
      lastMove,
      checkSquare,
      isDragging,
      promotionMove,
      metrics,
      chess,
      aiEnabled,
      aiDifficulty,
      aiColor,
      boardFlipped,
      showCaptured,
      selectSquare,
      clearSelection,
      setHovered,
      setDragging,
      attemptMove,
      dropOnSquare,
      makeMove,
      resolvePromotion,
      cancelPromotion,
      resetGame,
      setAIEnabled,
      setAIDifficulty,
      setAIColor,
      makeAIMove,
      setBoardFlipped,
      setShowCaptured,
      navigateTo,
      undoMove,
      importPgn,
    }),
    [
      selectedSquare,
      hoveredSquare,
      legalMoves,
      lastMove,
      checkSquare,
      isDragging,
      promotionMove,
      metrics,
      chess,
      aiEnabled,
      aiDifficulty,
      aiColor,
      boardFlipped,
      showCaptured,
      selectSquare,
      clearSelection,
      setHovered,
      setDragging,
      attemptMove,
      dropOnSquare,
      makeMove,
      resolvePromotion,
      cancelPromotion,
      resetGame,
      setAIEnabled,
      setAIDifficulty,
      setAIColor,
      makeAIMove,
      setBoardFlipped,
      setShowCaptured,
      navigateTo,
      undoMove,
      importPgn,
    ],
  );

  return (
    <GameInteractionContext.Provider value={value}>
      {children}
    </GameInteractionContext.Provider>
  );
}