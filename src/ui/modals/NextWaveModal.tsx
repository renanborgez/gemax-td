import React, { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';
import { getEnemyDef } from '@/entities/registry';
import { ENEMY_ICON_COLORS, makeEnemyIconPath } from '@/render/enemyIcons';
import type { EnemyKind, WaveDef } from '@/content/types';

const ICON_SIZE = 28;

const ENEMY_BLURB: Record<EnemyKind, string> = {
  mote: 'Pure swarm filler. Single-HP padding — eats a shot but tilts wave count.',
  sprite: 'Tiny flying runner. Highest base speed in the bestiary — tag early.',
  worm: 'Fast, fragile crawler. Arrives in swarms — splash damage shines here.',
  packet: 'Tiny ground runner. Half the worm’s HP, ~50% faster — tag before the bend.',
  drone: 'Mid-tier flyer. Light armor; eligible only for towers that hit air.',
  crawler: 'Armored mid creep. Slower than trojan, harder shell — pierce favored.',
  stalker: 'Fast mid creep. Closes the path quickly — splash + slow are useful.',
  phantom: 'Mid-tier ghost. Light armor; phase mechanics planned for late polish.',
  trojan: 'Mid-tier carrier with light armor. Trades speed for durability.',
  bastion: 'Light shell, heavy armor. Bullets glance off — pierce or AoE.',
  forkbomb: 'Splits into two worms on death. Sustain DPS or eat a leak chain.',
  cache: 'Heal-aura support. Slowly heals nearby creeps — kill the cache first.',
  reaper: 'Fast heavy. Lower armor than daemon but reaches the base sooner.',
  knight: 'Armored heavy. Heavy plate; sniper / plasma / mortar pierce required.',
  sentinel: 'Heavy flyer. Highest-HP airborne unit — needs flak coverage.',
  construct: 'Heavy splitter. Death-spawns two trojans — finish cleanly or compound.',
  bulwark: 'Slow tank with heavy armor. High bounty — mortar / sniper friendly.',
  daemon: 'Heavy ground unit. High HP and armor — pierce or focus fire.',
  rootkit: 'Boss-class threat. Massive HP pool; expect to commit your full grid.',
  wraith: 'Phasing boss-class intruder. Faster than a rootkit — sustained DPS only.',
  hypervisor: 'Slow, heavily armored hypervisor. Brings server-rack durability — bring pierce.',
  kernelghost: 'Endgame kernel-level intruder. Largest HP pool; lock down with stuns + DoT.',
  'firmware-leech': 'Parasitic boss that heals nearby intrusions — kill the leech first.',
  'darknet-titan': 'Slow titan with heavy armor. Spawns adds on death — clean burst kill.',
  'quantum-shade': 'Fast phasing boss. Sustained DPS only; bursts are wasted while phased.',
  'logic-gate': 'Mechanical boss with extreme armor. Spawns daemons on death.',
  voidwalker: 'Massive heal-aura. Lock down adjacent enemies before targeting the boss.',
  apex: 'Final boss. Maximum HP, armor, and adds — bring everything you have.',
};

export function NextWaveModal({
  visible, wave, waveNumber, onDismiss,
}: {
  visible: boolean;
  wave: WaveDef | null;
  waveNumber: number;
  onDismiss: () => void;
}) {
  const groups = wave ? aggregate(wave) : null;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.bg} onPress={onDismiss}>
        <Pressable onPress={() => {}} style={styles.card}>
          <Text style={styles.title}>WAVE {waveNumber} INCOMING</Text>
          {!groups || Object.keys(groups).length === 0 ? (
            <Text style={styles.empty}>No further waves queued.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: SPACING.sm }}>
              {Object.entries(groups).map(([kind, count]) => {
                const def = getEnemyDef(kind as EnemyKind);
                return (
                  <View key={kind} style={styles.row}>
                    <View style={styles.rowHead}>
                      <View style={styles.nameWrap}>
                        <EnemyIcon kind={kind as EnemyKind} />
                        <Text style={styles.name}>{def.displayName}</Text>
                      </View>
                      <Text style={styles.count}>×{count}</Text>
                    </View>
                    <Text style={styles.blurb}>{ENEMY_BLURB[kind as EnemyKind]}</Text>
                    <View style={styles.statRow}>
                      <Stat label="HP" value={String(def.baseStats.hp)} />
                      <Stat label="SPD" value={def.baseStats.speed.toFixed(1)} />
                      <Stat label="ARM" value={String(def.baseStats.armor)} />
                      <Stat label="BOUNTY" value={String(def.bounty)} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Pressable onPress={onDismiss} style={styles.btn}>
            <Text style={styles.btnText}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EnemyIcon({ kind }: { kind: EnemyKind }) {
  const path = useMemo(() => makeEnemyIconPath(kind, ICON_SIZE), [kind]);
  return (
    <Canvas style={styles.icon}>
      <Path
        path={path}
        transform={[{ translateX: ICON_SIZE / 2 }, { translateY: ICON_SIZE / 2 }]}
        style="stroke"
        strokeWidth={1.5}
        strokeJoin="round"
        strokeCap="round"
        color={ENEMY_ICON_COLORS[kind]}
      />
    </Canvas>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function aggregate(wave: WaveDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000DD', padding: SPACING.lg },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
    minWidth: 280,
    maxWidth: 420,
    width: '100%',
    backgroundColor: COLORS.bgCard,
  },
  title: { ...TEXT.title, color: COLORS.tertiary, textAlign: 'center' },
  empty: { ...TEXT.body, color: COLORS.textMuted, textAlign: 'center' },
  row: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    gap: SPACING.xs,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  name: { ...TEXT.title, fontSize: 16, color: COLORS.textPrimary },
  count: { ...TEXT.hudValue, color: COLORS.tertiary },
  blurb: { ...TEXT.bodySmall, color: COLORS.textMuted },
  statRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  stat: { alignItems: 'flex-start' },
  statLabel: { ...TEXT.labelSmall },
  statValue: { ...TEXT.body, color: COLORS.textPrimary },
  btn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  btnText: { ...TEXT.button, color: COLORS.textPrimary },
});
