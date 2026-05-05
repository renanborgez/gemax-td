import { describe, it, expect } from 'vitest';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { SniperTower } from '@/entities/towers/SniperTower';
import { TeslaCoilTower } from '@/entities/towers/TeslaCoilTower';
import { VenomSpireTower } from '@/entities/towers/VenomSpireTower';
import { EMPTower } from '@/entities/towers/EMPTower';

describe('Tower subclasses', () => {
  const init = {
    id: 't:1',
    level: 1 as const,
    x: 0, y: 0,
    tileCoord: { col: 0, row: 0 },
    baseStats: { damage: 10, range: 3, fireRate: 1 },
    projectileKind: 'hitscan-bolt',
    targets: 'both' as const,
    defaultTargetPriority: 'first' as const,
  };

  it('FirewallTower constructs', () => {
    const t = new FirewallTower({ ...init, defKind: 'firewall' });
    expect(t.kind).toBe('tower:firewall');
    expect(t.targetPriority).toBe('first');
  });

  it('LogicBombTower has blastRadius', () => {
    const t = new LogicBombTower({ ...init, defKind: 'logic-bomb' });
    expect(t.blastRadius).toBeGreaterThan(0);
  });

  it('ICELanceTower has freezeDuration', () => {
    const t = new ICELanceTower({ ...init, defKind: 'ice-lance' });
    expect(t.freezeDuration).toBeGreaterThan(0);
  });

  it('SniperTower constructs', () => {
    const t = new SniperTower({ ...init, defKind: 'sniper' });
    expect(t.kind).toBe('tower:sniper');
  });

  it('TeslaCoilTower has chain config', () => {
    const t = new TeslaCoilTower({ ...init, defKind: 'tesla-coil' });
    expect(t.chainCount).toBeGreaterThan(1);
    expect(t.chainFalloff).toBeGreaterThan(0);
    expect(t.chainFalloff).toBeLessThanOrEqual(1);
    expect(t.chainJumpRadius).toBeGreaterThan(0);
  });

  it('VenomSpireTower has DoT config', () => {
    const t = new VenomSpireTower({ ...init, defKind: 'venom-spire' });
    expect(t.dotDps).toBeGreaterThan(0);
    expect(t.dotDuration).toBeGreaterThan(0);
  });

  it('EMPTower has stunDuration and stunRadius', () => {
    const t = new EMPTower({ ...init, defKind: 'emp' });
    expect(t.stunDuration).toBeGreaterThan(0);
    expect(t.stunRadius).toBeGreaterThan(0);
  });
});
