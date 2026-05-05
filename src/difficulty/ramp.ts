const HP_RATE = 0.07;
const HP_KNEE_CHAPTER = 15;
const HP_KNEE_VALUE = 1 + HP_RATE * HP_KNEE_CHAPTER; // 2.05
const HP_POST_KNEE_RATE = 0.04;

const SPEED_RATE = 0.03;
const SPEED_CAP = 1.30;

export type ChapterMultipliers = { hp: number; speed: number };

export function chapterMultipliers(chapterIndex: number): ChapterMultipliers {
  if (chapterIndex < 0) throw new Error('chapterIndex must be >= 0');
  const hp =
    chapterIndex <= HP_KNEE_CHAPTER
      ? 1 + HP_RATE * chapterIndex
      : HP_KNEE_VALUE + HP_POST_KNEE_RATE * (chapterIndex - HP_KNEE_CHAPTER);
  return {
    hp,
    speed: Math.min(1 + SPEED_RATE * chapterIndex, SPEED_CAP),
  };
}
