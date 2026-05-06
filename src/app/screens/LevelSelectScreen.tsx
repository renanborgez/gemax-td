import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
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

function isChapterUnlocked(
  chapter: number,
  campaign: Record<string, LevelProgress>,
): boolean {
  if (__DEV__) return true;
  if (chapter === 0) return true;
  const prev = chapter - 1;
  const prevLevels = ALL_LEVELS.filter((l) => l.chapter === prev);
  if (prevLevels.length === 0) return false;
  return prevLevels.every((l) => levelHasAnyStar(campaign[l.id]));
}

export function LevelSelectScreen({ navigation, route }: Props) {
  const { data, store, refresh } = useSave();
  const chapter = route.params.chapter;
  const def = CHAPTER_BY_INDEX[chapter];
  const accent = def?.paletteAccent ?? COLORS.secondary;

  const levels = useMemo(
    () => ALL_LEVELS.filter((l) => l.chapter === chapter),
    [chapter],
  );
  const chapterLocked = useMemo(
    () => !isChapterUnlocked(chapter, data.campaign),
    [chapter, data.campaign],
  );
  // Index of the next playable mission: first level in this chapter that the
  // player hasn't earned any star on (current difficulty). -1 = chapter cleared.
  const nextLevelIdx = useMemo(
    () =>
      levels.findIndex(
        (l) => (data.campaign[l.id]?.bestStarsByDifficulty[difficulty] ?? 0) === 0,
      ),
    [levels, data.campaign],
  );

  return (
    <ScreenShell
      sectionTitle={def ? def.name : `Chapter ${chapter}`}
      onBack={() => navigation.navigate('Chapters')}
    >
      <View style={[styles.chapterHeader, chapterLocked && styles.chapterHeaderLocked]}>
        <View style={[styles.chapterAccentBar, { backgroundColor: accent }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.chapterIndex, { color: accent }]}>
            CH. {chapter.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.chapterName}>
            {(def?.name ?? `Chapter ${chapter}`).toUpperCase()}
          </Text>
          {def?.subtitle && <Text style={styles.chapterSubtitle}>{def.subtitle}</Text>}
        </View>
      </View>
      <Text style={styles.heading}>MISSIONS</Text>
      {levels.map((lvl, idx) => {
        const stars = data.campaign[lvl.id]?.bestStarsByDifficulty[difficulty] ?? 0;
        const isFinale = def?.finaleLevelId === lvl.id;
        const isCleared = stars > 0;
        const isNext = !chapterLocked && idx === nextLevelIdx;
        const isFutureLocked = !__DEV__ && !chapterLocked && !isCleared && !isNext;
        const disabled = !__DEV__ && (chapterLocked || !isNext);
        const dimmed = !__DEV__ && (chapterLocked || !isNext);
        const subtitleText = chapterLocked
          ? `LOCKED — CLEAR CHAPTER ${chapter - 1} FIRST`
          : isCleared
            ? 'CLEARED'
            : isFutureLocked
              ? 'LOCKED — CLEAR PREVIOUS MISSION'
              : def?.subtitle ?? `CHAPTER ${chapter}`;
        return (
          <Pressable
            key={lvl.id}
            style={[styles.card, dimmed && styles.cardLocked]}
            disabled={disabled}
            onPress={() => {
              store.update((d) => { d.meta.lastPlayedLevelId = lvl.id; });
              refresh();
              navigation.navigate('Play', { levelId: lvl.id, difficulty });
            }}
          >
            <View style={[styles.accent, { backgroundColor: accent }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.cardNameRow}>
                <Text style={styles.cardName}>{lvl.name}</Text>
                {isFinale && (
                  <View style={[styles.finaleBadge, { borderColor: accent }]}>
                    <Ionicons name="flag" size={10} color={accent} />
                    <Text style={[styles.finaleBadgeText, { color: accent }]}>FINALE</Text>
                  </View>
                )}
                {isNext && (
                  <View style={[styles.nextBadge, { borderColor: accent }]}>
                    <Ionicons name="play" size={10} color={accent} />
                    <Text style={[styles.nextBadgeText, { color: accent }]}>NEXT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSub}>{subtitleText}</Text>
            </View>
            <Text style={styles.cardStars}>
              {'★'.repeat(stars)}
              {'☆'.repeat(3 - stars)}
            </Text>
            {!disabled && (
              <Pressable
                style={styles.infoBtn}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('Briefing', { levelId: lvl.id, difficulty });
                }}
              >
                <Ionicons name="information-circle-outline" size={22} color={COLORS.textMuted} />
              </Pressable>
            )}
            {(chapterLocked || isFutureLocked) && (
              <View pointerEvents="none" style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={24} color={COLORS.textMuted} />
              </View>
            )}
          </Pressable>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.sm },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
  },
  chapterHeaderLocked: { opacity: 0.4 },
  chapterAccentBar: { width: 4, height: 36, borderRadius: 2 },
  chapterIndex: { ...TEXT.labelSmall, fontSize: 10, letterSpacing: 1.5 },
  chapterName: { ...TEXT.title, fontSize: 18, letterSpacing: 1, color: COLORS.textPrimary },
  chapterSubtitle: { ...TEXT.body, fontSize: 12, color: COLORS.textMuted },
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
  accent: { width: 3, alignSelf: 'stretch', marginRight: SPACING.sm },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  cardName: { ...TEXT.title, fontSize: 15, color: COLORS.textPrimary },
  cardSub: { ...TEXT.labelSmall, color: COLORS.textMuted },
  cardStars: { color: COLORS.tertiary, fontSize: 16, letterSpacing: 2 },
  finaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  finaleBadgeText: { ...TEXT.labelSmall, fontSize: 9, letterSpacing: 1 },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  nextBadgeText: { ...TEXT.labelSmall, fontSize: 9, letterSpacing: 1 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
});
