import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { AngularButton } from '@/ui/components/AngularButton';
import { LootBadge } from '@/ui/components/LootBadge';
import { SectionCard } from '@/ui/components/SectionCard';
import { COLORS, TEXT, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Win'>;

export function WinScreen({ navigation, route }: Props) {
  const { stars, shards, totalWaves } = route.params;

  return (
    <ScreenShell
      sectionTitle="Victory Results"
      onBack={() => navigation.popToTop()}
    >
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

      <View style={styles.continueWrap}>
        <AngularButton label="CONTINUE" onPress={() => navigation.popToTop()} />
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
  continueWrap: { marginTop: SPACING.sm },
});
