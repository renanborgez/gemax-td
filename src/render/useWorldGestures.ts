import { useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import type { TowerKind } from '@/content/types';
import { getTowerDef } from '@/entities/registry';
import { useHudStore } from '@/ui/hudStore';
import { type Camera, MIN_ZOOM, MAX_ZOOM, clampPan } from '@/render/useCamera';

type GestureOpts = {
  worldRef: { current: World };
  viewport: Viewport | null;
  camera: Camera;
  getBuyKind: () => TowerKind | null;
  setBuyKind: (k: TowerKind | null) => void;
};

export function useWorldGestures(opts: GestureOpts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const { camera, viewport } = opts;
  const startZoom = useSharedValue(1);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);

  // Worklets capture these as primitives at gesture-creation time. The
  // gesture is rebuilt when viewport identity (and therefore these values)
  // changes, e.g. on canvas layout / orientation change.
  const mapW = viewport?.mapWidthPx ?? 0;
  const mapH = viewport?.mapHeightPx ?? 0;
  const canvasW = viewport?.canvasWidthPx ?? 0;
  const canvasH = viewport?.canvasHeightPx ?? 0;

  return useMemo(() => {
    function handleTap(screenX: number, screenY: number) {
      const o = optsRef.current;
      const w = o.worldRef.current;
      const vp = o.viewport; if (!vp) return;
      // Inverse camera transform: screen → world (canvas px at zoom=1).
      const z = o.camera.zoom.value;
      const px = o.camera.panX.value;
      const py = o.camera.panY.value;
      const world = { x: (screenX - px) / z, y: (screenY - py) / z };
      // Reject taps outside the map bounds (slack area when fit-to-view).
      if (world.x < 0 || world.x >= vp.mapWidthPx || world.y < 0 || world.y >= vp.mapHeightPx) {
        return;
      }
      const grid = vp.worldToGrid(world);
      const buyKind = o.getBuyKind();

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
        o.setBuyKind(null);
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
      .maxDistance(10)
      .onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y);
      });

    // minDistance > tap.maxDistance — tap claims small drifts (≤10px); pan
    // only activates once the user has clearly committed to dragging.
    const pan = Gesture.Pan()
      .minDistance(14)
      .averageTouches(true)
      .onStart(() => {
        startPanX.value = camera.panX.value;
        startPanY.value = camera.panY.value;
      })
      .onUpdate((e) => {
        const z = camera.zoom.value;
        camera.panX.value = clampPan(startPanX.value + e.translationX, z, mapW, canvasW);
        camera.panY.value = clampPan(startPanY.value + e.translationY, z, mapH, canvasH);
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        startZoom.value = camera.zoom.value;
        startPanX.value = camera.panX.value;
        startPanY.value = camera.panY.value;
      })
      .onUpdate((e) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom.value * e.scale));
        const factor = newZoom / startZoom.value;
        const nextX = e.focalX - (e.focalX - startPanX.value) * factor;
        const nextY = e.focalY - (e.focalY - startPanY.value) * factor;
        camera.zoom.value = newZoom;
        camera.panX.value = clampPan(nextX, newZoom, mapW, canvasW);
        camera.panY.value = clampPan(nextY, newZoom, mapH, canvasH);
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [mapW, mapH, canvasW, canvasH, camera, startZoom, startPanX, startPanY]);
}
