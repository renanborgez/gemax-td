import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { LEVEL_BY_ID } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { ALL_ENEMY_DEFS } from '@/content/enemyDefs';
import type { EnemyKind } from '@/content/types';
import { useSave } from '@/app/providers/SaveProvider';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { SectionCard } from '@/ui/components/SectionCard';
import { AngularButton } from '@/ui/components/AngularButton';
import { Feather } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Briefing'>;

const ENEMY_BY_KIND = Object.fromEntries(
  ALL_ENEMY_DEFS.map((e) => [e.kind, e]),
) as Record<EnemyKind, (typeof ALL_ENEMY_DEFS)[number]>;

function uniqueEnemyKinds(level: (typeof LEVEL_BY_ID)[string]): EnemyKind[] {
  const seen = new Set<EnemyKind>();
  for (const wave of level.waves) {
    for (const group of wave.groups) seen.add(group.enemyKind);
  }
  return Array.from(seen);
}

export function BriefingScreen({ navigation, route }: Props) {
  const { levelId, difficulty } = route.params;
  const { store, refresh } = useSave();
  const level = LEVEL_BY_ID[levelId];

  if (!level) {
    return (
      <ScreenShell sectionTitle="Mission Briefing" onBack={() => navigation.goBack()}>
        <Text style={styles.missing}>Level not found: {levelId}</Text>
      </ScreenShell>
    );
  }

  const chapter = CHAPTER_BY_INDEX[level.chapter];
  const accent = chapter?.paletteAccent ?? COLORS.secondary;
  const isFinale = chapter?.finaleLevelId === level.id;
  const bossKind = isFinale ? chapter?.bossEnemyKind : undefined;
  const enemyKinds = uniqueEnemyKinds(level);

  return (
    <ScreenShell
      sectionTitle="Mission Briefing"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.hero}>
        {chapter && (
          <Text style={[styles.chapterLabel, { color: accent }]}>
            CHAPTER {chapter.index.toString().padStart(2, '0')} · {chapter.name.toUpperCase()}
          </Text>
        )}
        <Text style={styles.levelName}>{level.name}</Text>
        {chapter && <Text style={styles.subtitle}>{chapter.subtitle}</Text>}
        {isFinale && (
          <View style={[styles.finalePill, { borderColor: accent }]}>
            <Text style={[styles.finaleText, { color: accent }]}>⚑ FINALE</Text>
          </View>
        )}
      </View>

      <View style={styles.deployWrap}>
        <AngularButton
          label="START"
          icon={<Feather name="play" size={24} color={accent} />}
          color={accent}
          onPress={() => {
            store.update((d) => { d.meta.lastPlayedLevelId = levelId; });
            refresh();
            navigation.navigate('Play', { levelId, difficulty });
          }}
        />
      </View>

      {chapter && (
        <SectionCard title="INTEL">
          <Text style={styles.body}>{chapter.briefing}</Text>
        </SectionCard>
      )}

      <SectionCard title="INTRUSIONS">
        <View style={styles.enemyRow}>
          {enemyKinds.map((kind) => {
            const def = ENEMY_BY_KIND[kind];
            const isBoss = kind === bossKind;
            return (
              <View
                key={kind}
                style={[
                  styles.enemyChip,
                  isBoss && { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
                ]}
              >
                <Text style={[styles.enemyName, isBoss && { color: COLORS.danger }]}>
                  {isBoss ? `☠ ${def.displayName}` : def.displayName}
                </Text>
                <Text style={styles.enemyMeta}>
                  HP {def.baseStats.hp} · SPD {def.baseStats.speed.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="PARAMETERS">
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>WAVES</Text>
          <Text style={styles.statValue}>{level.waves.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>START CREDITS</Text>
          <Text style={styles.statValue}>{level.startCredits}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>LIVES</Text>
          <Text style={styles.statValue}>{level.startLives}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>DIFFICULTY</Text>
          <Text style={[styles.statValue, { color: accent }]}>
            {difficulty.toUpperCase()}
          </Text>
        </View>
      </SectionCard>

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  missing: { ...TEXT.body, color: COLORS.danger },
  hero: { gap: SPACING.xs },
  chapterLabel: { ...TEXT.label, fontSize: 11, letterSpacing: 1.5 },
  levelName: { ...TEXT.display, fontSize: 36, lineHeight: 40 },
  subtitle: { ...TEXT.body, color: COLORS.textMuted, fontStyle: 'italic' },
  finalePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  finaleText: { ...TEXT.buttonSmall, letterSpacing: 1.5 },
  body: { ...TEXT.body, color: COLORS.textPrimary },
  enemyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  enemyChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.bgElevated,
    gap: 2,
  },
  enemyName: { ...TEXT.label, fontSize: 12, color: COLORS.textPrimary },
  enemyMeta: { ...TEXT.labelSmall, fontSize: 9, color: COLORS.textMuted },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  statValue: { ...TEXT.title, fontSize: 16, color: COLORS.textPrimary },
  deployWrap: { marginTop: SPACING.sm },
});
