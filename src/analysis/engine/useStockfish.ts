import { useCallback, useEffect, useRef, useState } from 'react';
import { parseInfo, type InfoLine } from './uci';
import type { Score } from '../types';

export type EngineEval = {
  score: Score;
  bestMove: string | null;
  pv: string[];
  depth: number;
};

export type SearchOptions = {
  depth?: number;
  movetime?: number;
};

type Job = {
  fen: string;
  options: SearchOptions;
  resolve: (value: EngineEval) => void;
  reject: (error: unknown) => void;
  cancelled: boolean;
};

export type LiveSearch = {
  depth: number;
  score: Score;
  pv: string[];
};

export const ENGINE_URL = '/engine/stockfish-19-lite-single.js';
export const ENGINE_DEPTH = 18;

/**
 * Stockfish in a Web Worker.
 *
 * The worker is created lazily (the first `analyze` or once `enabled` becomes
 * true) because the wasm binary is ~1.9 MB. Searches are serialized: a new
 * request stops the previous one, and stale `info` lines are ignored by only
 * accepting lines while a job is active.
 */
export function useStockfish(enabled: boolean, url = ENGINE_URL) {
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const resolveReadyRef = useRef<(() => void) | null>(null);
  const rejectReadyRef = useRef<((error: unknown) => void) | null>(null);

  const queueRef = useRef<Job[]>([]);
  const activeRef = useRef<Job | null>(null);
  const lastInfoRef = useRef<InfoLine | null>(null);
  const lastEmitRef = useRef(0);
  const emitDepthRef = useRef(-1);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveSearch | null>(null);

  const pump = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || activeRef.current) return;

    const job = queueRef.current.shift();
    if (!job) return;

    activeRef.current = job;
    lastInfoRef.current = null;
    emitDepthRef.current = -1;
    setLive(null);

    worker.postMessage(`position fen ${job.fen}`);
    worker.postMessage(
      job.options.movetime
        ? `go movetime ${job.options.movetime}`
        : `go depth ${job.options.depth ?? ENGINE_DEPTH}`,
    );
  }, []);

  const start = useCallback(() => {
    if (workerRef.current) return;

    const worker = new Worker(url);
    workerRef.current = worker;

    readyRef.current = new Promise<void>((resolve, reject) => {
      resolveReadyRef.current = resolve;
      rejectReadyRef.current = reject;
    });

    worker.onerror = () => {
      const message = 'The analysis engine failed to load.';
      setError(message);
      rejectReadyRef.current?.(new Error(message));
    };

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = typeof event.data === 'string' ? event.data : '';

      if (line === 'uciok') {
        worker.postMessage('setoption name Hash value 32');
        worker.postMessage('setoption name UCI_ShowWDL value false');
        worker.postMessage('isready');
        return;
      }

      if (line === 'readyok') {
        setReady(true);
        resolveReadyRef.current?.();
        pump();
        return;
      }

      const info = parseInfo(line);
      if (info) {
        // A stopped search can still flush a few lines. Without this guard they
        // would overwrite the evaluation of the position we just moved to.
        const job = activeRef.current;
        if (!job || job.cancelled) return;
        lastInfoRef.current = info;

        if (info.multipv === 1) {
          const now = performance.now();
          if (now - lastEmitRef.current >= 60 || info.depth !== emitDepthRef.current) {
            lastEmitRef.current = now;
            emitDepthRef.current = info.depth;
            setLive({ depth: info.depth, score: info.score, pv: info.pv });
          }
        }
        return;
      }

      if (line.startsWith('bestmove')) {
        const job = activeRef.current;
        activeRef.current = null;

        const uci = line.split(/\s+/)[1];
        const bestMove = uci && uci !== '(none)' ? uci : null;

        if (job && !job.cancelled) {
          const final = lastInfoRef.current;
          job.resolve({
            score: final?.score ?? { type: 'cp', value: 0 },
            bestMove,
            pv: final?.pv ?? (bestMove ? [bestMove] : []),
            depth: final?.depth ?? 0,
          });
        }

        setLive(null);
        pump();
      }
    };

    worker.postMessage('uci');
  }, [pump, url]);

  useEffect(() => {
    if (!enabled) return;
    start();
  }, [enabled, start]);

  useEffect(
    () => () => {
      workerRef.current?.postMessage('quit');
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  /** Cancel everything in flight. */
  const stop = useCallback(() => {
    const cancelled = new DOMException('Cancelled', 'AbortError');

    queueRef.current.splice(0).forEach((job) => job.reject(cancelled));
    const active = activeRef.current;
    if (active) {
      active.cancelled = true;
      active.reject(cancelled);
      // Keep the job as `active`: pump() must not launch the next search until
      // the engine answers this one with `bestmove`. Otherwise that bestmove
      // would be mistaken for the new search's result and the new search's
      // `info` lines would be dropped, leaving the position unevaluated.
      workerRef.current?.postMessage('stop');
    }
    setLive(null);
  }, []);

  const analyze = useCallback(
    async (fen: string, options: SearchOptions = {}): Promise<EngineEval> => {
      start();
      await readyRef.current;
      stop();

      return new Promise<EngineEval>((resolve, reject) => {
        queueRef.current.push({ fen, options, resolve, reject, cancelled: false });
        pump();
      });
    },
    [start, stop, pump],
  );

  return { ready, error, live, analyze, stop };
}
