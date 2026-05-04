import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import type { TowerKind } from '@/content/types';
import { getTowerDef } from '@/entities/registry';
import { useHudStore } from '@/ui/hudStore';

export function useWorldGestures(opts: {
  worldRef: { current: World };
  getViewport: () => Viewport | null;
  getBuyKind: () => TowerKind | null;
  setBuyKind: (k: TowerKind | null) => void;
}) {
  return useMemo(() => {
    function handleTap(screenX: number, screenY: number) {
      const w = opts.worldRef.current;
      const vp = opts.getViewport(); if (!vp) return;
      const local = { x: screenX, y: screenY };  // gesture is canvas-local already
      const grid = vp.worldToGrid(local);
      const buyKind = opts.getBuyKind();

      if (buyKind) {
        const def = getTowerDef(buyKind);
        if (!w.grid.canBuild(grid) || w.credits < def.cost) return;
        w.credits -= def.cost;
        const center = vp.gridToWorld(grid);
        const id = w.idGen('tower');
        const tower = new def.classRef({
          id, defKind: def.kind, level: 1,
          x: center.x / vp.tileSize, y: center.y / vp.tileSize,
          tileCoord: grid,
          baseStats: { ...def.baseStats },
          projectileKind: def.projectileKind,
          targets: def.targets,
          defaultTargetPriority: def.defaultTargetPriority,
        });
        w.grid.occupy(grid, id);
        w.entities.towers.push(tower);
        w.bus.emit('tower-placed', { towerId: id, kind: def.kind });
        w.bus.emit('credits-changed', { credits: w.credits });
        opts.setBuyKind(null);
        return;
      }

      // No buy intent — try to select a tower at the tapped tile.
      const occ = w.grid.occupantAt(grid);
      if (occ) {
        w.selection = { towerId: occ };
        useHudStore.getState().setSelectedTowerId(occ);
      } else {
        w.selection = {};
        useHudStore.getState().setSelectedTowerId(null);
      }
    }

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y);
      });

    return Gesture.Race(tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
