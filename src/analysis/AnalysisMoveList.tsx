import { useEffect, useMemo } from 'react';
import { useAnalysis } from './context';
import { formatEval, uciToSan } from './engine/uci';
import { QUALITY_GLYPH } from './classify';
import type { PositionEval, PositionNode } from './types';
import type { Quality } from './classify';
import './analysis.css';

export function AnalysisMoveList() {
  const {
    game,
    positions,
    viewIndex,
    currentEval,
    live,
    evals,
    goToPly,
    next,
    previous,
    qualityFor,
    analyzeAll,
    cancel,
    progress,
  } = useAnalysis();

  // Keyboard navigation. Inputs/textareas keep normal typing behaviour.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key === 'Home') {
        event.preventDefault();
        goToPly(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goToPly(positions.length - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, previous, goToPly, positions.length]);

  const rows = useMemo(() => {
    const map = new Map<number, { white?: PositionNode; black?: PositionNode }>();
    for (const position of positions.slice(1)) {
      const row = map.get(position.moveNumber) ?? {};
      if (position.color === 'w') row.white = position;
      else row.black = position;
      map.set(position.moveNumber, row);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [positions]);

  if (!game) {
    return (
      <aside className="move-history-panel analysis-moves">
        <div className="move-history-header">
          <h3>Analysis</h3>
        </div>
        <p className="no-moves">Import a PGN or fetch a Chess.com game to start.</p>
      </aside>
    );
  }

  const current = positions[viewIndex];
  const bestMoveSan = current ? uciToSan(current.fen, currentEval?.bestMove ?? null) : null;
  const currentLabel = currentEval ? formatEval(currentEval.score, current.turn) : '–';
  const currentKey = current ? current.fen.split(' ').slice(0, 4).join(' ') : '';
  const isSearching = !!live && !evals[currentKey];

  return (
    <aside className="move-history-panel analysis-moves">
      <div className="move-history-header">
        <h3>Analysis</h3>
        <div className="analysis-nav">
          <button onClick={() => goToPly(0)} disabled={viewIndex === 0} title="Start position">
            ⏮
          </button>
          <button onClick={previous} disabled={viewIndex === 0} title="Previous move">
            ◀
          </button>
          <button
            onClick={next}
            disabled={viewIndex >= positions.length - 1}
            title="Next move"
          >
            ▶
          </button>
          <button
            onClick={() => goToPly(positions.length - 1)}
            disabled={viewIndex >= positions.length - 1}
            title="Final position"
          >
            ⏭
          </button>
        </div>
      </div>

      <div className="analysis-game-meta">
        <span>
          {game.white ?? 'White'}
          {game.whiteRating ? ` (${game.whiteRating})` : ''} vs{' '}
          {game.black ?? 'Black'}
          {game.blackRating ? ` (${game.blackRating})` : ''}
        </span>
        {game.result && <strong>{game.result}</strong>}
      </div>

      <div className="move-history-list">
        {rows.length === 0 && <p className="no-moves">Start position only — nothing to step through.</p>}

        {rows.map(([number, row]) => (
          <div key={number} className="move-row">
            <span className="move-number">{number}.</span>
            <MoveCell
              node={row.white}
              active={row.white?.ply === viewIndex}
              onSelect={goToPly}
              evals={evals}
              qualityFor={qualityFor}
            />
            <MoveCell
              node={row.black}
              active={row.black?.ply === viewIndex}
              onSelect={goToPly}
              evals={evals}
              qualityFor={qualityFor}
            />
          </div>
        ))}
      </div>

      <div className="analysis-best">
        <div className="analysis-best__score">
          <span className="analysis-best__label">Eval</span>
          <strong className={currentEval && currentEval.whiteCp < 0 ? 'is-negative' : ''}>
            {currentLabel}
          </strong>
          {isSearching && <span className="analysis-spinner" aria-label="Analyzing" />}
        </div>
        {bestMoveSan && (
          <div className="analysis-best__move">
            Engine: <strong>{bestMoveSan}</strong>
            {currentEval && currentEval.depth > 0 && (
              <span className="analysis-depth">depth {currentEval.depth}</span>
            )}
          </div>
        )}
      </div>

      <div className="analysis-bulk">
        {progress ? (
          <>
            <progress value={progress.done} max={progress.total} />
            <span>
              {progress.done}/{progress.total}
            </span>
            <button onClick={cancel}>Stop</button>
          </>
        ) : (
          <button onClick={() => void analyzeAll()} disabled={positions.length < 2}>
            Analyze whole game
          </button>
        )}
      </div>
    </aside>
  );
}

function MoveCell({
  node,
  active,
  onSelect,
  evals,
  qualityFor,
}: {
  node?: PositionNode;
  active: boolean;
  onSelect: (ply: number) => void;
  evals: Record<string, PositionEval>;
  qualityFor: (position: PositionNode) => Quality | undefined;
}) {
  if (!node) return <span className="move-item move-item--empty" aria-hidden="true" />;

  const key = node.fen.split(' ').slice(0, 4).join(' ');
  const evaluation = evals[key];
  const quality = qualityFor(node);
  const glyph = quality ? QUALITY_GLYPH[quality] : '';

  return (
    <button
      className={`move-item move-item--analysis${active ? ' active' : ''}${quality ? ` move-item--${quality}` : ''}`}
      onClick={() => onSelect(node.ply)}
      aria-current={active ? 'step' : undefined}
      title={`${node.san}${evaluation ? ` · ${formatEval(evaluation.score, node.turn)}` : ''}`}
    >
      <span className="move-item__san">{node.san}</span>
      {evaluation && (
        <span className="move-eval">{formatEval(evaluation.score, node.turn)}</span>
      )}
      {glyph && <span className={`move-glyph move-glyph--${quality}`}>{glyph}</span>}
      {active && <span className="move-cursor" aria-hidden="true" />}
    </button>
  );
}
