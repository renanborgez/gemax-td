import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TEXT } from '@/render/theme';

const ENTER_MS = 380;
const SETTLE_MS = 220;
const HOLD_MS = 700;
const EXIT_MS = 380;
export const FINAL_WAVE_TOTAL_MS = ENTER_MS + SETTLE_MS + HOLD_MS + EXIT_MS;

export function FinalWaveOverlay({
  visible, onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    scale.value = 0.4;
    opacity.value = 0;
    flashOpacity.value = 0;

    scale.value = withSequence(
      withTiming(1.18, { duration: ENTER_MS, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1.0, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }),
      withDelay(HOLD_MS, withTiming(1.45, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) })),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: ENTER_MS - 80 }),
      withDelay(SETTLE_MS + HOLD_MS, withTiming(0, { duration: EXIT_MS }, (finished) => {
        if (finished) runOnJS(onComplete)();
      })),
    );
    flashOpacity.value = withSequence(
      withTiming(0.55, { duration: 120 }),
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [visible, onComplete, scale, opacity, flashOpacity]);

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.flash, flashStyle]} />
      <View style={styles.center}>
        <Animated.View style={textStyle}>
          <Text style={styles.text}>FINAL WAVE</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.danger,
  },
  text: {
    ...TEXT.button,
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.danger,
    letterSpacing: 6,
    textShadowColor: COLORS.danger,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
});
