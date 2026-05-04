import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export function HUDTop({
  onPause, onSpeed, onSendNextWave,
}: { onPause: () => void; onSpeed: (s: 1 | 2 | 3) => void; onSendNextWave: () => void }) {
  const lives = useHudStore((s) => s.lives);
  const credits = useHudStore((s) => s.credits);
  const waveIndex = useHudStore((s) => s.waveIndex);
  const totalWaves = useHudStore((s) => s.totalWaves);
  const speed = useHudStore((s) => s.speed);
  const status = useHudStore((s) => s.waveStatus);

  return (
    <View style={styles.root}>
      <Stat label="LIVES" value={String(lives)} />
      <Stat label="CREDITS" value={String(credits)} />
      <Stat label="WAVE" value={`${Math.max(0, waveIndex + 1)}/${totalWaves}`} />
      <View style={styles.actions}>
        <Pressable onPress={onPause} style={styles.btn}>
          <Text style={styles.btnText}>‖</Text>
        </Pressable>
        {[1, 2].map((s) => {
          const active = speed === s;
          return (
            <Pressable
              key={s}
              onPress={() => onSpeed(s as 1 | 2)}
              style={[styles.btn, active && styles.btnActive]}
            >
              <Text style={[styles.btnText, active && styles.btnTextActive]}>{s}×</Text>
            </Pressable>
          );
        })}
        {(status === 'idle' || status === 'cleared') && (
          <Pressable onPress={onSendNextWave} style={[styles.btn, styles.send]}>
            <Text style={[styles.btnText, styles.sendText]}>SEND</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
  },
  col: { alignItems: 'flex-start' },
  label: { ...TEXT.labelSmall },
  value: { ...TEXT.hudValue },
  actions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgElevated,
    minWidth: 38,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: COLORS.primary },
  btnText: { ...TEXT.buttonSmall, color: COLORS.textPrimary },
  btnTextActive: { color: COLORS.textOnAccent },
  send: { backgroundColor: COLORS.tertiary },
  sendText: { color: COLORS.textOnAccent },
});
