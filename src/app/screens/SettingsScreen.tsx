import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const VOLS = [0, 0.25, 0.5, 0.75, 1];

export function SettingsScreen({ navigation }: Props) {
  const { data, store, refresh } = useSave();
  const [confirmReset, setConfirmReset] = useState(false);

  const setVol = (k: 'audioMaster' | 'sfx' | 'music', v: number) => {
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
      <Section label={`MASTER  ${pct(data.settings.audioMaster)}`}>
        {VOLS.map((v) => (
          <Pressable
            key={v}
            onPress={() => setVol('audioMaster', v)}
            style={[styles.dot, data.settings.audioMaster === v && styles.dotActive]}
          />
        ))}
      </Section>

      <Section label={`SFX  ${pct(data.settings.sfx)}`}>
        {VOLS.map((v) => (
          <Pressable
            key={v}
            onPress={() => setVol('sfx', v)}
            style={[styles.dot, data.settings.sfx === v && styles.dotActive]}
          />
        ))}
      </Section>

      <Section label={`MUSIC  ${pct(data.settings.music)}`}>
        {VOLS.map((v) => (
          <Pressable
            key={v}
            onPress={() => setVol('music', v)}
            style={[styles.dot, data.settings.music === v && styles.dotActive]}
          />
        ))}
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
      <View style={styles.row}>{children}</View>
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
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
  },
  dotActive: { backgroundColor: COLORS.primary },
  danger: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  dangerText: { ...TEXT.button, color: COLORS.danger },
});
