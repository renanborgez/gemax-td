import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { CHAPTERS } from '@/content/chapters';
import { useSave } from '@/app/providers/SaveProvider';
import type { ChapterDef, Difficulty } from '@/content/types';
import type { LevelProgress } from '@/meta/schema';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chapters'>;

const TRACKED_DIFFICULTY: Difficulty = 'normal';

function levelHasAnyStar(progress: LevelProgress | undefined): boolean {
  if (!progress) return false;
  return Object.values(progress.bestStarsByDifficulty).some((s) => (s ?? 0) >= 1);
}

function computeUnlockedChapters(campaign: Record<string, LevelProgress>): Set<number> {
  const chapters = Array.from(new Set(ALL_LEVELS.map((l) => l.chapter))).sort((a, b) => a - b);
  if (__DEV__) return new Set(chapters);
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

type ChapterStats = {
  totalLevels: number;
  starsEarned: number;
  starsPossible: number;
};

function computeChapterStats(
  chapter: number,
  campaign: Record<string, LevelProgress>,
): ChapterStats {
  const levels = ALL_LEVELS.filter((l) => l.chapter === chapter);
  let earned = 0;
  for (const lvl of levels) {
    earned += campaign[lvl.id]?.bestStarsByDifficulty[TRACKED_DIFFICULTY] ?? 0;
  }
  return {
    totalLevels: levels.length,
    starsEarned: earned,
    starsPossible: levels.length * 3,
  };
}

export function ChaptersScreen({ navigation }: Props) {
  const { data } = useSave();

  const unlocked = useMemo(
    () => computeUnlockedChapters(data.campaign),
    [data.campaign],
  );

  return (
    <ScreenShell
      sectionTitle="Chapters"
      onBack={() => navigation.reset({ index: 0, routes: [{ name: 'Title' }] })}
    >
      <Text style={styles.heading}>SECTORS</Text>
      {CHAPTERS.map((def) => {
        const isUnlocked = unlocked.has(def.index);
        const stats = computeChapterStats(def.index, data.campaign);
        return (
          <ChapterCard
            key={def.index}
            def={def}
            locked={!isUnlocked}
            stats={stats}
            onPress={() =>
              navigation.navigate('LevelSelect', { chapter: def.index })
            }
          />
        );
      })}
    </ScreenShell>
  );
}

function ChapterCard({
  def,
  locked,
  stats,
  onPress,
}: {
  def: ChapterDef;
  locked: boolean;
  stats: ChapterStats;
  onPress: () => void;
}) {
  const accent = def.paletteAccent;
  const secondary = def.paletteSecondary ?? accent;
  return (
    <Pressable
      style={[styles.card, locked && styles.cardLocked]}
      disabled={locked}
      onPress={onPress}
    >
      <AccentGradientBar primary={accent} secondary={secondary} />
      <View style={{ flex: 1, gap: SPACING.xs }}>
        <Text style={[styles.chapterIndex, { color: accent }]}>
          CH. {def.index.toString().padStart(2, '0')}
        </Text>
        <Text style={styles.chapterName}>{def.name.toUpperCase()}</Text>
        <Text style={styles.chapterSubtitle}>{def.subtitle}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaStars, { color: COLORS.tertiary }]}>
            ★ {stats.starsEarned}/{stats.starsPossible}
          </Text>
        </View>
      </View>
      {locked && (
        <View pointerEvents="none" style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={28} color={COLORS.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

function AccentGradientBar({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  const [h, setH] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    if (next !== h) setH(next);
  };
  return (
    <View style={styles.accentBar} onLayout={onLayout}>
      {h > 0 && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          <Rect x={0} y={0} width={4} height={h}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, h)}
              colors={[primary, secondary]}
            />
          </Rect>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    gap: SPACING.md,
    position: 'relative',
  },
  cardLocked: { opacity: 0.4 },
  accentBar: { width: 4, alignSelf: 'stretch', overflow: 'hidden' },
  chapterIndex: { ...TEXT.labelSmall, fontSize: 10, letterSpacing: 1.5 },
  chapterName: {
    ...TEXT.title,
    fontSize: 18,
    letterSpacing: 1,
    color: COLORS.textPrimary,
  },
  chapterSubtitle: { ...TEXT.body, fontSize: 12, color: COLORS.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
  },
  metaStars: { ...TEXT.labelSmall, fontSize: 11 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
