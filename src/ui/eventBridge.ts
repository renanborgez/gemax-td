import type { EventBus, SimEventMap } from '@/engine/EventBus';
import { useHudStore } from '@/ui/hudStore';

/**
 * Subscribe HUD state to engine events. Returns a teardown function.
 * Call inside PlayScreen on mount; tear down on unmount.
 */
export function attachEventBridge(bus: EventBus<SimEventMap>): () => void {
  const offs: Array<() => void> = [];

  offs.push(bus.on('lives-changed', ({ lives }) => useHudStore.getState().setLives(lives)));
  offs.push(bus.on('credits-changed', ({ credits }) => useHudStore.getState().setCredits(credits)));
  offs.push(bus.on('wave-started', ({ waveIndex }) => {
    const s = useHudStore.getState();
    s.setWave(waveIndex, s.totalWaves, 'in-progress');
  }));
  offs.push(bus.on('wave-cleared', ({ waveIndex }) => {
    const s = useHudStore.getState();
    s.setWave(waveIndex, s.totalWaves, 'cleared');
  }));

  return () => { for (const off of offs) off(); };
}
