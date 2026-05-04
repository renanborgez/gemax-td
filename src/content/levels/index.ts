import { LVL_01_INTRANET } from '@/content/levels/lvl-01-intranet';
import { LVL_02_UPLINK } from '@/content/levels/lvl-02-uplink';

export const ALL_LEVELS = [LVL_01_INTRANET, LVL_02_UPLINK] as const;
export const LEVEL_BY_ID = Object.fromEntries(ALL_LEVELS.map((l) => [l.id, l]));
