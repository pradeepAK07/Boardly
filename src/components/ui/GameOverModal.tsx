import { useGameInteraction } from '@/engine/useGameInteraction';

type GameOverModalProps = {
  isOpen: boolean;
  onNewGame: () => void;
  onClose: () => void;
};

export function GameOverModal({ isOpen, onNewGame, onClose }: GameOverModalProps) {
  const { metrics } = useGameInteraction();
  const { inCheckmate, inDraw, inStalemate, inCheck, turnLabel } = metrics;

  if (!isOpen) return null;

  let title = '';
  let message = '';
  let icon = '';

  if (inCheckmate) {
    title = 'Checkmate!';
    message = `${turnLabel === 'White' ? 'Black' : 'White'} wins by checkmate!`;
    icon = '🏆';
  } else if (inStalemate) {
    title = 'Stalemate';
    message = 'Game drawn by stalemate.';
    icon = '🤝';
  } else if (inDraw) {
    title = 'Draw';
    message = 'Game drawn.';
    icon = '🤝';
  } else if (inCheck) {
    title = 'Check!';
    message = `${turnLabel} is in check!`;
    icon = '⚠️';
  }

  return (
    <div className="game-over-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Game Over">
      <div className="game-over-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-over-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="game-over-buttons">
          <button className="new-game-btn" onClick={onNewGame}>
            New Game
          </button>
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}