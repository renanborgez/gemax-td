import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { AngularButton } from '@/ui/components/AngularButton';
import { ChapterHero3D } from '@/ui/components/ChapterHero3D';
import { useSave } from '@/app/providers/SaveProvider';
import { ALL_LEVELS, LEVEL_BY_ID } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import type { LevelProgress } from '@/meta/schema';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Title'>;

// Reference layout height the "ideal" sizes were tuned for. Anything smaller
// scales every element down so the screen never needs to scroll.
const REF_HEIGHT = 720;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.0;

// Base sizes — restored from the previous (visually-tuned) values.
const BASE = {
  titleFont: 56,
  titleLine: 64,
  dot: 8,
  statLabel: 10,
  statValue: 24,
  statValueLine: 28,
  statIcon: 18,
  heroSize: 220,
  heroChapter: 10,
  heroName: 14,
  gapMd: SPACING.md,
  gapSm: SPACING.sm,
  gapXs: SPACING.xs,
  cardPadV: SPACING.sm,
  cardPadH: SPACING.md,
} as const;

function pickHeroChapter(
  lastChapter: number | undefined,
  campaign: Record<string, LevelProgress>,
): number {
  if (lastChapter !== undefined) return lastChapter;
  // Highest chapter with any star earned. Falls back to chapter 0 for new accounts.
  let best = 0;
  for (const lvl of ALL_LEVELS) {
    const stars = campaign[lvl.id]?.bestStarsByDifficulty ?? {};
    const any = Object.values(stars).some((s) => (s ?? 0) >= 1);
    if (any && lvl.chapter > best) best = lvl.chapter;
  }
  return best;
}

export function TitleScreen({ navigation }: Props) {
  const { data, store } = useSave();

  const lastLevelId = data.meta.lastPlayedLevelId;
  const lastLevel = lastLevelId ? LEVEL_BY_ID[lastLevelId] : undefined;
  const canContinue = !!lastLevel;
  const continueLabel = lastLevel ? `CONTINUE — ${lastLevel.name.toUpperCase()}` : 'CONTINUE';

  const heroChapter = useMemo(
    () => pickHeroChapter(lastLevel?.chapter, data.campaign),
    [lastLevel, data.campaign],
  );
  const heroChapterDef = CHAPTER_BY_INDEX[heroChapter];
  const heroAccent = heroChapterDef?.paletteAccent ?? COLORS.secondary;

  // Measured size of the body region. Height drives the global scale; width
  // drives the hero size so the 3D scene fills available width.
  const [bodySize, setBodySize] = useState({ w: 0, h: 0 });
  const scale =
    bodySize.h === 0
      ? MAX_SCALE
      : Math.max(MIN_SCALE, Math.min(MAX_SCALE, bodySize.h / REF_HEIGHT));
  const heroSize =
    bodySize.w > 0
      ? Math.min(bodySize.w, bodySize.h * 0.55)
      : BASE.heroSize * scale;

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== bodySize.w || height !== bodySize.h) {
      setBodySize({ w: width, h: height });
    }
  };

  const onContinue = () => {
    if (!lastLevel) return;
    navigation.navigate('Briefing', {
      levelId: lastLevel.id,
      difficulty: store.current().settings.difficultyDefault,
    });
  };

  return (
    <ScreenShell sectionTitle="Main Menu" scroll={false}>
      <View style={[styles.body, { gap: BASE.gapMd * scale }]} onLayout={onBodyLayout}>
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.titleLine,
              { fontSize: BASE.titleFont * scale, lineHeight: BASE.titleLine * scale },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            <Text style={styles.titleWhite}>GeMax </Text>
            <Text style={styles.titleMint}>TD</Text>
          </Text>
          <View style={[styles.dividerRow, { marginTop: BASE.gapMd * scale }]}>
            <View
              style={[
                styles.dot,
                {
                  width: BASE.dot * scale,
                  height: BASE.dot * scale,
                  borderRadius: (BASE.dot * scale) / 2,
                },
              ]}
            />
            <View style={styles.dividerLine} />
          </View>
        </View>

        <View style={[styles.summaryRow, { gap: BASE.gapMd * scale }]}>
          <View
            style={[
              styles.statCard,
              styles.levelCard,
              {
                paddingVertical: BASE.cardPadV * scale,
                paddingHorizontal: BASE.cardPadH * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.statLabel,
                { color: COLORS.secondary, fontSize: BASE.statLabel * scale },
              ]}
            >
              LEVEL
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: COLORS.secondary,
                  fontSize: BASE.statValue * scale,
                  lineHeight: BASE.statValueLine * scale,
                },
              ]}
            >
              {data.meta.playerLevel}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              styles.shardCard,
              {
                paddingVertical: BASE.cardPadV * scale,
                paddingHorizontal: BASE.cardPadH * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.statLabel,
                { color: COLORS.tertiary, fontSize: BASE.statLabel * scale },
              ]}
            >
              SHARDS
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: COLORS.tertiary,
                  fontSize: BASE.statValue * scale,
                  lineHeight: BASE.statValueLine * scale,
                },
              ]}
            >
              {data.meta.shards}{' '}
              <Text style={[styles.statIcon, { fontSize: BASE.statIcon * scale }]}>◆</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.heroWrap, { gap: BASE.gapXs * scale }]}>
          <ChapterHero3D
            chapterIndex={heroChapter}
            accent={heroAccent}
            size={heroSize}
          />
          {heroChapterDef && (
            <View style={[styles.heroLabel, { gap: 2 * scale }]}>
              <Text
                style={[
                  styles.heroChapter,
                  { color: heroAccent, fontSize: BASE.heroChapter * scale },
                ]}
              >
                CH. {heroChapter.toString().padStart(2, '0')}
              </Text>
              <Text style={[styles.heroName, { fontSize: BASE.heroName * scale }]}>
                {heroChapterDef.name.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.actions, { gap: BASE.gapMd * scale }]}>
        {canContinue && (
          <AngularButton label={continueLabel} color={COLORS.secondary} onPress={onContinue} />
        )}
        <AngularButton
          label={canContinue ? 'NEW MISSION' : 'PLAY'}
          onPress={() => navigation.navigate('Chapters')}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  actions: {},
  titleBlock: { gap: 0 },
  titleLine: {
    ...TEXT.display,
    letterSpacing: -1,
  },
  titleWhite: { color: COLORS.textPrimary },
  titleMint: { color: COLORS.secondary },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: { backgroundColor: COLORS.primary },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  summaryRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 4,
  },
  levelCard: {
    backgroundColor: COLORS.secondarySoft,
    borderColor: `${COLORS.secondary}55`,
  },
  shardCard: {
    backgroundColor: COLORS.tertiarySoft,
    borderColor: `${COLORS.tertiary}55`,
  },
  statLabel: { ...TEXT.labelSmall, letterSpacing: 1.2, opacity: 0.85 },
  statValue: { ...TEXT.display },
  statIcon: {},
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { alignItems: 'center' },
  heroChapter: { ...TEXT.labelSmall, letterSpacing: 1.5 },
  heroName: { ...TEXT.title, letterSpacing: 1.5, color: COLORS.textPrimary },
});
