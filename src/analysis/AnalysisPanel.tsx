import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnalysis } from './context';
import { fetchPlayerGames, summarize, type ChessComGame } from './chesscom';
import { DEEP_DEPTH } from './useAnalysisSession';
import './analysis.css';

type Tab = 'chesscom' | 'text';

function resultLabel(game: ChessComGame): string {
  if (game.white.result === 'win') return '1-0';
  if (game.black.result === 'win') return '0-1';
  return game.white.result === 'draw' || game.black.result === 'draw' ? '½-½' : '—';
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AnalysisPanel({ currentFen }: { currentFen?: string }) {
  const {
    loadText,
    close,
    ready,
    error,
    clearError,
    analyzeAll,
    cancel,
    progress,
    game,
    currentEval,
    live,
  } = useAnalysis();

  const [tab, setTab] = useState<Tab>('chesscom');
  const [username, setUsername] = useState('');
  const [games, setGames] = useState<ChessComGame[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const search = useCallback(async () => {
    if (!username.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setLocalError(null);
    setWarnings([]);
    clearError();

    try {
      const result = await fetchPlayerGames(username, {
        months: 3,
        maxGames: 20,
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) return;

      setGames(result.games);
      setWarnings(result.warnings);
      if (result.games.length === 0) {
        setLocalError('No standard-chess games found in the last 3 months.');
      }
    } catch (cause) {
      if ((cause as Error).name === 'AbortError') return;
      setLocalError((cause as Error).message);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [username, clearError]);

  const loadChessComGame = useCallback(
    (gameToLoad: ChessComGame) => {
      const summary = summarize(gameToLoad);
      try {
        loadText(gameToLoad.pgn, 'chesscom', {
          white: summary.white,
          black: summary.black,
          whiteRating: summary.whiteRating,
          blackRating: summary.blackRating,
          timeClass: summary.timeClass,
          timeControl: summary.timeControl,
          url: summary.url,
          endedAt: summary.endedAt,
        });
        setLocalError(null);
      } catch (cause) {
        setLocalError((cause as Error).message);
      }
    },
    [loadText],
  );

  const loadRawText = useCallback(() => {
    const source = text.trim();
    if (!source) return;

    try {
      loadText(source, /\[\s*[A-Za-z]+\s+"/.test(source) ? 'pgn' : 'fen');
      setLocalError(null);
    } catch (cause) {
      setLocalError((cause as Error).message);
    }
  }, [loadText, text]);

  const message = localError ?? error;
  const depth = currentEval?.depth ?? (live?.depth ?? 0);

  return (
    <section className="analysis-panel">
      <div className="analysis-panel__header">
        <h3>Game analysis</h3>
        <button className="analysis-close" onClick={close} title="Close analysis">
          ✕
        </button>
      </div>

      <div className="analysis-status">
        <span className={`analysis-dot${ready ? ' is-ready' : ''}`} />
        {ready ? `Stockfish ready${depth ? ` · depth ${depth}` : ''}` : 'Starting Stockfish…'}
        {game && (
          <button className="analysis-link" onClick={() => void analyzeAll()} disabled={!!progress}>
            Analyse all
          </button>
        )}
      </div>

      {progress && (
        <div className="analysis-progress">
          <progress value={progress.done} max={progress.total} />
          <span>
            {progress.done}/{progress.total}
          </span>
          <button onClick={cancel}>Stop</button>
        </div>
      )}

      <div className="analysis-tabs">
        <button className={tab === 'chesscom' ? 'is-active' : ''} onClick={() => setTab('chesscom')}>
          Chess.com
        </button>
        <button className={tab === 'text' ? 'is-active' : ''} onClick={() => setTab('text')}>
          PGN / FEN
        </button>
      </div>

      {tab === 'chesscom' ? (
        <div className="analysis-tab-body">
          <div className="analysis-row">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="Chess.com username"
              spellCheck={false}
              autoCapitalize="none"
            />
            <button onClick={() => void search()} disabled={busy || !username.trim()}>
              {busy ? '…' : 'Fetch'}
            </button>
          </div>

          {games.length > 0 && (
            <div className="analysis-games">
              {games.map((gameItem) => {
                const summary = summarize(gameItem);
                return (
                  <button
                    key={gameItem.url}
                    className="analysis-game"
                    onClick={() => loadChessComGame(gameItem)}
                    title="Load this game"
                  >
                    <span className="analysis-game__players">
                      <span>{summary.white}</span>
                      <span className="analysis-game__rating">{summary.whiteRating}</span>
                      <span className="analysis-game__vs">vs</span>
                      <span>{summary.black}</span>
                      <span className="analysis-game__rating">{summary.blackRating}</span>
                    </span>
                    <span className="analysis-game__meta">
                      <span>{resultLabel(gameItem)}</span>
                      <span>{summary.timeClass}</span>
                      <span>{formatDate(summary.endedAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {warnings.length > 0 && (
            <p className="analysis-warning">Some months failed to load: {warnings.join(' · ')}</p>
          )}
        </div>
      ) : (
        <div className="analysis-tab-body">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'[Event "Casual game"]\n1. e4 e5 2. Nf3 …\n\nor a FEN such as:\nr1bqkbnr/… w KQkq - 0 1'}
            rows={9}
            spellCheck={false}
          />
          <button onClick={loadRawText} disabled={!text.trim()}>
            Load &amp; analyse
          </button>
          {currentFen && (
            <button
              className="analysis-secondary"
              onClick={() => {
                setText(currentFen);
                try {
                  loadText(currentFen, 'fen');
                  setLocalError(null);
                } catch (cause) {
                  setLocalError((cause as Error).message);
                }
              }}
            >
              Use current board position
            </button>
          )}
        </div>
      )}

      {game && (
        <div className="analysis-current-game">
          <span>
            {game.white ?? 'White'} vs {game.black ?? 'Black'}
          </span>
          <span>{game.positions.length - 1} moves</span>
          <button className="analysis-secondary" onClick={() => void analyzeAll(DEEP_DEPTH)}>
            Deep-analyse all
          </button>
        </div>
      )}

      {message && (
        <p className="analysis-error" role="alert">
          {message}
          <button onClick={clearError} aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}

      <p className="analysis-hint">
        Step through the moves with ← → or the move list. The bar follows the position being viewed.
      </p>
    </section>
  );
}
