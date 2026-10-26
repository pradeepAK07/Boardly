import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import type { Texture } from "three";
import { BOARD_EDGE, TILE_HEIGHT } from "../../engine/boardMath";
import { useTheme } from "@/theme/context";
import { getWoodTexture } from "@/theme/textures";
import type { MaterialSurface } from "@/theme/themes";

/**
 * Solid base under the chess board. The board tiles are TILE_HEIGHT thick and
 * centered on y = 0, so the plinth's top face sits exactly at the bottom of the
 * tiles (-TILE_HEIGHT / 2). This hides the tile undersides and makes the board
 * read as an actual table from every allowed camera angle.
 */
const PLINTH_WIDTH = BOARD_EDGE + 1.3; // 9.3 -> 0.65 margin around the board
const PLINTH_HEIGHT = 0.55;
const PLINTH_TOP = -TILE_HEIGHT / 2; // -0.06
const PLINTH_CENTER_Y = PLINTH_TOP - PLINTH_HEIGHT / 2; // -0.335

const LIP_WIDTH = PLINTH_WIDTH + 0.55;
const LIP_HEIGHT = 0.28;
const LIP_TOP = PLINTH_TOP - PLINTH_HEIGHT; // -0.61
const LIP_CENTER_Y = LIP_TOP - LIP_HEIGHT / 2;

const TABLE_WIDTH = 10.4;
const TABLE_HEIGHT = 0.35;
const TABLE_TOP = LIP_TOP - LIP_HEIGHT;
const TABLE_CENTER_Y = TABLE_TOP - TABLE_HEIGHT / 2;

function surfaceProps(surface: MaterialSurface, map: Texture | null) {
  return {
    color: map ? "#ffffff" : surface.color,
    map: map ?? undefined,
    roughness: surface.roughness,
    metalness: surface.metalness,
    clearcoat: surface.clearcoat,
    clearcoatRoughness: surface.clearcoatRoughness,
    envMapIntensity: surface.envMapIntensity,
  };
}

export function Table() {
  const { palette } = useTheme();

  const frameMap = useMemo(
    () =>
      palette.frame.texture
        ? getWoodTexture("frame", palette.frame.texture)
        : null,
    [palette],
  );
  const tableMap = useMemo(
    () =>
      palette.table.texture
        ? getWoodTexture("table", palette.table.texture)
        : null,
    [palette],
  );

  return (
    <group>
      {/* Main board frame / plinth */}
      <RoundedBox
        args={[PLINTH_WIDTH, PLINTH_HEIGHT, PLINTH_WIDTH]}
        radius={0.09}
        smoothness={3}
        position={[0, PLINTH_CENTER_Y, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial {...surfaceProps(palette.frame, frameMap)} />
      </RoundedBox>

      {/* Metallic / brass rim peeking out around the board edge */}
      <RoundedBox
        args={[BOARD_EDGE + 0.34, 0.035, BOARD_EDGE + 0.34]}
        radius={0.012}
        smoothness={2}
        position={[0, PLINTH_TOP + 0.004, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color={palette.inlay.color}
          emissive={palette.inlay.emissive}
          emissiveIntensity={palette.inlay.emissiveIntensity}
          metalness={palette.inlay.metalness}
          roughness={palette.inlay.roughness}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
        />
      </RoundedBox>

      {/* Beveled lip around the plinth */}
      <RoundedBox
        args={[LIP_WIDTH, LIP_HEIGHT, LIP_WIDTH]}
        radius={0.07}
        smoothness={3}
        position={[0, LIP_CENTER_Y, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial {...surfaceProps(palette.table, tableMap)} />
      </RoundedBox>

      {/* Table top slab */}
      <RoundedBox
        args={[TABLE_WIDTH, TABLE_HEIGHT, TABLE_WIDTH]}
        radius={0.08}
        smoothness={3}
        position={[0, TABLE_CENTER_Y, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial {...surfaceProps(palette.table, tableMap)} />
      </RoundedBox>
    </group>
  );
}
