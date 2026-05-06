import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { LootBadge } from '@/ui/components/LootBadge';
import { SectionCard } from '@/ui/components/SectionCard';
import { ALL_LEVELS } from '@/content/levels';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Win'>;

export function WinScreen({ navigation, route }: Props) {
  const { levelId, difficulty, stars, shards, totalWaves } = route.params;

  const { chapter, nextLevelId } = useMemo(() => {
    const current = ALL_LEVELS.find((l) => l.id === levelId);
    if (!current) return { chapter: 0, nextLevelId: undefined };
    const chapterLevels = ALL_LEVELS.filter((l) => l.chapter === current.chapter);
    const idx = chapterLevels.findIndex((l) => l.id === levelId);
    const next = idx >= 0 ? chapterLevels[idx + 1] : undefined;
    return { chapter: current.chapter, nextLevelId: next?.id };
  }, [levelId]);

  const goToList = () => navigation.navigate('LevelSelect', { chapter });

  return (
    <ScreenShell sectionTitle="Victory Results" onBack={goToList}>
      <View style={styles.hero}>
        <Text style={styles.heroLineMint}>SECTOR SECURED</Text>
        <Text style={styles.heroLineWhite}>MISSION COMPLETE</Text>
        <Text style={styles.stars}>
          {'★'.repeat(stars)}
          <Text style={styles.starsDim}>{'★'.repeat(3 - stars)}</Text>
        </Text>
      </View>

      <SectionCard title="LOOT ACQUIRED" trailingIcon="archive-outline">
        <View style={styles.badgeRow}>
          <LootBadge
            icon="diamond-outline"
            label="SHARDS"
            value={`+${shards}`}
            accent={COLORS.primary}
          />
          <LootBadge
            icon="star"
            label="STARS"
            value={`${stars}/3`}
            accent={COLORS.tertiary}
          />
        </View>
      </SectionCard>

      <SectionCard title="BATTLE STATS">
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>WAVES SURVIVED</Text>
          <Text style={styles.statValue}>{totalWaves}/{totalWaves}</Text>
        </View>
        <Text style={styles.flavor}>NETWORK INTEGRITY HELD — ALL INTRUSIONS NEUTRALIZED</Text>
      </SectionCard>

      <View style={styles.actions}>
        {nextLevelId !== undefined ? (
          <Pressable
            onPress={() => navigation.replace('Play', { levelId: nextLevelId, difficulty })}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>START NEXT</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={goToList} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>BACK TO LIST</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: SPACING.xs },
  heroLineMint: {
    ...TEXT.headline,
    color: COLORS.secondary,
    letterSpacing: 4,
    fontSize: 20,
  },
  heroLineWhite: {
    ...TEXT.title,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    fontSize: 16,
  },
  stars: {
    fontSize: 28,
    color: COLORS.tertiary,
    letterSpacing: 6,
    marginTop: SPACING.sm,
  },
  starsDim: { color: COLORS.bgElevated },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  statValue: { ...TEXT.title, fontSize: 16, color: COLORS.primary },
  flavor: { ...TEXT.bodySmall, color: COLORS.textMuted, fontStyle: 'italic' },
  actions: { gap: SPACING.sm, marginTop: SPACING.sm },
  btnPrimary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: { ...TEXT.button, color: COLORS.textOnAccent },
  btnSecondary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  btnSecondaryText: { ...TEXT.button, color: COLORS.primary },
});
