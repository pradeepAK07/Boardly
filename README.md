# Chess Playground

A 3D chess game built with React, TypeScript, Three.js (React Three Fiber) and
chess.js — plus an integrated Stockfish analysis mode.

## Features

- Custom 3D board with animated moves, legal-move hints, check highlighting,
  promotion picker and a flip-board view.
- Two board themes, **Wood** and **Glass**, switchable from the left panel and
  remembered between visits. The theme restyles the 3D scene only (tiles,
  pieces, lighting, table) and never changes the application chrome.
- Play locally or against the built-in AI (easy / medium / hard).
- Import a PGN file or a bare FEN, export the current game as PGN.
- **Game analysis** (♟ in the header):
  - Fetch recent games from Chess.com by username.
  - Paste any PGN, or a FEN to analyse a single position.
  - Stockfish runs in a Web Worker (single-threaded wasm build), so the UI
    never blocks.
  - Live evaluation bar, centipawn / mate scores, engine best move, and
    per-move quality markers after a full-game scan.
  - Played moves are grouped into Brilliant, Best, Good, Inaccuracy, Mistake
    and Blunder sections (moves without an evaluation collect under "Not
    analysed" until the scan reaches them). Brilliant marks an engine-best
    winning sacrifice.
  - The engine's suggested move is drawn on the board as a blue arrow with
    subtle blue tints on its from/to squares.
  - Step through moves with the arrow keys, the move list, or the navigation
    buttons; each position is analysed at depth 18 and cached.

## Getting started

```bash
npm install
npm run engine:fetch   # downloads Stockfish into public/engine (once)
npm run dev
```

`npm run engine:fetch` pulls the pinned
[`stockfish` 19.0.1 `lite-single`](https://www.npmjs.com/package/stockfish)
build (~1.9 MB). It is single-threaded, so no `SharedArrayBuffer` or
COOP/COEP headers are required on the host.

Build and preview the production bundle with:

```bash
npm run build
npm run preview
```

## Board themes

Use the **Board theme** picker at the top of the left panel to switch between:

- **Wood** - walnut and maple tiles with procedural grain, a brass inlay and
  warm studio lighting.
- **Glass** - frosted translucent tiles, transmission-based glass pieces and a
  dark metal frame with cool cyan rim light.

The choice is stored in `localStorage` under `chess-playground:theme`, so it
survives a reload. Gameplay, analysis mode, the engine arrow and the move list
behave identically in both themes.

## Keyboard shortcuts (analysis)

| Key | Action |
| --- | --- |
| `←` / `→` | Previous / next move |
| `Home` / `End` | Start / final position |

## Third-party notices

Stockfish is distributed under the **GPLv3**. The engine binaries in
`public/engine/` and the `stockfish` npm package are covered by that licence;
if you redistribute this app, keep the corresponding source available.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |
| `npm run engine:fetch` | Download the pinned Stockfish wasm build |
