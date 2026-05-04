import { LVL_01_INTRANET } from '@/content/levels/lvl-01-intranet';

export const ALL_LEVELS = [LVL_01_INTRANET] as const;
export const LEVEL_BY_ID = Object.fromEntries(ALL_LEVELS.map((l) => [l.id, l]));
