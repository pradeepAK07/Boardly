import type { ThreeEvent } from '@react-three/fiber';
import { PieceModel } from './PieceModel';

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

export type ChessPieceProps = {
  color: PieceColor;
  type: PieceType;
  position: [number, number, number];
  isHovered?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  animatedPosition?: [number, number, number];
  animatedScale?: number;
  /** Resting pieces are pick targets; pieces mid-animation are not. */
  isInteractive?: boolean;
  /** The drag overlay draws its own board-level shadow. */
  showShadow?: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
};

/** Thin wrapper so the model can be swapped without touching the board code. */
export function ChessPiece(props: ChessPieceProps) {
  return <PieceModel {...props} />;
}
