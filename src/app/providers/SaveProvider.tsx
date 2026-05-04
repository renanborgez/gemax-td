import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SaveStore } from '@/meta/SaveStore';
import { asyncStorageKv } from '@/meta/asyncStorageKv';
import type { SaveDataLatest } from '@/meta/schema';

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

  useEffect(() => { void store.load().then(setData); }, [store]);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A' }}>
        <ActivityIndicator color="#00F0FF" />
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
