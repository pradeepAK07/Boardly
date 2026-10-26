import { BOARD_EDGE, TILE_HEIGHT } from "../../engine/boardMath";

/**
 * Solid wooden base under the chess board. The board tiles are TILE_HEIGHT
 * thick and centered on y = 0, so the plinth's top face sits exactly at the
 * bottom of the tiles (-TILE_HEIGHT / 2). This hides the tile undersides and
 * makes the board read as an actual table from every allowed camera angle.
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

export function Table() {
  return (
    <group>
      {/* Main board frame / plinth */}
      <mesh position={[0, PLINTH_CENTER_Y, 0]} receiveShadow>
        <boxGeometry args={[PLINTH_WIDTH, PLINTH_HEIGHT, PLINTH_WIDTH]} />
        <meshStandardMaterial
          color={0x6a4a30}
          roughness={0.62}
          metalness={0.08}
        />
      </mesh>

      {/* Beveled lip around the plinth */}
      <mesh position={[0, LIP_CENTER_Y, 0]} receiveShadow>
        <boxGeometry args={[LIP_WIDTH, LIP_HEIGHT, LIP_WIDTH]} />
        <meshStandardMaterial
          color={0x4c3523}
          roughness={0.55}
          metalness={0.12}
        />
      </mesh>

      {/* Table top slab */}
      <mesh position={[0, TABLE_CENTER_Y, 0]} receiveShadow>
        <boxGeometry args={[TABLE_WIDTH, TABLE_HEIGHT, TABLE_WIDTH]} />
        <meshStandardMaterial
          color={0x3f2b1c}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
