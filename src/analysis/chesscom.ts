const BASE = 'https://api.chess.com/pub';

export class ChessComError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: 'not-found' | 'rate-limit' | 'network' | 'bad-response',
  ) {
    super(message);
    this.name = 'ChessComError';
  }
}

export type ChessComGame = {
  url: string;
  pgn: string;
  rules: string;
  time_class: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
};

export type RecentGamesOptions = {
  months?: number;
  maxGames?: number;
  signal?: AbortSignal;
  onProgress?: (loaded: number) => void;
};

export type ChessComSummary = {
  id: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  whiteResult: string;
  blackResult: string;
  timeClass: string;
  timeControl: string;
  endedAt: number;
  url: string;
};

function slug(raw: string): string {
  const name = raw.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_-]{2,25}$/.test(name)) {
    throw new ChessComError('Enter a valid Chess.com username.', 0, 'bad-response');
  }
  return name;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ChessComError('Could not reach Chess.com. Check your connection.', 0, 'network');
  }

  if (response.status === 404) {
    throw new ChessComError('No such Chess.com player.', 404, 'not-found');
  }
  if (response.status === 429) {
    throw new ChessComError('Chess.com rate limit reached. Try again in a minute.', 429, 'rate-limit');
  }
  if (!response.ok) {
    throw new ChessComError(`Chess.com responded ${response.status}.`, response.status, 'bad-response');
  }

  return response.json() as Promise<T>;
}

export async function fetchArchives(username: string, signal?: AbortSignal): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `${BASE}/player/${slug(username)}/games/archives`,
    signal,
  );
  return data.archives;
}

/**
 * Fetch recent standard-chess games, newest first. A month that fails (for
 * example a 429) is reported as a warning instead of aborting the whole load.
 */
export async function fetchPlayerGames(
  username: string,
  { months = 3, maxGames = 20, signal, onProgress }: RecentGamesOptions = {},
): Promise<{ games: ChessComGame[]; warnings: string[] }> {
  const archives = await fetchArchives(username, signal);
  const selected = archives.slice(-months).reverse();
  const collected: ChessComGame[] = [];
  const warnings: string[] = [];

  for (const url of selected) {
    if (collected.length >= maxGames) break;

    try {
      const month = await getJson<{ games: ChessComGame[] }>(url, signal);
      const standard = month.games.filter((game) => game.rules === 'chess');
      // The API returns a month in chronological order.
      collected.push(...standard.reverse());
      onProgress?.(Math.min(collected.length, maxGames));
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      const label = url.slice(url.lastIndexOf('/games/') + 7);
      warnings.push(`${label}: ${(error as Error).message}`);
    }

    await delay(200, signal);
  }

  collected.sort((a, b) => b.end_time - a.end_time);
  return { games: collected.slice(0, maxGames), warnings };
}

export function summarize(game: ChessComGame): ChessComSummary {
  return {
    id: game.url,
    white: game.white.username,
    black: game.black.username,
    whiteRating: game.white.rating,
    blackRating: game.black.rating,
    whiteResult: game.white.result,
    blackResult: game.black.result,
    timeClass: game.time_class,
    timeControl: game.time_control,
    endedAt: game.end_time * 1000,
    url: game.url,
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}
