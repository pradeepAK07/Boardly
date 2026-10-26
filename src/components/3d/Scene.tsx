import { useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { ChessBoard } from './ChessBoard';
import { PieceManager } from './PieceManager';
import { Table } from './Table';
import { boardToWorld } from '@/engine/boardMath';
import { CAMERA_ELEVATION, fitCameraDistance } from '@/engine/cameraMath';
import { useGameInteraction } from '@/engine/useGameInteraction';
import { useAnalysis } from '@/analysis/context';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Pulls the camera back just far enough that the whole table fits the board
 * column, whatever its aspect ratio, while keeping a fixed elevation angle.
 */
function CameraRig() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.35);
    // R3F keeps the perspective camera's aspect in sync with the canvas size
    // (unless the camera is marked `manual`), so only the framing is set here.
    const distance = fitCameraDistance(aspect);

    camera.position.set(
      0,
      distance * Math.sin(CAMERA_ELEVATION),
      -distance * Math.cos(CAMERA_ELEVATION),
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }, [camera, size.width, size.height]);

  return null;
}

export function GameScene({ boardFlipped = false }: { boardFlipped?: boolean }) {
  const {
    selectedSquare,
    hoveredSquare,
    lastMove,
    checkSquare,
    legalMoves,
    selectSquare,
    setHovered,
    metrics,
  } = useGameInteraction();

  const {
    enabled: analysisMode,
    viewFen,
    viewLastMove,
    viewCheckSquare,
  } = useAnalysis();

  // In analysis mode the board is a read-only view of the selected ply. The
  // live game (and its legal moves) must not leak into that position.
  const currentFen = analysisMode && viewFen ? viewFen : metrics.fen;
  const currentLastMove = analysisMode ? viewLastMove : lastMove;
  const currentCheckSquare = analysisMode ? viewCheckSquare : checkSquare;
  const currentLegalMoves = analysisMode ? [] : legalMoves;
  const currentSelectedSquare = analysisMode ? null : selectedSquare;
  const onSquareClick = analysisMode ? () => {} : selectSquare;

  // Board labels live outside the rotated board group, so their positions are
  // computed with the same 180° flip applied to the pieces and tiles.
  const labels = useMemo(() => {
    const out: React.ReactElement[] = [];
    // Edge closest to the camera: just beyond rank 1 (White) / rank 8 (Black).
    const fileEdgeRank = boardFlipped ? 8 : -1;
    // Left edge of the current view: just outside file a (White) / file h (Black).
    const rankEdgeFile = boardFlipped ? 8 : -1;
    const labelY = -0.03;
    const rotation: [number, number, number] = [-Math.PI / 2, 0, Math.PI];

    for (let file = 0; file < 8; file++) {
      const p = boardToWorld(file, fileEdgeRank, boardFlipped);
      out.push(
        <Text
          key={`file-${file}`}
          position={[p.x, labelY, p.z]}
          rotation={rotation}
          fontSize={0.34}
          color="#d8c7a8"
          anchorX="center"
          anchorY="middle"
        >
          {FILES[file]}
        </Text>,
      );
    }

    for (let rank = 0; rank < 8; rank++) {
      const p = boardToWorld(rankEdgeFile, rank, boardFlipped);
      out.push(
        <Text
          key={`rank-${rank}`}
          position={[p.x, labelY, p.z]}
          rotation={rotation}
          fontSize={0.34}
          color="#d8c7a8"
          anchorX="center"
          anchorY="middle"
        >
          {rank + 1}
        </Text>,
      );
    }

    return out;
  }, [boardFlipped]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ height: '100%' }}
      camera={{ position: [0, 9.5, -13.5], fov: 45, near: 0.1, far: 100 }}
    >
      <CameraRig />
      <color attach="background" args={['#1b1712']} />
      <fog attach="fog" args={['#1b1712', 30, 52]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6e5', '#1b1712', 0.45]} />

      {/* Key light (casts the shadows) */}
      <directionalLight
        position={[7, 13, -7]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />

      {/* Soft fill from the opposite side so black pieces do not turn into
          silhouettes. */}
      <directionalLight position={[-8, 8, 6]} intensity={0.5} color="#cfd8ff" />
      <pointLight position={[0, 6, -6]} intensity={18} distance={22} color="#ffcf9e" />

      <Table />

      {/* The whole board rotates 180° when flipped; camera stays put. */}
      <group rotation={[0, boardFlipped ? Math.PI : 0, 0]}>
        <ChessBoard
          fen={currentFen}
          selectedSquare={currentSelectedSquare}
          hoveredSquare={hoveredSquare}
          lastMove={currentLastMove}
          checkSquare={currentCheckSquare}
          legalMoves={currentLegalMoves}
          onSquareClick={onSquareClick}
          onSquareHover={setHovered}
          onSquareUnhover={() => setHovered(null)}
        />
        <PieceManager
          fen={currentFen}
          selectedSquare={currentSelectedSquare}
          hoveredSquare={hoveredSquare}
          lastMove={currentLastMove}
          animateMoves={!analysisMode}
          onSquareClick={onSquareClick}
          onSquareHover={setHovered}
          onSquareUnhover={() => setHovered(null)}
        />
      </group>

      {labels}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        minDistance={6}
        maxDistance={40}
        // Polar angle is measured from straight above: 0 would be top-down and
        // PI/2 is table height. Keeping it below ~65 deg stops the view from
        // degenerating into an unreadable sliver (and can never go under the
        // table, which would need an angle >= PI/2).
        minPolarAngle={0.16}
        maxPolarAngle={(65 * Math.PI) / 180}
      />
    </Canvas>
  );
}
