export type BoardTheme = 'wood' | 'glass';

export type WoodTextureConfig = {
  base: string;
  accent: string;
  seed: number;
  repeatX: number;
  repeatY: number;
};

/** Props shared by every physical material in the 3D scene. */
export type MaterialSurface = {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
};

export type TileSurface = MaterialSurface & {
  light: string;
  dark: string;
  /** Colour of the panel visible through the bevel gaps and below glass. */
  bed: string;
  transparent: boolean;
  opacity: number;
  texture: { light: WoodTextureConfig; dark: WoodTextureConfig } | null;
};

export type PieceSurface = MaterialSurface & {
  transmission: number;
  thickness: number;
  ior: number;
  attenuationColor: string;
  attenuationDistance: number;
};

export type HighlightStyle = {
  color: string;
  opacity: number;
};

export type ThemePalette = {
  label: string;
  background: string;
  fog: { color: string; near: number; far: number };
  exposure: number;
  /** Rank/file labels drawn on the table around the board. */
  labelColor: string;

  tiles: TileSurface;
  frame: MaterialSurface & { texture: WoodTextureConfig | null };
  table: MaterialSurface & { texture: WoodTextureConfig | null };
  inlay: {
    color: string;
    emissive: string;
    emissiveIntensity: number;
    metalness: number;
    roughness: number;
  };

  pieces: {
    white: PieceSurface;
    black: PieceSurface;
  };

  lights: {
    ambient: number;
    hemi: { sky: string; ground: string; intensity: number };
    key: { color: string; intensity: number; position: [number, number, number] };
    fill: { color: string; intensity: number; position: [number, number, number] };
    rim: { color: string; intensity: number; distance: number; position: [number, number, number] };
  };

  env: {
    key: { color: string; intensity: number };
    fill: { color: string; intensity: number };
    rim: { color: string; intensity: number };
  };

  highlights: {
    select: HighlightStyle;
    lastMove: HighlightStyle;
    check: HighlightStyle;
    legal: HighlightStyle;
    legalCapture: HighlightStyle;
    suggest: HighlightStyle;
    suggestion: { color: string; opacity: number; toneMapped: boolean };
    pieceSelectEmissive: string;
    pieceHoverEmissive: string;
    pieceSelectIntensity: number;
    pieceHoverIntensity: number;
  };

  contactShadowOpacity: number;
};

const WOOD: ThemePalette = {
  label: 'Wood',
  background: '#1b1712',
  fog: { color: '#1b1712', near: 30, far: 52 },
  exposure: 1.05,
  labelColor: '#d8c7a8',

  tiles: {
    color: '#cdb891',
    light: '#d6bd93',
    dark: '#6b4a2f',
    bed: '#2a1b10',
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.14,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.55,
    transparent: false,
    opacity: 1,
    texture: {
      light: { base: '#d9c19a', accent: '#a8845a', seed: 11, repeatX: 1, repeatY: 1 },
      dark: { base: '#6f4f34', accent: '#382417', seed: 23, repeatX: 1, repeatY: 1 },
    },
  },
  frame: {
    color: '#5a3d28',
    roughness: 0.48,
    metalness: 0.05,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.6,
    texture: { base: '#5c3f2a', accent: '#2c1a10', seed: 31, repeatX: 2, repeatY: 2 },
  },
  table: {
    color: '#3b2617',
    roughness: 0.58,
    metalness: 0.03,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.45,
    texture: { base: '#3f2a1b', accent: '#1d120b', seed: 47, repeatX: 3, repeatY: 3 },
  },
  inlay: {
    color: '#a37b45',
    emissive: '#000000',
    emissiveIntensity: 0,
    metalness: 0.85,
    roughness: 0.28,
  },

  pieces: {
    white: {
      color: '#e7d8bd',
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.22,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.8,
      transmission: 0,
      thickness: 0,
      ior: 1.45,
      attenuationColor: '#ffffff',
      attenuationDistance: 1,
    },
    black: {
      color: '#211b17',
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.28,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.9,
      transmission: 0,
      thickness: 0,
      ior: 1.45,
      attenuationColor: '#000000',
      attenuationDistance: 1,
    },
  },

  lights: {
    ambient: 0.22,
    hemi: { sky: '#fff3dd', ground: '#191410', intensity: 0.35 },
    key: { color: '#ffe3bf', intensity: 2.4, position: [7, 13, -7] },
    fill: { color: '#cfd8ff', intensity: 0.55, position: [-8, 8, 6] },
    rim: { color: '#ffb26b', intensity: 24, distance: 24, position: [0, 6, -6] },
  },

  env: {
    key: { color: '#fff1d6', intensity: 2.6 },
    fill: { color: '#cfd8ff', intensity: 1.1 },
    rim: { color: '#ffb26b', intensity: 1.4 },
  },

  highlights: {
    select: { color: '#4ade80', opacity: 0.6 },
    lastMove: { color: '#fbbf24', opacity: 0.6 },
    check: { color: '#ef4444', opacity: 0.45 },
    legal: { color: '#22c55e', opacity: 0.2 },
    legalCapture: { color: '#f43f5e', opacity: 0.24 },
    suggest: { color: '#3b82f6', opacity: 0.28 },
    suggestion: { color: '#3b82f6', opacity: 0.85, toneMapped: false },
    pieceSelectEmissive: '#1f7a4a',
    pieceHoverEmissive: '#0e3b24',
    pieceSelectIntensity: 0.4,
    pieceHoverIntensity: 0.16,
  },

  contactShadowOpacity: 0.3,
};

const GLASS: ThemePalette = {
  label: 'Glass',
  background: '#050a12',
  fog: { color: '#050a12', near: 30, far: 55 },
  exposure: 1.15,
  labelColor: '#9ec8e6',

  tiles: {
    color: '#cfe8f5',
    light: '#dff2ff',
    dark: '#2c3e50',
    bed: '#03080f',
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.62,
    texture: null,
  },
  frame: {
    color: '#202b3a',
    roughness: 0.18,
    metalness: 0.85,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.4,
    texture: null,
  },
  table: {
    color: '#070d16',
    roughness: 0.3,
    metalness: 0.6,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.1,
    texture: null,
  },
  inlay: {
    color: '#38bdf8',
    emissive: '#0ea5e9',
    emissiveIntensity: 0.8,
    metalness: 0.5,
    roughness: 0.2,
  },

  pieces: {
    white: {
      color: '#d8f3ff',
      roughness: 0.1,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
      transmission: 0.92,
      thickness: 0.55,
      ior: 1.45,
      attenuationColor: '#bfe9ff',
      attenuationDistance: 1.2,
    },
    black: {
      color: '#162330',
      roughness: 0.14,
      metalness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
      transmission: 0.8,
      thickness: 0.7,
      ior: 1.5,
      attenuationColor: '#0b2f45',
      attenuationDistance: 0.8,
    },
  },

  lights: {
    ambient: 0.14,
    hemi: { sky: '#cdefff', ground: '#04070d', intensity: 0.3 },
    key: { color: '#e8fbff', intensity: 1.9, position: [6, 14, -6] },
    fill: { color: '#6aa9ff', intensity: 0.7, position: [-8, 7, 6] },
    rim: { color: '#38bdf8', intensity: 28, distance: 26, position: [0, 5, -6] },
  },

  env: {
    key: { color: '#dff6ff', intensity: 2.4 },
    fill: { color: '#6aa9ff', intensity: 1.5 },
    rim: { color: '#38bdf8', intensity: 2.2 },
  },

  highlights: {
    select: { color: '#67e8f9', opacity: 0.6 },
    lastMove: { color: '#fbbf24', opacity: 0.6 },
    check: { color: '#ef4444', opacity: 0.6 },
    legal: { color: '#22d3ee', opacity: 0.28 },
    legalCapture: { color: '#fb7185', opacity: 0.3 },
    suggest: { color: '#3b82f6', opacity: 0.32 },
    suggestion: { color: '#38bdf8', opacity: 0.95, toneMapped: false },
    pieceSelectEmissive: '#1e6f8f',
    pieceHoverEmissive: '#0c3a4f',
    pieceSelectIntensity: 0.9,
    pieceHoverIntensity: 0.35,
  },

  contactShadowOpacity: 0.38,
};

export const THEMES: Record<BoardTheme, ThemePalette> = {
  wood: WOOD,
  glass: GLASS,
};

export const DEFAULT_THEME: BoardTheme = 'wood';

export const isBoardTheme = (value: unknown): value is BoardTheme =>
  value === 'wood' || value === 'glass';
