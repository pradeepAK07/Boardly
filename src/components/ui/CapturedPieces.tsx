import { useGameInteraction } from '@/engine/useGameInteraction';

const PIECE_TYPES = ['p', 'n', 'b', 'r', 'q'] as const;
type PieceType = typeof PIECE_TYPES[number];

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

const GLYPHS: Record<PieceType, { w: string; b: string }> = {
  p: { w: '♙', b: '♟' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  r: { w: '♖', b: '♜' },
  q: { w: '♕', b: '♛' },
};

export function CapturedPieces() {
  const { metrics } = useGameInteraction();
  const { captured, turn } = metrics;

  const groupCaptured = (pieces: string[]) => {
    const counts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    pieces.forEach((p) => {
      if (p in counts) counts[p as PieceType]++;
    });
    return counts;
  };

  const whiteCounts = groupCaptured(captured.white);
  const blackCounts = groupCaptured(captured.black);

  const totalWhiteValue = Object.entries(whiteCounts).reduce((sum, [type, count]) => sum + PIECE_VALUES[type as PieceType] * count, 0);
  const totalBlackValue = Object.entries(blackCounts).reduce((sum, [type, count]) => sum + PIECE_VALUES[type as PieceType] * count, 0);

  const renderCapturedRow = (counts: Record<PieceType, number>, color: 'w' | 'b', label: string, totalValue: number) => (
    <div className="captured-row">
      <div className="captured-label">
        <span>{label}</span>
        <span className="material-value">({totalValue})</span>
      </div>
      <div className="captured-pieces">
        {PIECE_TYPES.map((type) => {
          const count = counts[type];
          if (count === 0) return null;
          return (
            <span key={type} className="captured-piece-group">
              <span className={`captured-glyph ${color}`} aria-hidden="true">
                {GLYPHS[type][color]}
              </span>
              {count > 1 && <span className="piece-count">×{count}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );

  // Show opponent's captured pieces at top (pieces we captured)
  const topColor = turn === 'w' ? 'b' : 'w';

  return (
    <aside className="captured-pieces-panel">
      {topColor === 'b' ? (
        <>
          {renderCapturedRow(blackCounts, 'b', 'Black Captured', totalBlackValue)}
          <div className="captured-divider" />
          {renderCapturedRow(whiteCounts, 'w', 'White Captured', totalWhiteValue)}
        </>
      ) : (
        <>
          {renderCapturedRow(whiteCounts, 'w', 'White Captured', totalWhiteValue)}
          <div className="captured-divider" />
          {renderCapturedRow(blackCounts, 'b', 'Black Captured', totalBlackValue)}
        </>
      )}
    </aside>
  );
}
