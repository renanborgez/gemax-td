/**
 * Cyber-Defense Logic design tokens.
 *
 * Palette: cyan primary (#44EEFF), mint secondary (#7AFCC9), orange tertiary
 * (#FFB14E), neutral black + grays. Headlines/labels in Space Grotesk, body
 * copy in Epilogue.
 */

export const COLORS = {
  // ─── Brand palette ───────────────────────────────────────────────────────
  primary: '#44EEFF',
  primaryDim: '#44EEFF66',
  primarySoft: '#44EEFF1F',

  secondary: '#7AFCC9',
  secondaryDim: '#7AFCC966',
  secondarySoft: '#7AFCC91F',

  tertiary: '#FFB14E',
  tertiaryDim: '#FFB14E66',
  tertiarySoft: '#FFB14E1F',

  /** Soft coral red for destructive actions — extension of the palette. */
  danger: '#FF7A8A',
  dangerDim: '#FF7A8A66',
  dangerSoft: '#FF7A8A1F',

  // ─── Neutrals (page → card → elevated) ───────────────────────────────────
  bg: '#0E1014',
  bgCard: '#1A1D24',
  bgElevated: '#262A33',
  bgInverted: '#F5F3EE',

  // ─── Text on dark surfaces ───────────────────────────────────────────────
  textPrimary: '#F2F4F7',
  textMuted: '#8A8F99',
  textOnAccent: '#0E1014',

  // Borders / dividers
  border: '#2A2E37',
  borderSubtle: '#1F232A',

  // ─── Game-render tokens (mapped to brand palette) ────────────────────────
  pathGlow: '#44EEFF',
  buildableHint: '#44EEFF44',
  invalidHint: '#FF7A8A88',
  selection: '#FFB14E',
  enemyHp: '#FF7A8A',
  enemyHpBg: '#3A1A24',

  // ─── Legacy aliases (mapped to new palette) ──────────────────────────────
  bgSubtle: '#1A1D24',
  cyan: '#44EEFF',
  magenta: '#FF7A8A',
  acid: '#7AFCC9',
  amber: '#FFB14E',
} as const;

/**
 * Font family names. These match the @expo-google-fonts package exports
 * registered via `useFonts` in App.tsx.
 */
export const FONTS = {
  headline: 'SpaceGrotesk_700Bold',
  headlineMedium: 'SpaceGrotesk_500Medium',
  label: 'SpaceGrotesk_500Medium',
  labelBold: 'SpaceGrotesk_700Bold',
  body: 'Epilogue_400Regular',
  bodyMedium: 'Epilogue_500Medium',
  /** Reserved for in-game numeric overlays. Falls through to system mono. */
  mono: 'monospace',
} as const;

/** Type-style variants — spread these into Text style props. */
export const TEXT = {
  display: { fontFamily: FONTS.headline, fontSize: 32, letterSpacing: -0.5, color: COLORS.textPrimary },
  headline: { fontFamily: FONTS.headline, fontSize: 22, letterSpacing: -0.3, color: COLORS.textPrimary },
  title: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.textPrimary },
  subtitle: { fontFamily: FONTS.headlineMedium, fontSize: 14, color: COLORS.textMuted, letterSpacing: 0.5 },
  body: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  bodySmall: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  label: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textPrimary, letterSpacing: 0.5 },
  labelSmall: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.6 },
  hudValue: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary },
  button: { fontFamily: FONTS.labelBold, fontSize: 13, letterSpacing: 0.5 },
  buttonSmall: { fontFamily: FONTS.labelBold, fontSize: 11, letterSpacing: 0.4 },
} as const;

/** Legacy size constants (pre-design-system). New code should prefer TEXT. */
export const TYPOGRAPHY = {
  mono: FONTS.mono,
  uiSmall: 12,
  uiBase: 14,
  uiLarge: 18,
  hudNumeric: 16,
  title: 28,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Loot-tier palette (Diablo/WoW/MTG convention).
 *  common gray, uncommon green, rare blue, epic purple, legendary gold. */
export const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#5DD68C',
  rare: '#60A5FA',
  epic: '#C084FC',
  legendary: '#FFB14E',
} as const;

export const RARITY_LABELS = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
} as const;

export const RENDER = {
  /** Pixel size of one tile on the canvas. Computed by Viewport but defaulted here for HUD math. */
  fallbackTileSizePx: 40,
} as const;
