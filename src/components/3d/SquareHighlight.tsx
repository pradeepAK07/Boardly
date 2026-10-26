import { useTheme } from "@/theme/context";

// Tiles are TILE_HEIGHT thick and centered on y = 0, so overlays must sit just
// above the top face (+0.06) to stay visible.
const OVERLAY_Y = 0.07;
const WASH_Y = 0.064;

type SquareHighlightProps = {
  kind: "select" | "last-move" | "check" | "suggest" | "legal";
};

export function SquareHighlight({ kind }: SquareHighlightProps) {
  const { palette } = useTheme();
  const highlights = palette.highlights;

  // The engine suggestion and legal-move hints are square washes rather than
  // rings: the tile keeps its material (important for glass) and the arrow or
  // move marker stays the primary cue.
  if (kind === "suggest" || kind === "legal") {
    const style = kind === "suggest" ? highlights.suggest : highlights.legal;
    return (
      <mesh
        position={[0, kind === "suggest" ? OVERLAY_Y + 0.004 : WASH_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.94, 0.94]} />
        <meshBasicMaterial
          color={style.color}
          transparent
          opacity={style.opacity}
          depthWrite={false}
        />
      </mesh>
    );
  }

  const style =
    kind === "select"
      ? highlights.select
      : kind === "last-move"
        ? highlights.lastMove
        : highlights.check;

  return (
    <mesh position={[0, OVERLAY_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.32, 0.46, 32]} />
      <meshBasicMaterial
        color={style.color}
        transparent
        opacity={style.opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
