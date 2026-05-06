// @ts-check
/**
 * Render assets/logo-mark.svg into every PNG/WebP the app needs.
 *
 * Expo-managed (assets/):
 *   - icon.png            1024x1024  (iOS / general app icon)
 *   - adaptive-icon.png   1024x1024  (Android adaptive foreground; transparent
 *                                     bg, mark inset to ~70% safe zone, no
 *                                     corner brackets)
 *   - splash-icon.png     2048x2048  (splash; cyber grid bg + centered mark,
 *                                     used by expo-splash-screen with
 *                                     resizeMode "cover")
 *   - splash.png          2048x2048  (legacy splash; same content)
 *   - favicon.png          256x256
 *
 * iOS prebuild (ios/towergemax/Images.xcassets/):
 *   - AppIcon.appiconset/App-Icon-1024x1024@1x.png  (1024, opaque — App Store
 *                                                    rejects alpha in icons)
 *   - SplashScreenLogo.imageset/image{,@2x,@3x}.png  (100/200/300 mark only)
 *
 * Android prebuild (android/app/src/main/res/):
 *   - mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.webp        (48/72/96/144/192,
 *     mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher_round.webp   opaque legacy icon)
 *   - mipmap-*dpi/ic_launcher_foreground.webp  (108/162/216/324/432 adaptive
 *                                                foreground, transparent)
 *   - drawable-*dpi/splashscreen_logo.png     (288/432/576/864/1152 mark)
 *
 * The native dirs are checked-in prebuild output. Re-run this whenever the
 * SVG changes, then commit the regenerated PNGs/WebPs alongside.
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
const IOS_APPICON = join(ROOT, 'ios/towergemax/Images.xcassets/AppIcon.appiconset');
const IOS_SPLASH = join(ROOT, 'ios/towergemax/Images.xcassets/SplashScreenLogo.imageset');
const ANDROID_RES = join(ROOT, 'android/app/src/main/res');

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

function svgDensity(sizePx) {
  return Math.max(72, sizePx / 4);
}

async function renderMarkPng(sizePx) {
  return sharp(Buffer.from(MARK_SVG), { density: svgDensity(sizePx) })
    .resize(sizePx, sizePx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function renderAdaptivePng(sizePx) {
  // Inset to 70% safe zone, transparent surround.
  const innerPx = Math.round(sizePx * 0.7);
  const inner = await sharp(Buffer.from(adaptiveSvg()), { density: svgDensity(innerPx) })
    .resize(innerPx, innerPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: sizePx,
      height: sizePx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toBuffer();
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

async function renderSplashPng(sizePx) {
  const bg = await sharp(Buffer.from(gridBgSvg(sizePx)), { density: 96 }).png().toBuffer();
  // Centered mark at ~38% of canvas (square is bigger than viewport in
  // resizeMode "cover", so this leaves headroom for the grid to read).
  const innerPx = Math.round(sizePx * 0.38);
  const inner = await renderMarkPng(innerPx);
  return sharp(bg).composite([{ input: inner, gravity: 'center' }]).png().toBuffer();
}

// iOS AppIcon must be opaque — App Store rejects icons with alpha. Flatten
// the mark over the brand bg so the rounded-rect plate sits on a solid square.
async function renderAppIconPng(sizePx) {
  const buf = await renderMarkPng(sizePx);
  return sharp(buf).flatten({ background: BG }).png().toBuffer();
}

async function renderLauncherWebp(sizePx) {
  // Legacy launcher (full mark, opaque, system applies its own circle/squircle
  // mask). Reused for both ic_launcher and ic_launcher_round.
  const buf = await renderMarkPng(sizePx);
  return sharp(buf).flatten({ background: BG }).webp({ quality: 90 }).toBuffer();
}

async function renderLauncherForegroundWebp(sizePx) {
  const buf = await renderAdaptivePng(sizePx);
  return sharp(buf).webp({ quality: 90 }).toBuffer();
}

function writeOut(path, buffer, label) {
  writeFileSync(path, buffer);
  console.log(`  ✓ ${label}`);
}

const ANDROID_DPIS = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const LAUNCHER_PX = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND_PX = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const ANDROID_SPLASH_PX = { mdpi: 288, hdpi: 432, xhdpi: 576, xxhdpi: 864, xxxhdpi: 1152 };

(async () => {
  console.log('Rendering icons from assets/logo-mark.svg ...');

  // ── assets/ (Expo managed) ──
  writeOut(join(ASSETS, 'icon.png'), await renderMarkPng(1024), 'assets/icon.png (1024)');
  writeOut(join(ASSETS, 'adaptive-icon.png'), await renderAdaptivePng(1024), 'assets/adaptive-icon.png (1024, inset 70%)');
  writeOut(join(ASSETS, 'splash-icon.png'), await renderSplashPng(2048), 'assets/splash-icon.png (2048, grid splash)');
  writeOut(join(ASSETS, 'splash.png'), await renderSplashPng(2048), 'assets/splash.png (2048, grid splash)');
  writeOut(join(ASSETS, 'favicon.png'), await renderMarkPng(256), 'assets/favicon.png (256)');

  // ── iOS prebuild (ios/towergemax/Images.xcassets/) ──
  writeOut(
    join(IOS_APPICON, 'App-Icon-1024x1024@1x.png'),
    await renderAppIconPng(1024),
    'ios AppIcon 1024 (opaque)',
  );
  writeOut(join(IOS_SPLASH, 'image.png'), await renderMarkPng(100), 'ios SplashScreenLogo @1x (100)');
  writeOut(join(IOS_SPLASH, 'image@2x.png'), await renderMarkPng(200), 'ios SplashScreenLogo @2x (200)');
  writeOut(join(IOS_SPLASH, 'image@3x.png'), await renderMarkPng(300), 'ios SplashScreenLogo @3x (300)');

  // ── Android prebuild (android/app/src/main/res/) ──
  for (const dpi of ANDROID_DPIS) {
    const launcher = await renderLauncherWebp(LAUNCHER_PX[dpi]);
    writeOut(join(ANDROID_RES, `mipmap-${dpi}/ic_launcher.webp`), launcher, `android mipmap-${dpi}/ic_launcher.webp (${LAUNCHER_PX[dpi]})`);
    writeOut(join(ANDROID_RES, `mipmap-${dpi}/ic_launcher_round.webp`), launcher, `android mipmap-${dpi}/ic_launcher_round.webp (${LAUNCHER_PX[dpi]})`);

    const fg = await renderLauncherForegroundWebp(FOREGROUND_PX[dpi]);
    writeOut(join(ANDROID_RES, `mipmap-${dpi}/ic_launcher_foreground.webp`), fg, `android mipmap-${dpi}/ic_launcher_foreground.webp (${FOREGROUND_PX[dpi]})`);

    const splash = await renderMarkPng(ANDROID_SPLASH_PX[dpi]);
    writeOut(join(ANDROID_RES, `drawable-${dpi}/splashscreen_logo.png`), splash, `android drawable-${dpi}/splashscreen_logo.png (${ANDROID_SPLASH_PX[dpi]})`);
  }

  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
