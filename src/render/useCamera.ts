import { useCallback, useEffect, useMemo } from 'react';
import {
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export type CameraTransform = Array<
  | { translateX: number }
  | { translateY: number }
  | { scaleX: number }
  | { scaleY: number }
>;

export type Camera = {
  zoom: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  transform: SharedValue<CameraTransform>;
  reset: () => void;
};

/**
 * Keeps the map within the canvas. If the scaled map is larger than the
 * canvas in this dimension, pan is bounded so edges can't pull inside.
 * Otherwise the pan is forced to the centered offset for the current zoom.
 */
export function clampPan(
  pan: number,
  zoom: number,
  mapPx: number,
  canvasPx: number,
): number {
  'worklet';
  const scaled = mapPx * zoom;
  if (scaled >= canvasPx) {
    return Math.max(canvasPx - scaled, Math.min(0, pan));
  }
  return (canvasPx - scaled) / 2;
}

export function useCamera(viewport: Viewport | null): Camera {
  const zoom = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  const reset = useCallback(() => {
    if (!viewport) return;
    zoom.value = 1;
    panX.value = viewport.defaultPanX;
    panY.value = viewport.defaultPanY;
  }, [viewport, zoom, panX, panY]);

  // When the viewport (re)initializes (canvas layout / orientation change),
  // recenter on its defaults so we don't leave the camera mid-pan/zoom from
  // the previous layout.
  useEffect(() => { reset(); }, [reset]);

  const transform = useDerivedValue<CameraTransform>(() => [
    { translateX: panX.value },
    { translateY: panY.value },
    { scaleX: zoom.value },
    { scaleY: zoom.value },
  ]);

  return useMemo<Camera>(
    () => ({ zoom, panX, panY, transform, reset }),
    [zoom, panX, panY, transform, reset],
  );
}
