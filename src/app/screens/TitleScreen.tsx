import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { AngularButton } from '@/ui/components/AngularButton';
import { ChapterEmblem } from '@/ui/components/ChapterEmblem';
import { useSave } from '@/app/providers/SaveProvider';
import { ALL_LEVELS, LEVEL_BY_ID } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import type { LevelProgress } from '@/meta/schema';
import { COLORS, TEXT, SPACING } from '@/render/theme';

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
  heroSize: 220,
  heroChapter: 10,
  heroName: 14,
  gapMd: SPACING.md,
  gapXs: SPACING.xs,
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
  const continueLabel = 'NEXT MISSION';

  const heroChapter = useMemo(
    () => pickHeroChapter(lastLevel?.chapter, data.campaign),
    [lastLevel, data.campaign],
  );
  const heroChapterDef = CHAPTER_BY_INDEX[heroChapter];
  const heroAccent = heroChapterDef?.paletteAccent ?? COLORS.secondary;
  const heroSecondary = heroChapterDef?.paletteSecondary;

  // Measured size of the body region drives the global scale.
  const [bodySize, setBodySize] = useState({ w: 0, h: 0 });
  const scale =
    bodySize.h === 0
      ? MAX_SCALE
      : Math.max(MIN_SCALE, Math.min(MAX_SCALE, bodySize.h / REF_HEIGHT));
  // Hero canvas spans full device width (bleeds past ScreenShell horizontal
  // padding); its height is capped by available body height so it never pushes
  // the actions off-screen. Width and height are decoupled so a wide-but-short
  // body still fills the full screen width without clipping.
  const screenW = useWindowDimensions().width;
  const heroW = screenW;
  const heroH =
    bodySize.h > 0 ? Math.min(screenW, bodySize.h * 0.72) : screenW;

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

        <View style={[styles.heroWrap, { gap: BASE.gapXs * scale }]}>
          <ChapterEmblem
            chapterIndex={heroChapter}
            accent={heroAccent}
            {...(heroSecondary !== undefined ? { secondary: heroSecondary } : {})}
            width={heroW}
            height={heroH}
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

      <View style={[styles.actions, { gap: SPACING.xl * scale }]}>
        {canContinue ? (
          <AngularButton
            label={continueLabel}
            color={COLORS.secondary}
            onPress={onContinue}
            icon={<Ionicons name="play" size={22} color={COLORS.secondary} />}
          />
        ) : (
          <AngularButton
            label="PLAY"
            onPress={() => navigation.navigate('Chapters')}
            icon={<Ionicons name="play" size={22} color={COLORS.primary} />}
          />
        )}
      </View>

      <Pressable
        onPress={() => navigation.navigate('Chapters')}
        style={[
          styles.allMissionsFab,
          {
            // Sit fully below the title's divider row: title line height +
            // gap above the divider + divider thickness (= dot height) + a
            // breathing margin so the icon doesn't crowd the line.
            top: BASE.titleLine * scale + BASE.gapMd * scale + BASE.dot * scale + SPACING.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="All missions"
        hitSlop={8}
      >
        <Ionicons name="list" size={20} color={COLORS.textMuted} />
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  actions: {},
  allMissionsFab: {
    position: 'absolute',
    right: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -SPACING.lg,
  },
  heroLabel: { alignItems: 'center' },
  heroChapter: { ...TEXT.labelSmall, letterSpacing: 1.5 },
  heroName: { ...TEXT.title, letterSpacing: 1.5, color: COLORS.textPrimary },
});
