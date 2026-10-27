import { useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Text } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BoardLayer } from './BoardLayer';
import { Table } from './Table';
import { CapturedPieces3D } from './CapturedPieces3D';
import { boardToWorld } from '@/engine/boardMath';
import { CAMERA_ELEVATION, fitCameraDistance } from '@/engine/cameraMath';
import { useGameInteraction } from '@/engine/useGameInteraction';
import { useAnalysis } from '@/analysis/context';
import { useTheme } from '@/theme/context';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Keeps the renderer on the filmic curve each theme was graded against. */
function RendererSettings({ exposure }: { exposure: number }) {
  useFrame(({ gl }) => {
    if (gl.toneMapping !== ACESFilmicToneMapping) {
      gl.toneMapping = ACESFilmicToneMapping;
    }
    if (gl.toneMappingExposure !== exposure) {
      gl.toneMappingExposure = exposure;
    }
    if (gl.outputColorSpace !== SRGBColorSpace) {
      gl.outputColorSpace = SRGBColorSpace;
    }
  });

  return null;
}

/**
 * Small studio rig built from emissive planes. It gives the wood and glass
 * materials something to reflect without shipping an HDR file, and it is
 * rebuilt (keyed) whenever the theme changes.
 */
function StudioEnvironment({ theme }: { theme: string }) {
  const { palette } = useTheme();

  return (
    <Environment key={theme} resolution={256} frames={1}>
      <Lightformer
        form="rect"
        color={palette.env.key.color}
        intensity={palette.env.key.intensity}
        position={[0, 9, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[9, 9, 1]}
      />
      <Lightformer
        form="rect"
        color={palette.env.fill.color}
        intensity={palette.env.fill.intensity}
        position={[-9, 4, 3]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[7, 5, 1]}
      />
      <Lightformer
        form="rect"
        color={palette.env.rim.color}
        intensity={palette.env.rim.intensity}
        position={[9, 5, -5]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[7, 4, 1]}
      />
      <Lightformer
        form="rect"
        color={palette.env.rim.color}
        intensity={palette.env.rim.intensity * 0.7}
        position={[0, 4, -9]}
        rotation={[0, 0, 0]}
        scale={[8, 3, 1]}
      />
    </Environment>
  );
}

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
    metrics,
  } = useGameInteraction();

  const {
    enabled: analysisMode,
    viewFen,
    viewLastMove,
    viewCheckSquare,
    currentEval,
  } = useAnalysis();

  const { palette, theme } = useTheme();

  // The engine's preferred move for the viewed position. Terminal positions
  // report no best move, so the arrow disappears on mate/stalemate.
  const suggestedMove = useMemo(() => {
    if (!analysisMode) return null;
    const uci = currentEval?.bestMove;
    if (!uci || uci.length < 4) return null;
    return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  }, [analysisMode, currentEval?.bestMove]);

  // In analysis mode the board is a read-only view of the selected ply. The
  // live game (and its legal moves) must not leak into that position.
  const currentFen = analysisMode && viewFen ? viewFen : metrics.fen;
  const currentLastMove = analysisMode ? viewLastMove : lastMove;
  const currentCheckSquare = analysisMode ? viewCheckSquare : checkSquare;
  const currentLegalMoves = analysisMode ? [] : legalMoves;
  const currentSelectedSquare = analysisMode ? null : selectedSquare;

  // OrbitControls owns the camera; the drag hook disables it for the duration
  // of a piece gesture so the view cannot drift while dragging.
  const orbitRef = useRef<OrbitControlsImpl>(null);

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
          color={palette.labelColor}
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
          color={palette.labelColor}
          anchorX="center"
          anchorY="middle"
        >
          {rank + 1}
        </Text>,
      );
    }

    return out;
  }, [boardFlipped, palette.labelColor]);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ height: '100%' }}
      camera={{ position: [0, 9.5, -13.5], fov: 45, near: 0.1, far: 100 }}
    >
      <RendererSettings exposure={palette.exposure} />
      <CameraRig />
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog.color, palette.fog.near, palette.fog.far]} />

      <ambientLight intensity={palette.lights.ambient} />
      <hemisphereLight
        args={[
          palette.lights.hemi.sky,
          palette.lights.hemi.ground,
          palette.lights.hemi.intensity,
        ]}
      />

      {/* Key light (casts the shadows) */}
      <directionalLight
        position={palette.lights.key.position}
        intensity={palette.lights.key.intensity}
        color={palette.lights.key.color}
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
      <directionalLight
        position={palette.lights.fill.position}
        intensity={palette.lights.fill.intensity}
        color={palette.lights.fill.color}
      />
      <pointLight
        position={palette.lights.rim.position}
        intensity={palette.lights.rim.intensity}
        distance={palette.lights.rim.distance}
        color={palette.lights.rim.color}
      />

      <StudioEnvironment theme={theme} />

      <Table />

      <CapturedPieces3D />

      {/* The whole board rotates 180° when flipped; camera stays put. */}
      <BoardLayer
        fen={currentFen}
        selectedSquare={currentSelectedSquare}
        hoveredSquare={hoveredSquare}
        lastMove={currentLastMove}
        checkSquare={currentCheckSquare}
        suggestedMove={suggestedMove}
        legalMoves={currentLegalMoves}
        boardFlipped={boardFlipped}
        analysisMode={analysisMode}
        orbitRef={orbitRef}
      />

      {labels}

      <OrbitControls
        ref={orbitRef}
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
