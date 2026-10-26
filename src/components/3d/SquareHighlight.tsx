const SELECT_COLOR = 0x4ade80;   // green
const LAST_MOVE_COLOR = 0xfbbf24; // amber
const CHECK_COLOR = 0xef4444;    // red

// Tiles are TILE_HEIGHT thick and centered on y = 0, so overlays must sit just
// above the top face (+0.06) to stay visible.
const OVERLAY_Y = 0.07;

type SquareHighlightProps = {
  kind: 'select' | 'last-move' | 'check';
};

export function SquareHighlight({ kind }: SquareHighlightProps) {
  // Since this is rendered as a child of the Tile mesh (which is already at the correct position),
  // we just need a local position offset. The square and boardFlipped props are not needed
  // for positioning since the parent Tile handles that.
  // We keep them for potential future use or debugging.

  const colorMap = {
    select: SELECT_COLOR,
    'last-move': LAST_MOVE_COLOR,
    check: CHECK_COLOR,
  };

  return (
    <mesh
      position={[0, OVERLAY_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.32, 0.46, 32]} />
      <meshBasicMaterial
        color={colorMap[kind]}
        transparent
        opacity={kind === 'check' ? 0.45 : 0.6}
      />
    </mesh>
  );
}