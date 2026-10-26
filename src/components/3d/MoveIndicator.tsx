const MOVE_COLOR = 0x4ade80; // green - matches selection ring
const MOVE_CAPTURE_COLOR = 0xf43f5e; // red for capture targets
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

  const color = isCapture ? MOVE_CAPTURE_COLOR : MOVE_COLOR;

  return (
    <>
      <mesh
        position={[0, MARKER_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[DOT_RADIUS, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8} // more visible
        />
      </mesh>
      <mesh
        position={[0, MARKER_Y + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[RING_OUTER, RING_INNER, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5} // more visible
        />
      </mesh>
    </>
  );
}