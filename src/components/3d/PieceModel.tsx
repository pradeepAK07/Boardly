import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { ExtrudeGeometryOptions } from 'three';
import { Shape, Vector2 } from 'three';
import type { ChessPieceProps } from './ChessPiece';
import { useTheme } from '@/theme/context';
import { getBlobShadowTexture } from '@/theme/textures';

type PieceType = ChessPieceProps['type'];

/** Turn a list of [radius, height] points into a lathe profile. */
function profile(points: Array<[number, number]>): Vector2[] {
  return points.map(([x, y]) => new Vector2(x, y));
}

// ---------------------------------------------------------------------------
// Profiles. Each piece is built on y = 0 so the group origin sits on the tile.
// ---------------------------------------------------------------------------

const PAWN = profile([
  [0.0005, 0.0],
  [0.18, 0.0],
  [0.18, 0.03],
  [0.19, 0.042],
  [0.165, 0.062],
  [0.115, 0.08],
  [0.09, 0.105],
  [0.082, 0.14],
  [0.08, 0.185],
  [0.092, 0.212],
  [0.112, 0.23],
  [0.1, 0.245],
  [0.062, 0.258],
  [0.07, 0.272],
  [0.092, 0.292],
  [0.108, 0.322],
  [0.113, 0.355],
  [0.108, 0.39],
  [0.094, 0.425],
  [0.068, 0.462],
  [0.036, 0.492],
  [0.0005, 0.51],
]);

const ROOK = profile([
  [0.0005, 0.0],
  [0.225, 0.0],
  [0.225, 0.035],
  [0.235, 0.048],
  [0.205, 0.068],
  [0.155, 0.082],
  [0.13, 0.1],
  [0.12, 0.125],
  [0.14, 0.15],
  [0.118, 0.17],
  [0.112, 0.2],
  [0.135, 0.225],
  [0.112, 0.245],
  [0.108, 0.39],
  [0.13, 0.412],
  [0.152, 0.43],
  [0.152, 0.455],
  [0.158, 0.48],
  [0.158, 0.5],
  [0.105, 0.495],
  [0.0005, 0.49],
]);

const BISHOP = profile([
  [0.0005, 0.0],
  [0.215, 0.0],
  [0.215, 0.035],
  [0.225, 0.048],
  [0.195, 0.07],
  [0.15, 0.086],
  [0.122, 0.108],
  [0.108, 0.14],
  [0.125, 0.168],
  [0.1, 0.19],
  [0.088, 0.23],
  [0.082, 0.28],
  [0.09, 0.31],
  [0.118, 0.335],
  [0.108, 0.355],
  [0.085, 0.375],
  [0.1, 0.42],
  [0.14, 0.47],
  [0.152, 0.51],
  [0.143, 0.55],
  [0.12, 0.6],
  [0.09, 0.65],
  [0.058, 0.7],
  [0.03, 0.735],
  [0.0005, 0.75],
]);

const QUEEN = profile([
  [0.0005, 0.0],
  [0.235, 0.0],
  [0.235, 0.038],
  [0.246, 0.052],
  [0.212, 0.074],
  [0.162, 0.09],
  [0.132, 0.114],
  [0.116, 0.148],
  [0.134, 0.176],
  [0.108, 0.198],
  [0.094, 0.245],
  [0.088, 0.32],
  [0.096, 0.365],
  [0.124, 0.395],
  [0.112, 0.418],
  [0.092, 0.44],
  [0.1, 0.48],
  [0.124, 0.54],
  [0.158, 0.6],
  [0.178, 0.65],
  [0.182, 0.672],
  [0.15, 0.668],
  [0.105, 0.66],
  [0.0005, 0.655],
]);

const KING = profile([
  [0.0005, 0.0],
  [0.245, 0.0],
  [0.245, 0.04],
  [0.256, 0.055],
  [0.22, 0.078],
  [0.168, 0.094],
  [0.138, 0.118],
  [0.12, 0.152],
  [0.14, 0.182],
  [0.112, 0.205],
  [0.098, 0.255],
  [0.092, 0.34],
  [0.1, 0.39],
  [0.13, 0.42],
  [0.116, 0.445],
  [0.096, 0.468],
  [0.104, 0.51],
  [0.13, 0.575],
  [0.166, 0.64],
  [0.186, 0.695],
  [0.19, 0.718],
  [0.155, 0.712],
  [0.108, 0.702],
  [0.0005, 0.695],
]);

const KNIGHT_BASE = profile([
  [0.0005, 0.0],
  [0.225, 0.0],
  [0.225, 0.03],
  [0.235, 0.044],
  [0.21, 0.062],
  [0.18, 0.08],
  [0.172, 0.105],
  [0.182, 0.128],
  [0.178, 0.15],
  [0.145, 0.162],
  [0.0005, 0.16],
]);

const LATHE_ARGS: Record<PieceType, [Vector2[], number]> = {
  p: [PAWN, 40],
  r: [ROOK, 40],
  b: [BISHOP, 44],
  q: [QUEEN, 56],
  k: [KING, 56],
  n: [KNIGHT_BASE, 40],
};

const KNIGHT_DEPTH = 0.19;
const KNIGHT_Y = 0.125;

/** Horse-head silhouette (profile view), extruded across the board. */
const KNIGHT_SHAPE = (() => {
  const shape = new Shape();
  shape.moveTo(-0.17, 0);
  shape.bezierCurveTo(-0.21, 0.1, -0.2, 0.26, -0.11, 0.36);
  shape.bezierCurveTo(-0.06, 0.42, 0.0, 0.49, 0.06, 0.52);
  shape.lineTo(0.095, 0.585); // ear tip
  shape.lineTo(0.135, 0.525); // ear base
  shape.bezierCurveTo(0.2, 0.52, 0.245, 0.47, 0.275, 0.415);
  shape.bezierCurveTo(0.315, 0.36, 0.33, 0.305, 0.305, 0.27); // nose
  shape.lineTo(0.245, 0.255); // mouth
  shape.lineTo(0.265, 0.195); // chin
  shape.lineTo(0.205, 0.145); // jaw
  shape.lineTo(0.175, 0); // throat
  shape.closePath();
  return shape;
})();

const KNIGHT_EXTRUDE: ExtrudeGeometryOptions = {
  depth: KNIGHT_DEPTH,
  bevelEnabled: true,
  bevelThickness: 0.012,
  bevelSize: 0.014,
  bevelSegments: 2,
  curveSegments: 24,
};

const ROOK_CRENELS = 6;
const QUEEN_POINTS = 8;

/**
 * A real chess piece built from a turned profile (lathe) plus the few parts
 * that a lathe cannot express: rook battlements, the queen's crown, the king's
 * cross and the knight's horse head.
 *
 * Pieces are the pick targets: a click on the visible model selects the square
 * it actually occupies. Propagation is stopped on the wrapper group so the ray
 * cannot travel on to a tile behind the piece.
 *
 * Hover/selection feedback is a scale bump plus an emissive glow, never a
 * vertical lift: lifting a selected piece is enough to hide the centre of the
 * square directly behind it, which is often the move the player wants to play.
 */
export function PieceModel({
  color,
  type,
  position,
  isHovered = false,
  isSelected = false,
  animatedPosition,
  animatedScale,
  isInteractive = true,
  onPointerOver,
  onPointerOut,
  onPointerDown,
}: ChessPieceProps & { position: [number, number, number] }) {
  const isWhite = color === 'w';
  const { palette } = useTheme();

  const scale = useMemo(() => {
    const boost = (isHovered ? 0.05 : 0) + (isSelected ? 0.08 : 0);
    return (1 + boost) * (animatedScale ?? 1);
  }, [isHovered, isSelected, animatedScale]);

  const x = animatedPosition ? animatedPosition[0] : position[0];
  // The group origin is the base of the piece, so it sits directly on the tile.
  const y = animatedPosition ? animatedPosition[1] : position[1];
  const z = animatedPosition ? animatedPosition[2] : position[2];

  const interactionProps = isInteractive
    ? {
        onPointerOver: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onPointerOver();
        },
        onPointerOut: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onPointerOut();
        },
        onPointerDown: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onPointerDown();
        },
      }
    : {};

  const surface = isWhite ? palette.pieces.white : palette.pieces.black;
  const highlights = palette.highlights;

  const material = (
    <meshPhysicalMaterial
      color={surface.color}
      roughness={surface.roughness}
      metalness={surface.metalness}
      clearcoat={surface.clearcoat}
      clearcoatRoughness={surface.clearcoatRoughness}
      envMapIntensity={surface.envMapIntensity}
      transmission={surface.transmission}
      thickness={surface.thickness}
      ior={surface.ior}
      attenuationColor={surface.attenuationColor}
      attenuationDistance={surface.attenuationDistance}
      emissive={
        isSelected
          ? highlights.pieceSelectEmissive
          : isHovered
            ? highlights.pieceHoverEmissive
            : '#000000'
      }
      emissiveIntensity={
        isSelected
          ? highlights.pieceSelectIntensity
          : isHovered
            ? highlights.pieceHoverIntensity
            : 0
      }
    />
  );

  // Keep the soft contact shadow on the board even while a piece is in flight.
  const shadowY = position[1] - y + 0.004;

  return (
    <group position={[x, y, z]} scale={[scale, scale, scale]} {...interactionProps}>
      {/* Soft contact shadow, drawn before the piece to ground it on the tile. */}
      <mesh
        position={[0, shadowY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial
          map={getBlobShadowTexture()}
          transparent
          opacity={palette.contactShadowOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Turned body of every piece. */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={LATHE_ARGS[type]} />
        {material}
      </mesh>

      {type === 'n' && (
        <mesh castShadow receiveShadow position={[0, KNIGHT_Y, -KNIGHT_DEPTH / 2]}>
          <extrudeGeometry args={[KNIGHT_SHAPE, KNIGHT_EXTRUDE]} />
          {material}
        </mesh>
      )}

      {type === 'r' &&
        Array.from({ length: ROOK_CRENELS }, (_, i) => {
          const angle = (i / ROOK_CRENELS) * Math.PI * 2;
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              position={[Math.cos(angle) * 0.118, 0.55, Math.sin(angle) * 0.118]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.078, 0.11, 0.078]} />
              {material}
            </mesh>
          );
        })}

      {type === 'q' && (
        <>
          {Array.from({ length: QUEEN_POINTS }, (_, i) => {
            const angle = (i / QUEEN_POINTS) * Math.PI * 2;
            return (
              <mesh
                key={i}
                castShadow
                receiveShadow
                position={[Math.cos(angle) * 0.158, 0.682, Math.sin(angle) * 0.158]}
              >
                <sphereGeometry args={[0.033, 12, 10]} />
                {material}
              </mesh>
            );
          })}
          <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.03, 0.038, 0.09, 16]} />
            {material}
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.79, 0]}>
            <sphereGeometry args={[0.06, 16, 12]} />
            {material}
          </mesh>
        </>
      )}

      {type === 'k' && (
        <>
          <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[0.052, 0.2, 0.052]} />
            {material}
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.832, 0]}>
            <boxGeometry args={[0.15, 0.052, 0.052]} />
            {material}
          </mesh>
        </>
      )}
    </group>
  );
}
