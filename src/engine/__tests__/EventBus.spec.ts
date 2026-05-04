import { describe, it, expect, vi } from 'vitest';
import { EventBus, type SimEventMap } from '@/engine/EventBus';

describe('EventBus', () => {
  it('emits and dispatches buffered events on flush()', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    bus.on('enemy-died', fn);
    bus.emit('enemy-died', { enemyId: 'e:1', bounty: 10, killedByTowerId: 't:1' });
    expect(fn).not.toHaveBeenCalled(); // buffered
    bus.flush();
    expect(fn).toHaveBeenCalledWith({ enemyId: 'e:1', bounty: 10, killedByTowerId: 't:1' });
  });

  it('supports multiple subscribers', () => {
    const bus = new EventBus<SimEventMap>();
    const a = vi.fn(), b = vi.fn();
    bus.on('wave-cleared', a);
    bus.on('wave-cleared', b);
    bus.emit('wave-cleared', { waveIndex: 0 });
    bus.flush();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off() removes a subscriber', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    const off = bus.on('tower-placed', fn);
    off();
    bus.emit('tower-placed', { towerId: 't:1', kind: 'firewall' });
    bus.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('clears the buffer after flush', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    bus.on('life-lost', fn);
    bus.emit('life-lost', { enemyKind: 'worm' });
    bus.flush();
    bus.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
