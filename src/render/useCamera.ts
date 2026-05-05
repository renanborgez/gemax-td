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
 * Keeps the map within the canvas. `leadPad`/`trailPad` reserve blank space
 * at the leading/trailing edges (used for the Y axis to leave breathing room
 * above the spawn row and below the base). When the scaled map plus padding
 * fits inside the canvas, pan is forced to either the lead-anchored offset
 * (any pad > 0) or the centered offset (both pads zero — legacy X behavior).
 */
export function clampPan(
  pan: number,
  zoom: number,
  mapPx: number,
  canvasPx: number,
  leadPad: number = 0,
  trailPad: number = 0,
): number {
  'worklet';
  const scaled = mapPx * zoom;
  const max = leadPad;
  const min = canvasPx - scaled - trailPad;
  if (min >= max) {
    if (leadPad > 0 || trailPad > 0) return leadPad;
    return (canvasPx - scaled) / 2;
  }
  return Math.max(min, Math.min(max, pan));
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
