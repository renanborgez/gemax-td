import React from 'react';
import { Pressable, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { COLORS, TEXT, SPACING } from '@/render/theme';

const CHAMFER = 18;
const STROKE = 2;
const HEIGHT = 78;

/**
 * Sci-fi PLAY button: chamfered rectangle (top-left + bottom-right corners
 * cut), drawn with a Skia stroke. Re-measures on layout so it always fills
 * its parent's width.
 */
export function AngularButton({
  label,
  onPress,
  color = COLORS.primary,
  icon,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  /** Optional element rendered to the left of the label. */
  icon?: React.ReactNode;
}) {
  const width = useSharedValue(0);
  const height = useSharedValue(HEIGHT);

  const path = useDerivedValue(() => {
    const w = width.value;
    const h = height.value;
    const c = CHAMFER;
    const inset = STROKE / 2;
    const p = Skia.Path.Make();
    if (w <= 0) return p;
    const x0 = inset;
    const y0 = inset;
    const x1 = w - inset;
    const y1 = h - inset;
    p.moveTo(x0 + c, y0);
    p.lineTo(x1, y0);
    p.lineTo(x1, y1 - c);
    p.lineTo(x1 - c, y1);
    p.lineTo(x0, y1);
    p.lineTo(x0, y0 + c);
    p.close();
    return p;
  }, [width, height]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
    height.value = e.nativeEvent.layout.height;
  };

  return (
    <Pressable onPress={onPress} style={styles.root} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={path} color={`${color}1F`} style="fill" />
        <Path path={path} color={color} style="stroke" strokeWidth={STROKE} />
      </Canvas>
      <View style={styles.labelWrap}>
        {icon}
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: HEIGHT, justifyContent: 'center' },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  label: { ...TEXT.headline, fontSize: 22, letterSpacing: 4, paddingHorizontal: SPACING.md },
});
