type PromotionPieceType = 'q' | 'r' | 'b' | 'n';

type PromotionModalProps = {
  isOpen: boolean;
  color: 'w' | 'b';
  onPromote: (piece: PromotionPieceType) => void;
  onCancel: () => void;
};

const PIECE_TYPES: PromotionPieceType[] = ['q', 'r', 'b', 'n'];
const PIECE_LABELS: Record<PromotionPieceType, string> = {
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
};

export function PromotionModal({ isOpen, color, onPromote, onCancel }: PromotionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="promotion-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Pawn Promotion"
    >
      <div className="promotion-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Promote Pawn</h3>
        <p>Choose a piece to promote to:</p>
        <div className="promotion-options">
          {PIECE_TYPES.map((type) => (
            <button
              key={type}
              className="promotion-option"
              onClick={() => onPromote(type)}
              aria-label={`Promote to ${PIECE_LABELS[type]}`}
            >
              <PromotionPieceIcon color={color} type={type} />
              <span>{PIECE_LABELS[type]}</span>
            </button>
          ))}
        </div>
        <button className="promotion-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function PromotionPieceIcon({ color, type }: { color: 'w' | 'b'; type: PromotionPieceType }) {
  const isWhite = color === 'w';
  const unicode = {
    w: { q: '♕', r: '♖', b: '♗', n: '♘' },
    b: { q: '♛', r: '♜', b: '♝', n: '♞' },
  };
  return <span className="piece-unicode" style={{ color: isWhite ? '#e0e0e0' : '#333' }}>{unicode[color][type]}</span>;
}