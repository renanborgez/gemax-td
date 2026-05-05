import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';
import type { LevelProgress } from '@/meta/schema';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const difficulty: Difficulty = 'normal';

function levelHasAnyStar(progress: LevelProgress | undefined): boolean {
  if (!progress) return false;
  return Object.values(progress.bestStarsByDifficulty).some((s) => (s ?? 0) >= 1);
}

function computeUnlockedChapters(
  campaign: Record<string, LevelProgress>,
): Set<number> {
  const chapters = Array.from(new Set(ALL_LEVELS.map((l) => l.chapter))).sort((a, b) => a - b);
  const unlocked = new Set<number>();
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]!;
    if (i === 0) {
      unlocked.add(ch);
      continue;
    }
    const prev = chapters[i - 1]!;
    const prevAllPassed = ALL_LEVELS
      .filter((l) => l.chapter === prev)
      .every((l) => levelHasAnyStar(campaign[l.id]));
    if (prevAllPassed) unlocked.add(ch);
    else break;
  }
  return unlocked;
}

export function LevelSelectScreen({ navigation }: Props) {
  const { data } = useSave();

  const unlockedChapters = useMemo(
    () => computeUnlockedChapters(data.campaign),
    [data.campaign],
  );

  return (
    <ScreenShell
      sectionTitle="Select Target"
      onBack={() => navigation.reset({ index: 0, routes: [{ name: 'Title' }] })}
    >
      <Text style={styles.heading}>MISSIONS</Text>
      {ALL_LEVELS.map((lvl) => {
        const stars = data.campaign[lvl.id]?.bestStarsByDifficulty[difficulty] ?? 0;
        const locked = !unlockedChapters.has(lvl.chapter);
        return (
          <Pressable
            key={lvl.id}
            style={[styles.card, locked && styles.cardLocked]}
            disabled={locked}
            onPress={() => navigation.navigate('Play', { levelId: lvl.id, difficulty })}
          >
            <View style={styles.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardName}>{lvl.name}</Text>
              <Text style={styles.cardSub}>
                {locked ? `LOCKED — CLEAR CHAPTER ${lvl.chapter - 1} FIRST` : `CHAPTER ${lvl.chapter}`}
              </Text>
            </View>
            <Text style={styles.cardStars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
            {locked && (
              <View pointerEvents="none" style={styles.lockOverlay}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    gap: SPACING.md,
    position: 'relative',
  },
  cardLocked: { opacity: 0.4 },
  accent: { width: 3, alignSelf: 'stretch', backgroundColor: COLORS.secondary, marginRight: SPACING.sm },
  cardName: { ...TEXT.title, fontSize: 15, color: COLORS.textPrimary },
  cardSub: { ...TEXT.labelSmall, color: COLORS.textMuted },
  cardStars: { color: COLORS.tertiary, fontSize: 16, letterSpacing: 2 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 28 },
});
