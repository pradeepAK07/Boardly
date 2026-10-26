import { useEffect, useMemo, useRef } from 'react';
import { useAnalysis } from './context';
import { formatEval, uciToSan } from './engine/uci';
import {
  QUALITY_GLYPH,
  QUALITY_LABEL,
  QUALITY_ORDER,
  type Quality,
} from './classify';
import type { PositionEval, PositionNode } from './types';
import './analysis.css';

/** Played moves that cannot be classified yet land in their own trailing bucket. */
type GroupKey = Quality | 'unanalysed';

const GROUP_ORDER: GroupKey[] = [...QUALITY_ORDER, 'unanalysed'];

const groupLabel = (key: GroupKey) =>
  key === 'unanalysed' ? 'Not analysed' : QUALITY_LABEL[key];

const groupGlyph = (key: GroupKey) =>
  key === 'unanalysed' ? '…' : QUALITY_GLYPH[key];

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
    qualityByPly,
    analyzeAll,
    cancel,
    progress,
  } = useAnalysis();

  const listRef = useRef<HTMLDivElement>(null);

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

  const groups = useMemo(() => {
    const buckets = new Map<GroupKey, PositionNode[]>();
    for (const position of positions.slice(1)) {
      const key: GroupKey = qualityByPly[position.ply] ?? 'unanalysed';
      const bucket = buckets.get(key);
      if (bucket) bucket.push(position);
      else buckets.set(key, [position]);
    }
    return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
      key,
      moves: buckets.get(key) ?? [],
    }));
  }, [positions, qualityByPly]);

  // Keep the current move visible when navigating with the keyboard or the
  // arrow buttons. Only the move list scrolls; the header and footer stay put.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('.move-item.active');
    row?.scrollIntoView({ block: 'nearest' });
  }, [viewIndex]);

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
  const moveCount = Math.max(0, positions.length - 1);

  return (
    <aside className="move-history-panel analysis-moves">
      <div className="move-history-header">
        <h3>
          Analysis <span className="analysis-move-count">{moveCount} moves</span>
        </h3>
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

      <div className="move-history-list analysis-groups" ref={listRef}>
        {groups.length === 0 && (
          <p className="no-moves">Start position only — nothing to step through.</p>
        )}

        {groups.map(({ key, moves }) => (
          <section className="quality-group" key={key}>
            <header className={`quality-group__header quality-group__header--${key}`}>
              <span className="quality-group__glyph">{groupGlyph(key)}</span>
              <span className="quality-group__label">{groupLabel(key)}</span>
              <span className="quality-group__count">{moves.length}</span>
            </header>
            <div className="quality-group__moves">
              {moves.map((node) => (
                <MoveRow
                  key={node.ply}
                  node={node}
                  active={node.ply === viewIndex}
                  onSelect={goToPly}
                  evals={evals}
                />
              ))}
            </div>
          </section>
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

function MoveRow({
  node,
  active,
  onSelect,
  evals,
}: {
  node: PositionNode;
  active: boolean;
  onSelect: (ply: number) => void;
  evals: Record<string, PositionEval>;
}) {
  const key = node.fen.split(' ').slice(0, 4).join(' ');
  const evaluation = evals[key];
  const number = node.color === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}…`;

  return (
    <button
      className={`move-item move-item--analysis${active ? ' active' : ''}`}
      onClick={() => onSelect(node.ply)}
      aria-current={active ? 'step' : undefined}
      title={`${node.san}${evaluation ? ` · ${formatEval(evaluation.score, node.turn)}` : ''}`}
    >
      <span className="move-item__number">{number}</span>
      <span className="move-item__san">{node.san}</span>
      {evaluation && (
        <span className="move-eval">{formatEval(evaluation.score, node.turn)}</span>
      )}
      {active && <span className="move-cursor" aria-hidden="true" />}
    </button>
  );
}
