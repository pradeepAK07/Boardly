import './analysis.css';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Logistic mapping from centipawns to White's share of the bar.
 * 0 cp -> 50%, +200 -> ~68%, +1000 -> ~98%, mate -> ~99.6%.
 */
function whiteShare(whiteCp: number): number {
  const cp = clamp(whiteCp, -1500, 1500);
  return 100 / (1 + Math.exp(-0.00368208 * cp));
}

export function EvalBar({
  whiteCp,
  label,
  flipped = false,
  pending = false,
}: {
  /** White POV centipawns, mates folded to +/-100000. */
  whiteCp: number;
  label: string;
  /** Match the board orientation: White fills from the bottom by default. */
  flipped?: boolean;
  pending?: boolean;
}) {
  const share = whiteShare(whiteCp);

  return (
    <div
      className={`eval-bar${flipped ? ' eval-bar--flipped' : ''}${pending ? ' eval-bar--pending' : ''}`}
      role="meter"
      aria-label="Engine evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share)}
      title={`Evaluation: ${label}`}
    >
      <div className="eval-bar__white" style={{ height: `${share}%` }} />
      <span className="eval-bar__label">{label}</span>
    </div>
  );
}
