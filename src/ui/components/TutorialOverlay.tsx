import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const STEPS = [
  'Welcome to the netrunner sim. Defend the network from intrusions.',
  'Tap a buildable tile to open the tower picker, then choose a tower to deploy.',
  'Tap SEND in the top bar to launch the next wave early — and earn bonus credits.',
  'Tap a placed tower to upgrade, sell, or change targeting priority.',
  'Earn shards by clearing levels.',
];

export function TutorialOverlay() {
  const { data, store, refresh } = useSave();
  const [step, setStep] = useState(0);
  if (data.settings.tutorialSeen) return null;

  const onNext = () => {
    if (step + 1 >= STEPS.length) {
      store.update((d) => { d.settings.tutorialSeen = true; });
      refresh();
    } else {
      setStep(step + 1);
    }
  };

  const isLast = step + 1 >= STEPS.length;

  return (
    <View style={styles.bg} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.content}>
          <Text style={styles.label}>STEP {step + 1} / {STEPS.length}</Text>
          <Text style={styles.text}>{STEPS[step]}</Text>
          <Pressable onPress={onNext} style={styles.btn}>
            <Text style={styles.btnText}>{isLast ? 'GOT IT' : 'NEXT'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000AA',
  },
  card: {
    flexDirection: 'row',
    margin: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    overflow: 'hidden',
    maxWidth: 380,
  },
  accent: { width: 4, backgroundColor: COLORS.tertiary },
  content: { flex: 1, padding: SPACING.lg, gap: SPACING.md },
  label: { ...TEXT.labelSmall, color: COLORS.tertiary },
  text: { ...TEXT.body },
  btn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnText: { ...TEXT.button, color: COLORS.textOnAccent },
});
