import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SaveStore } from '@/meta/SaveStore';
import { asyncStorageKv } from '@/meta/asyncStorageKv';
import type { SaveDataLatest } from '@/meta/schema';
import { COLORS } from '@/render/theme';
import { ALL_LEVELS } from '@/content/levels';
import type { Difficulty } from '@/content/types';

const ALL_DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'];

type Ctx = {
  store: SaveStore;
  data: SaveDataLatest;
  /** Trigger a re-render after a mutation. Components that mutate via store.update should call refresh(). */
  refresh: () => void;
};

const SaveContext = createContext<Ctx | null>(null);

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new SaveStore(asyncStorageKv));
  const [data, setData] = useState<SaveDataLatest | null>(null);

  useEffect(() => {
    void store.load().then((loaded) => {
      // Dev-only: keep at least 1000 shards on every launch so we can exercise
      // the tech tree without grinding. Higher balances (after earning shards
      // in dev) are preserved. Also pre-clear every mission with 3 stars on
      // every difficulty so navigation/unlocks are exercised immediately.
      if (__DEV__) {
        const needsShards = loaded.meta.shards < 1000;
        const needsClear = ALL_LEVELS.some((lvl) => {
          const p = loaded.campaign[lvl.id];
          if (!p || !p.cleared) return true;
          return ALL_DIFFICULTIES.some((d) => (p.bestStarsByDifficulty[d] ?? 0) < 3);
        });
        if (needsShards || needsClear) {
          store.update((d) => {
            if (needsShards) d.meta.shards = 1000;
            for (const lvl of ALL_LEVELS) {
              const p = (d.campaign[lvl.id] ??= {
                bestStarsByDifficulty: {},
                bestWaveReached: 0,
                cleared: false,
                shardsAwardedFor: [],
              });
              p.cleared = true;
              p.bestWaveReached = Math.max(p.bestWaveReached, lvl.waves.length);
              for (const diff of ALL_DIFFICULTIES) {
                if ((p.bestStarsByDifficulty[diff] ?? 0) < 3) {
                  p.bestStarsByDifficulty[diff] = 3;
                }
              }
            }
          });
          setData({ ...store.current() });
          return;
        }
      }
      setData(loaded);
    });
  }, [store]);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SaveContext.Provider
      value={{ store, data, refresh: () => setData({ ...store.current() }) }}
    >
      {children}
    </SaveContext.Provider>
  );
}

export function useSave(): Ctx {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave outside SaveProvider');
  return ctx;
}
