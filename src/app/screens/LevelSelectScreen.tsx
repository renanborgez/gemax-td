import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'] as const;

export function LevelSelectScreen({ navigation }: Props) {
  const { data } = useSave();
  const [difficulty, setDifficulty] = useState<Difficulty>(data.settings.difficultyDefault);

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>SELECT TARGET</Text>
      <View style={styles.pills}>
        {DIFFICULTIES.map((d) => (
          <Pressable key={d} onPress={() => setDifficulty(d)} style={[styles.pill, d === difficulty && styles.pillActive]}>
            <Text style={[styles.pillText, d === difficulty && styles.pillTextActive]}>{d.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {ALL_LEVELS.map((lvl) => {
        const stars = data.campaign[lvl.id]?.bestStarsByDifficulty[difficulty] ?? 0;
        return (
          <Pressable
            key={lvl.id}
            style={styles.card}
            onPress={() => navigation.navigate('Play', { levelId: lvl.id, difficulty })}
          >
            <Text style={styles.cardName}>{lvl.name}</Text>
            <Text style={styles.cardStars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: '#0A0E1A' },
  heading: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 18, marginTop: 32 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#00F0FF', backgroundColor: '#00F0FF11' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 12 },
  pillTextActive: { color: '#00F0FF' },
  card: { padding: 16, borderColor: '#00F0FF', borderWidth: 1, gap: 8 },
  cardName: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 16 },
  cardStars: { color: '#FFB347', fontSize: 16 },
});
