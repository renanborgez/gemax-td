import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'] as const;

export function LevelSelectScreen({ navigation }: Props) {
  const { data } = useSave();
  const [difficulty, setDifficulty] = useState<Difficulty>(data.settings.difficultyDefault);

  return (
    <ScreenShell
      sectionTitle="Select Target"
      onBack={() => navigation.goBack()}
    >
      <Text style={styles.heading}>DIFFICULTY</Text>
      <View style={styles.pills}>
        {DIFFICULTIES.map((d) => {
          const active = d === difficulty;
          return (
            <Pressable
              key={d}
              onPress={() => setDifficulty(d)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {d.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.heading, { marginTop: SPACING.md }]}>MISSIONS</Text>
      {ALL_LEVELS.map((lvl) => {
        const stars = data.campaign[lvl.id]?.bestStarsByDifficulty[difficulty] ?? 0;
        return (
          <Pressable
            key={lvl.id}
            style={styles.card}
            onPress={() => navigation.navigate('Play', { levelId: lvl.id, difficulty })}
          >
            <View style={styles.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardName}>{lvl.name}</Text>
              <Text style={styles.cardSub}>CHAPTER {lvl.chapter}</Text>
            </View>
            <Text style={styles.cardStars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          </Pressable>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  pills: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  pill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgCard,
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { ...TEXT.buttonSmall, color: COLORS.textMuted },
  pillTextActive: { color: COLORS.textOnAccent },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    gap: SPACING.md,
  },
  accent: { width: 3, alignSelf: 'stretch', backgroundColor: COLORS.secondary, marginRight: SPACING.sm },
  cardName: { ...TEXT.title, fontSize: 15, color: COLORS.textPrimary },
  cardSub: { ...TEXT.labelSmall, color: COLORS.textMuted },
  cardStars: { color: COLORS.tertiary, fontSize: 16, letterSpacing: 2 },
});
