import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, type LayoutChangeEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { data, store, refresh } = useSave();
  const [confirmReset, setConfirmReset] = useState(false);

  const setVol = (k: 'sfx' | 'music', v: number) => {
    store.update((d) => { d.settings[k] = v; });
    refresh();
  };
  const onReset = async () => {
    await store.reset();
    refresh();
    setConfirmReset(false);
  };

  return (
    <ScreenShell
      sectionTitle="System Settings"
      onBack={() => navigation.goBack()}
    >
      <Section label={`EFFECTS  ${pct(data.settings.sfx)}`}>
        <VolumeBar value={data.settings.sfx} onChange={(v) => setVol('sfx', v)} />
      </Section>

      <Section label={`MUSIC  ${pct(data.settings.music)}`}>
        <VolumeBar value={data.settings.music} onChange={(v) => setVol('music', v)} />
      </Section>

      <View style={{ height: SPACING.md }} />

      <Pressable
        onPress={() => (confirmReset ? onReset() : setConfirmReset(true))}
        style={styles.danger}
      >
        <Text style={styles.dangerText}>
          {confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET SAVE DATA'}
        </Text>
      </Pressable>
    </ScreenShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function VolumeBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const widthRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => { widthRef.current = e.nativeEvent.layout.width; };
  const setFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const v = Math.max(0, Math.min(1, x / w));
    onChange(Math.round(v * 100) / 100);
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    })
  ).current;
  return (
    <View
      style={styles.barTrack}
      onLayout={onLayout}
      {...responder.panHandlers}
    >
      <View style={[styles.barFill, { width: `${value * 100}%` }]} />
      <View style={[styles.barThumb, { left: `${value * 100}%` }]} />
    </View>
  );
}

function pct(v: number): string { return `${Math.round(v * 100)}%`; }

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
  },
  label: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  barTrack: {
    height: 20,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  barThumb: {
    position: 'absolute',
    width: 16,
    height: 24,
    marginLeft: -8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.textPrimary,
  },
  danger: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  dangerText: { ...TEXT.button, color: COLORS.danger },
});
