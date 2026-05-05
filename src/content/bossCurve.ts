const BOSS_BASE_HP = 800;
const BOSS_GROWTH = 1.6;

/** Source-of-truth HP curve for chapter bosses. EnemyDefs added per chapter
 *  should target this value (rounded to a clean multiple) at their chapter. */
export function bossHp(chapterIndex: number): number {
  if (chapterIndex < 0) throw new Error('chapterIndex must be >= 0');
  return Math.round(BOSS_BASE_HP * BOSS_GROWTH ** chapterIndex);
}
