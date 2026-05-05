/**
 * Print the Goal-Defense survivability table for every authored level.
 *
 * Usage: `npm run validate:waves`
 *
 * One row per wave: enemy count, toughest creep, shots-to-kill, path tiles,
 * `(8+N)·L`, `h·N`, margin ratio, and a SURVIVABLE / LEAKER tag. Boss waves
 * of finale levels are *expected* to be leakers; the validator fails only
 * when a non-finale wave drops below ratio 1.0.
 *
 * Implemented as a vitest test so we reuse the existing `@/` alias resolver
 * without bringing in another runner. The "test" is a print harness — it
 * fails the run only when an unexpected leaker is detected.
 */
import { describe, it, expect } from 'vitest';
import { ALL_LEVELS } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { levelSurvivability, BASELINE_SHOT_DAMAGE } from '@/content/waveSurvivability';

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}
function padNum(n: number, w: number, decimals = 0): string {
  return pad(decimals === 0 ? String(n) : n.toFixed(decimals), w);
}

describe('wave survivability validator', () => {
  it('prints the Goal-Defense table for every level', () => {
    let warnings = 0;

    console.log(
      `\nGoal-Defense survivability — baseline shot dmg = ${BASELINE_SHOT_DAMAGE} (Firewall)`,
    );
    console.log('Inequality: (8 + N) · L  vs  h · N    (h = HP / baseDmg)\n');

    for (const level of ALL_LEVELS) {
      const chapter = CHAPTER_BY_INDEX[level.chapter];
      const isFinale = chapter?.finaleLevelId === level.id;

      console.log(
        `── ${level.id}  (chapter ${level.chapter}${isFinale ? ' · FINALE' : ''})`,
      );
      console.log(
        pad('  WAVE', 8) + pad('N', 5) + pad('TOUGHEST', 12) +
        pad('h', 8) + pad('L', 6) + pad('LHS', 9) + pad('RHS', 9) +
        pad('RATIO', 9) + 'STATUS',
      );

      const rows = levelSurvivability(level);
      const lastIndex = rows.length - 1;

      for (const row of rows) {
        const expectedLeaker = isFinale && row.waveIndex === lastIndex;
        const tag = row.survivable
          ? 'SURVIVABLE'
          : expectedLeaker
            ? 'LEAKER (boss — expected)'
            : 'LEAKER (warning)';
        if (!row.survivable && !expectedLeaker) warnings++;
        console.log(
          pad(`  W${row.waveIndex + 1}`, 8) +
          padNum(row.enemyCount, 5) +
          pad(row.toughestKind, 12) +
          padNum(row.shotsToKill, 8, 2) +
          padNum(row.pathTiles, 6) +
          padNum(row.lhs, 9) +
          padNum(row.rhs, 9) +
          padNum(row.marginRatio, 9, 2) +
          tag,
        );
      }
      console.log('');
    }

    if (warnings === 0) {
      console.log('✓ all non-finale waves survivable; finale boss waves engineered to leak.\n');
    }
    expect(warnings, 'unexpected non-finale leaker waves').toBe(0);
  });
});
