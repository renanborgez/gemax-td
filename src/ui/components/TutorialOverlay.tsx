import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';

const STEPS = [
  'Welcome to the netrunner sim. Defend the network from intrusions.',
  'Tap a tower in the bottom bar to buy. Tap a buildable tile to place.',
  'Tap SEND in the top bar to launch the next wave early — and earn bonus credits.',
  'Tap a placed tower to upgrade, sell, or change targeting priority.',
  'Earn shards by clearing levels — spend them in the Tech Tree to install upgrades.',
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

  return (
    <View style={styles.bg} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.text}>{STEPS[step]}</Text>
        <Pressable onPress={onNext} style={styles.btn}>
          <Text style={styles.btnText}>{step + 1 >= STEPS.length ? 'GOT IT' : 'NEXT'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1AAA' },
  card: { padding: 20, margin: 24, borderColor: '#FFB347', borderWidth: 1, backgroundColor: '#0A0E1AEE', gap: 12, maxWidth: 360 },
  text: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  btn: { paddingVertical: 10, alignItems: 'center', borderColor: '#FFB347', borderWidth: 1 },
  btnText: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
});
