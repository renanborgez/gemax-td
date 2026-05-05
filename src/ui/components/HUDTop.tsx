import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';
import type { EnemyKind } from '@/content/types';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export function HUDTop({
  onPause, onSpeed, onExit, accent,
}: {
  onPause: () => void;
  onSpeed: (s: 1 | 2 | 3) => void;
  onExit: () => void;
  /** Chapter accent — when set, tints the speed-active button. */
  accent?: string;
}) {
  const speedActiveBg = accent ?? COLORS.primary;
  const lives = useHudStore((s) => s.lives);
  const credits = useHudStore((s) => s.credits);
  const waveIndex = useHudStore((s) => s.waveIndex);
  const totalWaves = useHudStore((s) => s.totalWaves);
  const speed = useHudStore((s) => s.speed);
  const status = useHudStore((s) => s.waveStatus);

  const speedActive = speed === 2;
  const toggleSpeed = () => onSpeed(speedActive ? 1 : 2);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Stat label="LIVES" value={String(lives)} icon="♥" iconColor={COLORS.danger} />
        <Stat label="CREDITS" value={String(credits)} icon="◉" iconColor={COLORS.tertiary} />
        <Stat label="WAVE" value={`${Math.max(0, waveIndex + 1)}/${totalWaves}`} />
        <View style={styles.actions}>
          <Pressable
            onPress={toggleSpeed}
            style={[styles.btn, speedActive && { backgroundColor: speedActiveBg }]}
          >
            <Text style={[styles.btnText, speedActive && styles.btnTextActive]}>{speed}×</Text>
          </Pressable>
          {status === 'in-progress' && (
            <Pressable onPress={onPause} style={styles.btn}>
              <Text style={styles.btnText}>‖</Text>
            </Pressable>
          )}
          <Pressable onPress={onExit} style={[styles.btn, styles.btnExit]} accessibilityLabel="Abort mission">
            <Text style={[styles.btnText, styles.btnExitText]}>Abort</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function NextWaveBanner({
  worldRef, onShowNextWave, accent,
}: {
  worldRef: { current: World };
  onShowNextWave: () => void;
  /** Chapter accent — when set, tints the banner. */
  accent?: string;
}) {
  const nextAccent = accent ?? COLORS.tertiary;
  const waveIndex = useHudStore((s) => s.waveIndex);
  const status = useHudStore((s) => s.waveStatus);

  const showNext = status === 'idle' || status === 'cleared';
  const nextWave = showNext ? worldRef.current.level.waves[waveIndex + 1] : undefined;
  const nextSummary = nextWave ? aggregate(nextWave) : null;
  if (!nextSummary) return null;

  return (
    <Pressable
      onPress={onShowNextWave}
      style={[styles.nextRow, { borderColor: `${nextAccent}66`, backgroundColor: `${nextAccent}1F` }]}
      accessibilityLabel="Show next wave details"
    >
      <Text style={[styles.nextLabel, { color: nextAccent }]}>NEXT</Text>
      <Text style={[styles.nextValue, { color: nextAccent }]} numberOfLines={1}>
        {Object.entries(nextSummary).map(([k, c]) => `${shortName(k as EnemyKind)} ${c}`).join('  ·  ')}
      </Text>
      <Text style={[styles.nextHint, { color: nextAccent }]}>TAP FOR INFO</Text>
    </Pressable>
  );
}

function Stat({ label, value, icon, iconColor }: { label: string; value: string; icon?: string; iconColor?: string }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon && <Text style={[styles.icon, iconColor ? { color: iconColor } : null]}>{icon}</Text>}
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const ENEMY_NAMES: Record<EnemyKind, string> = {
  worm: 'Worm', trojan: 'Trojan', daemon: 'Daemon', rootkit: 'Rootkit',
  wraith: 'Wraith', hypervisor: 'Hyper', kernelghost: 'Kernel',
  'firmware-leech': 'Leech', 'darknet-titan': 'Titan', 'quantum-shade': 'Shade',
  'logic-gate': 'Gate', voidwalker: 'Void', apex: 'Apex',
};
function shortName(k: EnemyKind): string { return ENEMY_NAMES[k]; }

function aggregate(wave: World['level']['waves'][number]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgCard,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
  },
  col: { alignItems: 'flex-start' },
  label: { ...TEXT.labelSmall },
  value: { ...TEXT.hudValue },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { ...TEXT.hudValue, fontSize: 14 },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.tertiaryDim,
    backgroundColor: COLORS.tertiarySoft,
  },
  nextLabel: { ...TEXT.labelSmall, color: COLORS.tertiary },
  nextValue: { ...TEXT.hudValue, fontSize: 13, color: COLORS.tertiary, flex: 1 },
  nextHint: { ...TEXT.labelSmall, color: COLORS.tertiary, opacity: 0.8 },
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
  btnExit: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.danger },
  btnExitText: { color: COLORS.danger },
});
