import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { attachEventBridge } from '@/ui/eventBridge';
import { useHudStore } from '@/ui/hudStore';

describe('eventBridge', () => {
  beforeEach(() => { useHudStore.getState().reset({ totalWaves: 10 }); });

  it('updates lives on life-lost via lives-changed', () => {
    const bus = new EventBus<SimEventMap>();
    const off = attachEventBridge(bus);
    bus.emit('lives-changed', { lives: 18 });
    bus.flush();
    expect(useHudStore.getState().lives).toBe(18);
    off();
  });

  it('updates wave state on wave-started/cleared', () => {
    const bus = new EventBus<SimEventMap>();
    attachEventBridge(bus);
    bus.emit('wave-started', { waveIndex: 0 });
    bus.flush();
    expect(useHudStore.getState().waveIndex).toBe(0);
    expect(useHudStore.getState().waveStatus).toBe('in-progress');
    bus.emit('wave-cleared', { waveIndex: 0 });
    bus.flush();
    expect(useHudStore.getState().waveStatus).toBe('cleared');
  });
});
