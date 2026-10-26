import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import type { Texture } from "three";
import { SquareHighlight } from "./SquareHighlight";
import { MoveIndicator } from "./MoveIndicator";
import { SuggestionArrow } from "./SuggestionArrow";
import {
  BOARD_EDGE,
  fileRankToCoord,
  SQUARE_SIZE,
  TILE_HEIGHT,
  FILES,
} from "../../engine/boardMath";
import type { FileIndex, RankIndex } from "../../engine/boardMath";
import * as ChessModule from "chess.js";
import type { Square } from "chess.js";
import { useTheme } from "@/theme/context";
import { getWoodTexture } from "@/theme/textures";

/** Small inset between tiles so the dark bed below reads as grout. */
const TILE_GAP = 0.016;
const TILE_RADIUS = 0.016;

type TileProps = {
  file: FileIndex;
  rank: RankIndex;
  square: string;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isSuggested: boolean;
  legalMoves: string[];
  boardFen: string;
  /** Wood grain variant for this square, or null for the glass theme. */
  texture: Texture | null;
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
  isSuggested,
  legalMoves,
  boardFen,
  texture,
  onPointerOver,
  onPointerOut,
  onPointerDown,
}: TileProps) {
  const { palette } = useTheme();

  // Standard chessboard: a1 (file 0, rank 0) is DARK, so light squares are
  // where (file + rank) is odd. The visual flip is handled by rotating the
  // whole board group, so physical square colours never change here.
  const isLight = (file + rank) % 2 === 1;
  const pos = fileRankToCoord(file, rank);

  const isLegal = legalMoves?.includes(square);
  const isCaptureTarget = isLegal && isPieceAtSquare(square, boardFen);

  const surface = palette.tiles;

  return (
    <RoundedBox
      args={[SQUARE_SIZE - TILE_GAP, TILE_HEIGHT, SQUARE_SIZE - TILE_GAP]}
      radius={TILE_RADIUS}
      smoothness={2}
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
      <meshPhysicalMaterial
        color={texture ? "#ffffff" : isLight ? surface.light : surface.dark}
        map={texture ?? undefined}
        roughness={surface.roughness}
        metalness={surface.metalness}
        clearcoat={surface.clearcoat}
        clearcoatRoughness={surface.clearcoatRoughness}
        envMapIntensity={surface.envMapIntensity}
        transparent={surface.transparent}
        opacity={surface.opacity}
        depthWrite={!surface.transparent}
      />
      {isLegal && <SquareHighlight kind="legal" />}
      {isSuggested && <SquareHighlight kind="suggest" />}
      {isSelected && <SquareHighlight kind="select" />}
      {isLastMove && <SquareHighlight kind="last-move" />}
      {isCheck && <SquareHighlight kind="check" />}
      {isLegal && <MoveIndicator isCapture={isCaptureTarget} />}
    </RoundedBox>
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
  /** Engine best move, shown as a blue arrow and square tints in analysis. */
  suggestedMove?: { from: string; to: string } | null;
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
  suggestedMove,
  legalMoves,
  onSquareClick,
  onSquareHover,
  onSquareUnhover,
}: ChessBoardProps) {
  const { palette } = useTheme();

  const lastMoveSquares = useMemo(() => {
    if (!lastMove) return new Set<string>();
    return new Set([lastMove.from, lastMove.to]);
  }, [lastMove]);

  const suggestedSquares = useMemo(() => {
    if (!suggestedMove) return new Set<string>();
    return new Set([suggestedMove.from, suggestedMove.to]);
  }, [suggestedMove]);

  // Four rotations of each grain, so neighbouring tiles never share a pattern.
  const woodVariants = useMemo(() => {
    const config = palette.tiles.texture;
    if (!config) return null;
    const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    return {
      light: rotations.map((rotation) =>
        getWoodTexture("tile-light", config.light, rotation),
      ),
      dark: rotations.map((rotation) =>
        getWoodTexture("tile-dark", config.dark, rotation),
      ),
    };
  }, [palette]);

  const tiles = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const internalRank = rank as RankIndex;
        const internalFile = file as FileIndex;
        const square = `${FILES[file]}${rank + 1}`;
        const isLight = (file + rank) % 2 === 1;
        const variants = woodVariants
          ? isLight
            ? woodVariants.light
            : woodVariants.dark
          : null;
        const texture = variants
          ? variants[(file * 3 + rank * 5) % variants.length]
          : null;
        out.push(
          <Tile
            key={`${file}-${rank}`}
            file={internalFile}
            rank={internalRank}
            square={square}
            isSelected={selectedSquare === square}
            isLastMove={lastMoveSquares.has(square)}
            isCheck={checkSquare === square}
            isSuggested={suggestedSquares.has(square)}
            legalMoves={legalMoves}
            boardFen={fen}
            texture={texture}
            onPointerOver={() => onSquareHover(square)}
            onPointerOut={onSquareUnhover}
            onPointerDown={() => onSquareClick(square)}
          />
        );
      }
    }
    return out;
  }, [selectedSquare, lastMoveSquares, checkSquare, suggestedSquares, legalMoves, fen, woodVariants, onSquareClick, onSquareHover, onSquareUnhover]);

  // Wood keeps the bed just under the tile tops so the bevel gaps read as
  // joinery. Glass needs room below the tiles for the frosted volume to show.
  const bedY = palette.tiles.transparent ? -0.05 : 0.048;

  return (
    <group>
      {/* Bed visible through the tile gaps (and through the glass tiles). */}
      <mesh
        position={[0, bedY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[BOARD_EDGE, BOARD_EDGE]} />
        <meshStandardMaterial
          color={palette.tiles.bed}
          roughness={palette.tiles.transparent ? 0.32 : 0.7}
          metalness={palette.tiles.transparent ? 0.35 : 0.04}
        />
      </mesh>

      {tiles}
      {suggestedMove && (
        <SuggestionArrow from={suggestedMove.from} to={suggestedMove.to} />
      )}
    </group>
  );
}
