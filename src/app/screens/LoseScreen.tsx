import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { SectionCard } from '@/ui/components/SectionCard';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Lose'>;

export function LoseScreen({ navigation, route }: Props) {
  const { levelId, difficulty, wavesCleared } = route.params;

  return (
    <ScreenShell
      sectionTitle="Defeat Report"
      onBack={() => navigation.navigate('LevelSelect')}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLineDanger}>SYSTEM COMPROMISED</Text>
        <Text style={styles.heroLineWhite}>DEFENSE FAILED</Text>
      </View>

      <SectionCard title="BATTLE STATS">
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>WAVES CLEARED</Text>
          <Text style={styles.statValue}>{wavesCleared}</Text>
        </View>
        <Text style={styles.flavor}>NETWORK BREACHED — INTRUSIONS REACHED THE CORE</Text>
      </SectionCard>

      <View style={styles.actions}>
        <Pressable
          onPress={() => navigation.replace('Play', { levelId, difficulty })}
          style={styles.btnPrimary}
        >
          <Text style={styles.btnPrimaryText}>RETRY</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('LevelSelect')} style={styles.btnDanger}>
          <Text style={styles.btnDangerText}>EXIT</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  heroLineDanger: {
    ...TEXT.headline,
    color: COLORS.danger,
    letterSpacing: 4,
    fontSize: 20,
  },
  heroLineWhite: {
    ...TEXT.title,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    fontSize: 16,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  statValue: { ...TEXT.title, fontSize: 18, color: COLORS.danger },
  flavor: { ...TEXT.bodySmall, color: COLORS.textMuted, fontStyle: 'italic' },
  actions: { gap: SPACING.sm, marginTop: SPACING.sm },
  btnPrimary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: { ...TEXT.button, color: COLORS.textOnAccent },
  btnDanger: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  btnDangerText: { ...TEXT.button, color: COLORS.danger },
});
