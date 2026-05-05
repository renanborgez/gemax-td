import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SaveStore } from '@/meta/SaveStore';
import { asyncStorageKv } from '@/meta/asyncStorageKv';
import type { SaveDataLatest } from '@/meta/schema';
import { COLORS } from '@/render/theme';

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
      // in dev) are preserved.
      if (__DEV__ && loaded.meta.shards < 1000) {
        store.update((d) => { d.meta.shards = 1000; });
        setData({ ...store.current() });
        return;
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
