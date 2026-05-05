import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, Linking, type LayoutChangeEvent } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const APP_VERSION = '1.0.0';
const PRIVACY_URL = 'https://gemax.online/privacy';
const SUPPORT_URL = 'https://gemax.online/support';

export function SettingsScreen() {
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
    <ScreenShell sectionTitle="System Settings">
      <Section label={`EFFECTS  ${pct(data.settings.sfx)}`}>
        <VolumeBar label="Effects" value={data.settings.sfx} onChange={(v) => setVol('sfx', v)} />
      </Section>

      <Section label={`MUSIC  ${pct(data.settings.music)}`}>
        <VolumeBar label="Music" value={data.settings.music} onChange={(v) => setVol('music', v)} />
      </Section>

      <View style={styles.linkRow}>
        <Pressable
          onPress={() => { void Linking.openURL(PRIVACY_URL); }}
          style={styles.linkBtn}
          accessibilityRole="link"
          accessibilityLabel="Open privacy policy in browser"
        >
          <Text style={styles.linkText}>PRIVACY POLICY</Text>
        </Pressable>
        <Pressable
          onPress={() => { void Linking.openURL(SUPPORT_URL); }}
          style={styles.linkBtn}
          accessibilityRole="link"
          accessibilityLabel="Open support page in browser"
        >
          <Text style={styles.linkText}>SUPPORT</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => (confirmReset ? onReset() : setConfirmReset(true))}
        style={styles.danger}
        accessibilityRole="button"
        accessibilityLabel={confirmReset ? 'Confirm reset all progress' : 'Reset all progress'}
      >
        <Text style={styles.dangerText}>
          {confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET PROGRESS'}
        </Text>
      </Pressable>

      <Text style={styles.version}>V. {APP_VERSION}</Text>
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

function VolumeBar({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
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
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} volume`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
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
  linkRow: { flexDirection: 'row', gap: SPACING.sm },
  linkBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  linkText: { ...TEXT.button, color: COLORS.textPrimary, fontSize: 12 },
  version: {
    ...TEXT.labelSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
