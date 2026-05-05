// @ts-check
/**
 * Render assets/logo-mark.svg into the PNGs Expo expects:
 *   - assets/icon.png            1024x1024  (iOS / general app icon)
 *   - assets/adaptive-icon.png   1024x1024  (Android adaptive foreground;
 *                                            transparent bg, mark inset to
 *                                            ~70% safe zone, no corner brackets)
 *   - assets/splash-icon.png     2048x2048  (splash; cyber grid bg + centered
 *                                            mark, used by expo-splash-screen
 *                                            plugin with resizeMode "cover")
 *   - assets/splash.png          2048x2048  (legacy splash; same content)
 *   - assets/favicon.png          256x256
 *
 * Usage: node scripts/gen-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');

const MARK_SVG = readFileSync(join(ASSETS, 'logo-mark.svg'), 'utf8');
const BG = '#0E1014';

// ── Adaptive variant: drop bg plate + corner brackets so Android's mask
//    doesn't clip them, and so adaptiveIcon.backgroundColor shows through. ──
function adaptiveSvg() {
  return MARK_SVG
    // Strip the rounded background rect.
    .replace(/<rect x="0" y="0" width="1024"[\s\S]*?\/>/, '')
    // Strip corner brackets group.
    .replace(/<!-- Corner brackets[\s\S]*?<\/g>/, '')
    // Strip the faint grid (looks noisy at small sizes).
    .replace(/<!-- Faint grid[\s\S]*?<\/g>/, '');
}

async function renderSvg(svgString, sizePx) {
  // High density yields crisp raster at the target size.
  return sharp(Buffer.from(svgString), { density: Math.max(72, sizePx / 4) })
    .resize(sizePx, sizePx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png();
}

async function writeMark(name, sizePx) {
  const out = join(ASSETS, name);
  await (await renderSvg(MARK_SVG, sizePx)).toFile(out);
  console.log(`  ✓ ${name}  (${sizePx}x${sizePx})`);
}

async function writeAdaptive(name, sizePx) {
  const out = join(ASSETS, name);
  // Inset to 70% safe zone, transparent surround.
  const innerPx = Math.round(sizePx * 0.7);
  const inner = await (await renderSvg(adaptiveSvg(), innerPx)).toBuffer();
  await sharp({
    create: {
      width: sizePx,
      height: sizePx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log(`  ✓ ${name}  (${sizePx}x${sizePx}, inset 70%)`);
}

// Build a synthetic SVG: dark plate + cyber circuit grid + centered radial
// vignette. Used as the splash background, with the mark composited on top.
function gridBgSvg(sizePx) {
  const cells = 16;
  const stride = sizePx / cells;
  let lines = '';
  for (let i = 0; i <= cells; i++) {
    const v = (i * stride).toFixed(2);
    const heavy = i % 4 === 0;
    const opacity = heavy ? 0.18 : 0.07;
    const stroke = heavy ? 1.5 : 1;
    lines +=
      `<line x1="${v}" y1="0" x2="${v}" y2="${sizePx}" stroke="#44EEFF" stroke-width="${stroke}" opacity="${opacity}"/>` +
      `<line x1="0" y1="${v}" x2="${sizePx}" y2="${v}" stroke="#44EEFF" stroke-width="${stroke}" opacity="${opacity}"/>`;
  }
  // Sparse mint accent dots at quarter-grid intersections — circuit nodes.
  let nodes = '';
  for (let r = 1; r < cells; r += 4) {
    for (let c = 1; c < cells; c += 4) {
      const x = (c * stride).toFixed(2);
      const y = (r * stride).toFixed(2);
      nodes += `<circle cx="${x}" cy="${y}" r="3" fill="#7AFCC9" opacity="0.35"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}">
    <defs>
      <radialGradient id="vig" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#1A1D24" stop-opacity="0.65"/>
        <stop offset="60%" stop-color="#0E1014" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#0E1014" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="30%">
        <stop offset="0%" stop-color="#44EEFF" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#44EEFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${sizePx}" height="${sizePx}" fill="${BG}"/>
    ${lines}
    ${nodes}
    <rect width="${sizePx}" height="${sizePx}" fill="url(#vig)"/>
    <rect width="${sizePx}" height="${sizePx}" fill="url(#halo)"/>
  </svg>`;
}

async function writeSplash(name, sizePx) {
  const out = join(ASSETS, name);
  const bg = await sharp(Buffer.from(gridBgSvg(sizePx)), { density: 96 }).png().toBuffer();
  // Centered mark at ~38% of canvas (square is bigger than viewport in
  // resizeMode "cover", so this leaves headroom for the grid to read).
  const innerPx = Math.round(sizePx * 0.38);
  const inner = await (await renderSvg(MARK_SVG, innerPx)).toBuffer();
  await sharp(bg).composite([{ input: inner, gravity: 'center' }]).png().toFile(out);
  console.log(`  ✓ ${name}  (${sizePx}x${sizePx}, grid splash)`);
}

function hex(s) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(s);
  if (!m) throw new Error(`bad hex: ${s}`);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), alpha: 1 };
}

(async () => {
  console.log('Rendering icons from assets/logo-mark.svg ...');
  await writeMark('icon.png', 1024);
  await writeAdaptive('adaptive-icon.png', 1024);
  await writeSplash('splash-icon.png', 2048);
  await writeSplash('splash.png', 2048);
  await writeMark('favicon.png', 256);
  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
