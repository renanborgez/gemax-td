const HP_RATE = 0.07;
const SPEED_RATE = 0.04;
const HP_CAP = 2.0;
const SPEED_CAP = 1.20;

export type ChapterMultipliers = { hp: number; speed: number };

export function chapterMultipliers(chapterIndex: number): ChapterMultipliers {
  if (chapterIndex < 0) throw new Error('chapterIndex must be >= 0');
  return {
    hp: Math.min(1 + HP_RATE * chapterIndex, HP_CAP),
    speed: Math.min(1 + SPEED_RATE * chapterIndex, SPEED_CAP),
  };
}
