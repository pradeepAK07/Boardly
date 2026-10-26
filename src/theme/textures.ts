import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import type { WoodTextureConfig } from './themes';

const woodCache = new Map<string, Texture>();

/** Small deterministic PRNG so a theme always produces the same grain. */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

/**
 * Painted wood grain. Generated once per key and reused by every tile and
 * board panel, so switching themes never stalls on image decoding.
 */
export function getWoodTexture(
  key: string,
  config: WoodTextureConfig,
  rotation = 0,
): Texture {
  const cacheKey = `${key}:${rotation}`;
  const cached = woodCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const base = hexToRgb(config.base);
    const accent = hexToRgb(config.accent);
    const random = mulberry32(config.seed);

    const background = ctx.createLinearGradient(0, 0, 0, size);
    background.addColorStop(0, rgba(mix(base, accent, 0.06), 1));
    background.addColorStop(0.55, rgba(base, 1));
    background.addColorStop(1, rgba(mix(base, accent, 0.14), 1));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    // Broad, softly waving grain bands.
    for (let band = 0; band < 64; band++) {
      const y = random() * size;
      const width = 1 + random() * 5;
      const drift = (random() - 0.5) * size * 0.04;
      const waveLength = 0.6 + random() * 1.8;
      const waveHeight = 1 + random() * 3;
      ctx.strokeStyle = rgba(mix(base, accent, 0.14 + random() * 0.42), 0.05 + random() * 0.07);
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 12) {
        const y2 =
          y +
          drift +
          Math.sin((x / size) * Math.PI * 2 * waveLength + band) * waveHeight;
        if (x === 0) ctx.moveTo(x, y2);
        else ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }

    // Fine pore lines.
    for (let line = 0; line < 280; line++) {
      const y = random() * size;
      const drift = (random() - 0.5) * size * 0.03;
      ctx.strokeStyle = rgba(mix(base, accent, 0.3 + random() * 0.55), 0.025 + random() * 0.05);
      ctx.lineWidth = 0.4 + random() * 0.9;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 20) {
        const y2 = y + drift + Math.sin((x / size) * Math.PI * 2 * 1.4 + line) * 1.2;
        if (x === 0) ctx.moveTo(x, y2);
        else ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }

    // A couple of knots with concentric rings.
    for (let knot = 0; knot < 3; knot++) {
      const cx = random() * size;
      const cy = random() * size;
      const radius = 6 + random() * 16;
      for (let ring = 1; ring <= 7; ring++) {
        ctx.strokeStyle = rgba(mix(base, accent, 0.5), 0.05 + ring * 0.008);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(
          cx + (random() - 0.5) * 2,
          cy + (random() - 0.5) * 2,
          radius * ring * 0.55,
          radius * ring * 0.3,
          random() * 0.4,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }

    // Speckle to break up the otherwise smooth gradient.
    for (let dot = 0; dot < 1400; dot++) {
      ctx.fillStyle = rgba(accent, 0.02 + random() * 0.035);
      ctx.fillRect(random() * size, random() * size, 1, 1);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(config.repeatX, config.repeatY);
  texture.rotation = rotation;
  texture.center.set(0.5, 0.5);
  texture.anisotropy = 4;
  woodCache.set(cacheKey, texture);
  return texture;
}

let blobTexture: Texture | null = null;

/** Soft radial shadow used to ground each piece on its square. */
export function getBlobShadowTexture(): Texture {
  if (blobTexture) return blobTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  blobTexture = new CanvasTexture(canvas);
  blobTexture.colorSpace = SRGBColorSpace;
  return blobTexture;
}
