/**
 * End-of-match shard reward calculation. Account-XP/player-level were removed
 * — shards are the only meta currency now.
 */

export type ShardRewardOpts = {
  stars: 0 | 1 | 2 | 3;
  chapter: number;
  /** From `SelectorMultipliers.shardRewardMult`. */
  shardRewardMult: number;
};

export function shardRewardForMatch(opts: ShardRewardOpts): number {
  return Math.round(opts.stars * 10 * opts.shardRewardMult * (1 + 0.05 * opts.chapter));
}
