import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { SectionCard } from '@/ui/components/SectionCard';
import { useHudStore } from '@/ui/hudStore';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { getTowerDef } from '@/entities/registry';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChapterCleared'>;

export function ChapterClearedScreen({ navigation, route }: Props) {
  const head = useHudStore((s) => s.pendingChapterClear[0]);
  const dequeue = useHudStore((s) => s.dequeueChapterClear);

  const chapter = head ? CHAPTER_BY_INDEX[head.chapterIdx] : undefined;

  const towerNames = useMemo(() => {
    if (!head) return [] as string[];
    return head.rewards.towerKinds.map((k) => getTowerDef(k).displayName);
  }, [head]);

  // Defensive: bounce to Win if mounted with empty queue (e.g., dev navigation).
  useEffect(() => {
    if (!head || !chapter) {
      navigation.replace('Win', route.params.winParams);
    }
  }, [head, chapter, navigation, route.params.winParams]);

  if (!head || !chapter) return null;

  const onContinue = () => {
    dequeue();
    if (useHudStore.getState().pendingChapterClear.length > 0) {
      navigation.replace('ChapterCleared', route.params);
    } else {
      navigation.replace('Win', route.params.winParams);
    }
  };

  return (
    <ScreenShell sectionTitle="Chapter Cleared" onBack={onContinue}>
      <View style={styles.hero}>
        <Text style={[styles.heroLabel, { color: chapter.paletteAccent }]}>
          {`CHAPTER ${chapter.index.toString().padStart(2, '0')} CLEARED`}
        </Text>
        <Text style={styles.heroName}>{chapter.name.toUpperCase()}</Text>
        <Text style={styles.heroSubtitle}>{chapter.subtitle}</Text>
      </View>

      {towerNames.length > 0 && (
        <SectionCard title="TOWER LISTINGS UNLOCKED">
          {towerNames.map((n) => (
            <Text key={n} style={styles.rewardItem}>{`· ${n}`}</Text>
          ))}
        </SectionCard>
      )}

      <SectionCard title="MASTERY">
        <Text style={styles.rewardItem}>{`· ${head.rewards.medalId}`}</Text>
        <Text style={styles.rewardItem}>{`· Palette unlocked: ${head.rewards.paletteId}`}</Text>
      </SectionCard>

      <Pressable onPress={onContinue} style={[styles.btn, { backgroundColor: chapter.paletteAccent }]}>
        <Text style={styles.btnText}>CONTINUE</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.md },
  heroLabel: { ...TEXT.labelSmall, letterSpacing: 2, fontSize: 12 },
  heroName: { ...TEXT.title, color: COLORS.textPrimary, fontSize: 22, letterSpacing: 3 },
  heroSubtitle: { ...TEXT.body, color: COLORS.textMuted, fontSize: 12 },
  rewardItem: { ...TEXT.body, color: COLORS.textPrimary, fontSize: 13, paddingVertical: 2 },
  btn: { paddingVertical: SPACING.md, alignItems: 'center', borderRadius: RADIUS.md, marginTop: SPACING.md },
  btnText: { ...TEXT.button, color: COLORS.textOnAccent },
});
