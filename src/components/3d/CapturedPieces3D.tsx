import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useGameInteraction } from '@/engine/useGameInteraction';
import { useAnalysis } from '@/analysis/context';
import { useTheme } from '@/theme/context';
import { getWoodTexture } from '@/theme/textures';
import { PieceModel } from './PieceModel';

const PIECE_TYPES = ['p', 'n', 'b', 'r', 'q'] as const;
type PieceType = (typeof PIECE_TYPES)[number];

/**
 * Captured trays stay hidden while analysis mode is open. Flip this constant if
 * you ever want them visible there too.
 */
const HIDE_IN_ANALYSIS_MODE = true;

// The shelf is an extension of the main table, so it uses the same top height.
const TABLE_TOP = -0.89;
const SHELF_WIDTH = 1.4;
const SHELF_DEPTH = 4.6;
const SHELF_THICKNESS = 0.35;
const SHELF_CENTER_X = 5.8; // 5.1 .. 6.5, just past the board lip

// Two shallow trays side by side on the left side of the board.
const TRAY_WIDTH = 1.2;
const TRAY_DEPTH = 1.95;
const TRAY_GAP = 0.14;
const TRAY_CENTER_Z = (TRAY_DEPTH + TRAY_GAP) / 2;
const TRAY_FLOOR = 0.1;
const TRAY_WALL = 0.07;
const TRAY_WALL_HEIGHT = 0.14;

const SHELF_TOP = TABLE_TOP;
const TRAY_FLOOR_TOP = SHELF_TOP + TRAY_FLOOR;

// Display-only pieces: smaller than the pieces on the board.
const PIECE_SCALE = 0.55;
const SLOT_X = [-0.34, 0, 0.34];
const SLOT_Z = [-0.72, -0.36, 0, 0.36, 0.72];
const SLOTS_PER_TRAY = SLOT_X.length * SLOT_Z.length;

function groupCaptured(pieces: string[]) {
  const counts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  pieces.forEach((p) => {
    if (p in counts) counts[p as PieceType]++;
  });
  return counts;
}

function CapturedTray({
  centerZ,
  color,
  counts,
}: {
  centerZ: number;
  color: 'w' | 'b';
  counts: Record<PieceType, number>;
}) {
  const { palette } = useTheme();

  const pieces = useMemo(() => {
    const out: PieceType[] = [];
    PIECE_TYPES.forEach((type) => {
      for (let i = 0; i < counts[type]; i++) out.push(type);
    });
    return out;
  }, [counts]);

  const walls: Array<{ position: [number, number, number]; size: [number, number, number] }> = [
    {
      position: [SHELF_CENTER_X - TRAY_WIDTH / 2 + TRAY_WALL / 2, TRAY_FLOOR_TOP + TRAY_WALL_HEIGHT / 2, centerZ],
      size: [TRAY_WALL, TRAY_WALL_HEIGHT, TRAY_DEPTH],
    },
    {
      position: [SHELF_CENTER_X + TRAY_WIDTH / 2 - TRAY_WALL / 2, TRAY_FLOOR_TOP + TRAY_WALL_HEIGHT / 2, centerZ],
      size: [TRAY_WALL, TRAY_WALL_HEIGHT, TRAY_DEPTH],
    },
    {
      position: [SHELF_CENTER_X, TRAY_FLOOR_TOP + TRAY_WALL_HEIGHT / 2, centerZ - TRAY_DEPTH / 2 + TRAY_WALL / 2],
      size: [TRAY_WIDTH, TRAY_WALL_HEIGHT, TRAY_WALL],
    },
    {
      position: [SHELF_CENTER_X, TRAY_FLOOR_TOP + TRAY_WALL_HEIGHT / 2, centerZ + TRAY_DEPTH / 2 - TRAY_WALL / 2],
      size: [TRAY_WIDTH, TRAY_WALL_HEIGHT, TRAY_WALL],
    },
  ];

  return (
    <group>
      <RoundedBox
        args={[TRAY_WIDTH, TRAY_FLOOR, TRAY_DEPTH]}
        radius={0.045}
        smoothness={3}
        position={[SHELF_CENTER_X, TRAY_FLOOR_TOP - TRAY_FLOOR / 2, centerZ]}
        receiveShadow
        castShadow
      >
        <meshPhysicalMaterial
          color={palette.frame.color}
          roughness={palette.frame.roughness}
          metalness={palette.frame.metalness}
          clearcoat={palette.frame.clearcoat}
          clearcoatRoughness={palette.frame.clearcoatRoughness}
          envMapIntensity={palette.frame.envMapIntensity}
        />
      </RoundedBox>

      {walls.map((wall, index) => (
        <mesh key={index} position={wall.position} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshPhysicalMaterial
            color={palette.inlay.color}
            emissive={palette.inlay.emissive}
            emissiveIntensity={palette.inlay.emissiveIntensity}
            metalness={palette.inlay.metalness}
            roughness={palette.inlay.roughness}
            envMapIntensity={1.1}
          />
        </mesh>
      ))}

      {pieces.map((type, index) => {
        const slot = index % SLOTS_PER_TRAY;
        const layer = Math.floor(index / SLOTS_PER_TRAY);
        const col = slot % SLOT_X.length;
        const row = Math.floor(slot / SLOT_X.length);
        return (
          <group
            key={type + '-' + index}
            position={[
              SHELF_CENTER_X + SLOT_X[col],
              TRAY_FLOOR_TOP + layer * 0.02,
              centerZ + SLOT_Z[row],
            ]}
            scale={[PIECE_SCALE, PIECE_SCALE, PIECE_SCALE]}
          >
            <PieceModel
              color={color}
              type={type}
              position={[0, 0, 0]}
              isInteractive={false}
              showShadow={true}
              onPointerOver={() => {}}
              onPointerOut={() => {}}
              onPointerDown={() => {}}
            />
          </group>
        );
      })}
    </group>
  );
}

export function CapturedPieces3D() {
  const { metrics, showCaptured } = useGameInteraction();
  const analysis = useAnalysis();
  const { palette } = useTheme();
  const { captured } = metrics;

  const whiteCapturedCounts = useMemo(() => groupCaptured(captured.white), [captured.white]);
  const blackCapturedCounts = useMemo(() => groupCaptured(captured.black), [captured.black]);

  const shelfMap = useMemo(
    () => (palette.table.texture ? getWoodTexture('table', palette.table.texture) : null),
    [palette],
  );

  if (!showCaptured) return null;
  if (HIDE_IN_ANALYSIS_MODE && analysis.enabled) return null;

  return (
    <group>
      {/* Shelf attached to the left edge of the table. */}
      <RoundedBox
        args={[SHELF_WIDTH, SHELF_THICKNESS, SHELF_DEPTH]}
        radius={0.06}
        smoothness={3}
        position={[SHELF_CENTER_X, SHELF_TOP - SHELF_THICKNESS / 2, 0]}
        receiveShadow
        castShadow
      >
        <meshPhysicalMaterial
          color={shelfMap ? '#ffffff' : palette.table.color}
          map={shelfMap ?? undefined}
          roughness={palette.table.roughness}
          metalness={palette.table.metalness}
          clearcoat={palette.table.clearcoat}
          clearcoatRoughness={palette.table.clearcoatRoughness}
          envMapIntensity={palette.table.envMapIntensity}
        />
      </RoundedBox>

      {/* White's captures sit nearer the camera; black's sit behind them. */}
      <CapturedTray centerZ={-TRAY_CENTER_Z} color="b" counts={blackCapturedCounts} />
      <CapturedTray centerZ={TRAY_CENTER_Z} color="w" counts={whiteCapturedCounts} />
    </group>
  );
}
