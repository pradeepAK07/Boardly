/**
 * Downloads the pinned Stockfish build into public/engine.
 *
 * The single-threaded lite build is ~1.9 MB and needs no SharedArrayBuffer,
 * so it works on any static host without COOP/COEP headers. The .wasm loader
 * resolves the binary relative to its own URL, which is why both files must
 * live in the same directory.
 *
 * Usage: npm run engine:fetch
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const VERSION = '19.0.1';
const BUILD = 'stockfish-19-lite-single';
const BASE = `https://unpkg.com/stockfish@${VERSION}/bin`;
const OUT = 'public/engine';

mkdirSync(OUT, { recursive: true });

for (const file of [`${BUILD}.js`, `${BUILD}.wasm`]) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`Failed to download ${file}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${OUT}/${file}`, bytes);
  console.log(`  ${file}  ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(`Stockfish ${VERSION} (${BUILD}) ready in ${OUT}/`);
