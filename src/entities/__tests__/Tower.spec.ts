import { describe, it, expect } from 'vitest';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';

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
});
