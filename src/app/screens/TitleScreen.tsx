import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { AngularButton } from '@/ui/components/AngularButton';
import { useSave } from '@/app/providers/SaveProvider';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Title'>;

const APP_VERSION = '1.0.0-BETA';

export function TitleScreen({ navigation }: Props) {
  const { data } = useSave();

  return (
    <ScreenShell sectionTitle="Main Menu">
      <View style={styles.titleBlock}>
        <Text style={styles.titleLine} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={styles.titleWhite}>GeMax </Text>
          <Text style={styles.titleMint}>TD</Text>
        </Text>
        <View style={styles.dividerRow}>
          <View style={styles.dot} />
          <View style={styles.dividerLine} />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>SHARDS</Text>
        <View style={styles.shardPill}>
          <Text style={styles.shardText}>{data.meta.shards} ◆</Text>
        </View>
      </View>

      <View style={styles.playWrap}>
        <AngularButton label="PLAY" onPress={() => navigation.navigate('LevelSelect')} />
      </View>

      <View style={styles.menuList}>
        <Text style={styles.version}>V. {APP_VERSION}</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 0 },
  titleLine: {
    ...TEXT.display,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1,
  },
  titleWhite: { color: COLORS.textPrimary },
  titleMint: { color: COLORS.secondary },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  summaryLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  shardPill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tertiarySoft,
  },
  shardText: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  playWrap: { marginTop: SPACING.md },
  menuList: { gap: SPACING.sm, marginTop: SPACING.sm },
  version: {
    ...TEXT.labelSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
