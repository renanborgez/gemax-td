import React from 'react';
import { Pressable, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { COLORS, TEXT, SPACING } from '@/render/theme';

const CHAMFER = 18;
const STROKE = 1.5;
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
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const width = useSharedValue(0);
  const height = useSharedValue(HEIGHT);

  const path = useDerivedValue(() => {
    const w = width.value;
    const h = height.value;
    const c = CHAMFER;
    const p = Skia.Path.Make();
    if (w <= 0) return p;
    p.moveTo(c, 0);
    p.lineTo(w, 0);
    p.lineTo(w, h - c);
    p.lineTo(w - c, h);
    p.lineTo(0, h);
    p.lineTo(0, c);
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
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: HEIGHT, justifyContent: 'center' },
  labelWrap: { alignItems: 'center', justifyContent: 'center' },
  label: { ...TEXT.headline, fontSize: 22, letterSpacing: 4, paddingHorizontal: SPACING.md },
});
