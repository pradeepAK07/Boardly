import { useTheme } from "@/theme/context";

const DOT_RADIUS = 0.35; // larger
const RING_OUTER = 0.42;
const RING_INNER = 0.48;
// Just above the tile top face (tile height 0.12, centered on y = 0).
const MARKER_Y = 0.065;

type MoveIndicatorProps = {
  isCapture: boolean;
};

export function MoveIndicator({ isCapture }: MoveIndicatorProps) {
  // Since this is rendered as a child of the Tile mesh (which is already at the correct position),
  // we just need a local position offset.
  const { palette } = useTheme();
  const style = isCapture
    ? palette.highlights.legalCapture
    : palette.highlights.legal;
  // The wash on the tile stays subtle; the dot and ring need more presence so
  // legal moves stay readable on both bright wood and frosted glass.
  const dotOpacity = Math.min(0.9, style.opacity * 3);
  const ringOpacity = Math.min(0.7, style.opacity * 2);

  return (
    <>
      <mesh position={[0, MARKER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[DOT_RADIUS, 32]} />
        <meshBasicMaterial
          color={style.color}
          transparent
          opacity={dotOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, MARKER_Y + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[RING_OUTER, RING_INNER, 32]} />
        <meshBasicMaterial
          color={style.color}
          transparent
          opacity={ringOpacity}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
