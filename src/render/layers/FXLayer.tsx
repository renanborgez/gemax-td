import React from 'react';
import { Group } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import type { SharedValue } from 'react-native-reanimated';

export function FXLayer(_: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  // v1: empty group. Hooks are in place for hit-sparks/death-flashes in a later iteration.
  return <Group />;
}
