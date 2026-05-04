export const COLORS = {
  bg: '#0A0E1A',
  bgSubtle: '#10172A',
  cyan: '#00F0FF',
  magenta: '#FF2BD6',
  acid: '#7CFF6B',
  amber: '#FFB347',
  textPrimary: '#E8F1FF',
  textMuted: '#A8B5C5',
  pathGlow: '#00F0FF',
  buildableHint: '#00F0FF44',
  invalidHint: '#FF2BD688',
  selection: '#FFB347',
  enemyHp: '#FF2BD6',
  enemyHpBg: '#5A0A3F',
} as const;

export const TYPOGRAPHY = {
  mono: 'monospace',
  uiSmall: 12,
  uiBase: 14,
  uiLarge: 18,
  hudNumeric: 16,
  title: 28,
} as const;

export const RENDER = {
  /** Pixel size of one tile on the canvas. Computed by Viewport but defaulted here for HUD math. */
  fallbackTileSizePx: 40,
} as const;
