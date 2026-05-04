import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { AngularButton } from '@/ui/components/AngularButton';
import { MenuRow } from '@/ui/components/MenuRow';
import { useSave } from '@/app/providers/SaveProvider';
import { TECH_NODES } from '@/content/techNodes';
import { COLORS, TEXT, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Title'>;

const APP_VERSION = '1.0.0-BETA';

export function TitleScreen({ navigation }: Props) {
  const { data } = useSave();

  const installed = TECH_NODES.filter((n) => (data.meta.techTree[n.id] ?? 0) > 0).length;
  const total = TECH_NODES.length;

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

      <View style={styles.playWrap}>
        <AngularButton label="PLAY" onPress={() => navigation.navigate('LevelSelect')} />
      </View>

      <View style={styles.menuList}>
        <MenuRow
          icon="cube-outline"
          heading="COLLECTION"
          sub={`${installed}/${total} UPGRADES INSTALLED`}
          accent={COLORS.secondary}
          onPress={() => navigation.navigate('TechTree')}
        />
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
  playWrap: { marginTop: SPACING.md },
  menuList: { gap: SPACING.sm, marginTop: SPACING.sm },
  version: {
    ...TEXT.labelSmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
