# Chess Playground

A 3D chess game built with React, TypeScript, Three.js (React Three Fiber) and
chess.js — plus an integrated Stockfish analysis mode.

## Features

- Custom 3D board with animated moves, legal-move hints, check highlighting,
  promotion picker and a flip-board view.
- Play locally or against the built-in AI (easy / medium / hard).
- Import a PGN file or a bare FEN, export the current game as PGN.
- **Game analysis** (♟ in the header):
  - Fetch recent games from Chess.com by username.
  - Paste any PGN, or a FEN to analyse a single position.
  - Stockfish runs in a Web Worker (single-threaded wasm build), so the UI
    never blocks.
  - Live evaluation bar, centipawn / mate scores, engine best move, and
    per-move quality markers (`!`, `?!`, `?`, `??`) after a full-game scan.
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
