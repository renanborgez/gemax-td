import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AudioManager } from '@/audio/AudioManager';
import { useSave } from '@/app/providers/SaveProvider';

const AudioContext = createContext<AudioManager | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSave();
  const manager = useMemo(() => new AudioManager(), []);

  useEffect(() => {
    void manager.init();
    return () => { void manager.stopMusic(); };
  }, [manager]);

  useEffect(() => {
    manager.setVolumes({
      master: data.settings.audioMaster,
      sfx: data.settings.sfx,
      music: data.settings.music,
    });
  }, [manager, data.settings.audioMaster, data.settings.sfx, data.settings.music]);

  return <AudioContext.Provider value={manager}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioManager {
  const m = useContext(AudioContext);
  if (!m) throw new Error('useAudio outside AudioProvider');
  return m;
}
