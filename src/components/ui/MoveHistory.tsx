import { useGameInteraction } from '@/engine/useGameInteraction';

export function MoveHistory() {
  const { metrics, navigateTo, undoMove } = useGameInteraction();
  const { history, sanHistory, turn, turnLabel } = metrics;

  const formatMove = (index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    const move = history[index];
    const san =
      sanHistory[index] ??
      `${move.from}-${move.to}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
    return { moveNumber, isWhiteMove, san };
  };

  const groupedMoves = history.reduce(
    (acc: Record<number, { white: string; black: string }>, _move, index) => {
      const { moveNumber, isWhiteMove, san } = formatMove(index);
      if (!acc[moveNumber]) acc[moveNumber] = { white: '', black: '' };
      if (isWhiteMove) acc[moveNumber].white = san;
      else acc[moveNumber].black = san;
      return acc;
    },
    {},
  );

  const moveNumbers = Object.keys(groupedMoves).map(Number).sort((a, b) => a - b);
  const currentMoveIndex = history.length - 1;

  return (
    <aside className="move-history-panel">
      <div className="move-history-header">
        <h3>Move History</h3>
        <div className="move-history-controls">
          <button onClick={undoMove} disabled={history.length === 0} className="undo-btn" title="Undo Move">
            ↶ Undo
          </button>
        </div>
      </div>
      <div className="move-history-list">
        {moveNumbers.length === 0 && <p className="no-moves">No moves yet</p>}
        {moveNumbers.map((moveNum) => {
          const { white, black } = groupedMoves[moveNum];
          const whiteIndex = (moveNum - 1) * 2;
          const blackIndex = whiteIndex + 1;
          return (
            <div key={moveNum} className="move-row">
              <span className="move-number">{moveNum}.</span>
              <button
                className={`move-item${currentMoveIndex === whiteIndex ? ' active' : ''}`}
                onClick={() => navigateTo(whiteIndex + 1)}
                disabled={whiteIndex >= history.length}
              >
                {white}
              </button>
              <button
                className={`move-item${currentMoveIndex === blackIndex ? ' active' : ''}`}
                onClick={() => navigateTo(blackIndex + 1)}
                disabled={blackIndex >= history.length}
              >
                {black}
              </button>
            </div>
          );
        })}
        <div className="current-turn-indicator">
          <span className={`turn-dot ${turn}`}></span>
          {turnLabel} to move
        </div>
      </div>
    </aside>
  );
}
