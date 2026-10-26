import { useMemo } from 'react';
import { BOARD_SURFACE_Y, squareToCoord, type Square } from '../../engine/boardMath';
import { useTheme } from '@/theme/context';

const SHAFT_RADIUS = 0.075;
const HEAD_RADIUS = 0.24;
const HEAD_LENGTH = 0.55;
/** Just above the tile top face, like the other overlays. */
const ARROW_Y = BOARD_SURFACE_Y + 0.09;

type SuggestionArrowProps = {
  from: string;
  to: string;
};

/**
 * Blue arrow for the engine's suggested move. Rendered inside the rotated
 * board group, so it flips together with the tiles and pieces.
 */
export function SuggestionArrow({ from, to }: SuggestionArrowProps) {
  const { palette } = useTheme();
  const style = palette.highlights.suggestion;

  const geometry = useMemo(() => {
    const start = squareToCoord(from as Square);
    const end = squareToCoord(to as Square);
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.hypot(dx, dz);
    if (distance === 0) return null;

    // Start a little away from the origin square's centre so the piece on it
    // is not completely covered, and scale the head down for short moves.
    const startInset = Math.min(0.26, distance * 0.35);
    const headLength = Math.min(HEAD_LENGTH, distance * 0.45);
    const shaftEnd = Math.max(startInset + 0.02, distance - headLength);

    return {
      x: start.x + (dx / distance) * startInset,
      z: start.z + (dz / distance) * startInset,
      angle: Math.atan2(dx, dz),
      shaftLength: shaftEnd - startInset,
      headCentre: shaftEnd + headLength / 2,
      headLength,
    };
  }, [from, to]);

  if (!geometry) return null;

  return (
    <group
      position={[geometry.x, ARROW_Y, geometry.z]}
      rotation={[0, geometry.angle, 0]}
    >
      <mesh
        position={[0, 0, geometry.shaftLength / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[SHAFT_RADIUS, SHAFT_RADIUS, geometry.shaftLength, 16]}
        />
        <meshBasicMaterial
          color={style.color}
          transparent
          opacity={style.opacity}
          depthWrite={false}
          toneMapped={style.toneMapped}
        />
      </mesh>
      <mesh
        position={[0, 0, geometry.headCentre]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[HEAD_RADIUS, geometry.headLength, 20]} />
        <meshBasicMaterial
          color={style.color}
          transparent
          opacity={Math.min(1, style.opacity + 0.05)}
          depthWrite={false}
          toneMapped={style.toneMapped}
        />
      </mesh>
    </group>
  );
}
