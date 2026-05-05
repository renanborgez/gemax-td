import { useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import type { GridCoord } from '@/lib/types';
import { type Camera, MIN_ZOOM, MAX_ZOOM, clampPan } from '@/render/useCamera';

/**
 * Result of resolving a tap to a world location. PlayScreen consumes this to
 * drive UI state (selection, placement picker, etc.) — gestures stay
 * concerned only with input → semantic outcome translation.
 */
export type TapResult =
  | { type: 'buildable'; cell: GridCoord; screenX: number; screenY: number }
  | { type: 'occupied'; towerId: string }
  | { type: 'empty' };

type GestureOpts = {
  worldRef: { current: World };
  viewport: Viewport | null;
  camera: Camera;
  onTap: (r: TapResult) => void;
  onCameraMoveStart?: () => void;
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
  const topPadY = viewport?.topPaddingPx ?? 0;
  const bottomPadY = viewport?.bottomPaddingPx ?? 0;

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
        o.onTap({ type: 'empty' });
        return;
      }
      const grid = vp.worldToGrid(world);
      const occ = w.grid.occupantAt(grid);
      if (occ) {
        o.onTap({ type: 'occupied', towerId: occ });
        return;
      }
      if (w.grid.canBuild(grid)) {
        o.onTap({ type: 'buildable', cell: grid, screenX, screenY });
        return;
      }
      o.onTap({ type: 'empty' });
    }

    // No maxDuration cap — default lets slower presses still register as tap.
    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y);
      });

    // minDistance > tap.maxDistance — tap claims small drifts (≤10px); pan
    // only activates once the user has clearly committed to dragging.
    function notifyCameraMoveStart() {
      const cb = optsRef.current.onCameraMoveStart;
      if (cb) cb();
    }

    const pan = Gesture.Pan()
      .minDistance(14)
      .averageTouches(true)
      .onStart(() => {
        startPanX.value = camera.panX.value;
        startPanY.value = camera.panY.value;
        runOnJS(notifyCameraMoveStart)();
      })
      .onUpdate((e) => {
        const z = camera.zoom.value;
        camera.panX.value = clampPan(startPanX.value + e.translationX, z, mapW, canvasW);
        camera.panY.value = clampPan(startPanY.value + e.translationY, z, mapH, canvasH, topPadY, bottomPadY);
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        startZoom.value = camera.zoom.value;
        startPanX.value = camera.panX.value;
        startPanY.value = camera.panY.value;
        runOnJS(notifyCameraMoveStart)();
      })
      .onUpdate((e) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom.value * e.scale));
        const factor = newZoom / startZoom.value;
        const nextX = e.focalX - (e.focalX - startPanX.value) * factor;
        const nextY = e.focalY - (e.focalY - startPanY.value) * factor;
        camera.zoom.value = newZoom;
        camera.panX.value = clampPan(nextX, newZoom, mapW, canvasW);
        camera.panY.value = clampPan(nextY, newZoom, mapH, canvasH, topPadY, bottomPadY);
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [mapW, mapH, canvasW, canvasH, topPadY, bottomPadY, camera, startZoom, startPanX, startPanY]);
}
