import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  type LayoutChangeEvent, PixelRatio,
} from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { CHAPTERS, CHAPTER_BY_INDEX } from '@/content/chapters';
import { LEVEL_BY_ID } from '@/content/levels';
import { LEVEL_OVERRIDES } from '@/content/levels/overrides';
import { levelId } from '@/content/levelGenerator';
import { createWorld } from '@/world/World';
import { Viewport, HORIZONTAL_MARGIN_PX } from '@/engine/Viewport';
import { BackgroundLayer } from '@/render/layers/BackgroundLayer';
import { PathLayer } from '@/render/layers/PathLayer';
import { GridOverlayLayer } from '@/render/layers/GridOverlayLayer';
import { BaseLayer } from '@/render/layers/BaseLayer';
import { SpawnLayer } from '@/render/layers/SpawnLayer';
import { ObstaclesLayer } from '@/render/layers/ObstaclesLayer';
import type { BuildHintSnap } from '@/render/snapshot';
import { COLORS, RADIUS, SPACING, TEXT } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MapBrowser'>;

const MISSIONS_PER_CHAPTER = 10;
const PREVIEW_MAX_HEIGHT = 520;

export function MapBrowserScreen({ navigation }: Props) {
  const [chapter, setChapter] = useState(0);
  const [mission, setMission] = useState(0);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const id = levelId(chapter, mission);
  const level = LEVEL_BY_ID[id];
  const chapterDef = CHAPTER_BY_INDEX[chapter];
  const overridden = LEVEL_OVERRIDES[id] !== undefined;

  const onPreviewLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width !== previewSize.w) setPreviewSize((s) => ({ ...s, w: width }));
  };

  return (
    <ScreenShell sectionTitle="Map Browser" onBack={() => navigation.goBack()}>
      <View style={styles.row}>
        <Text style={styles.sectionLabel}>CHAPTER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
          {CHAPTERS.map((c) => (
            <Pressable
              key={c.index}
              onPress={() => setChapter(c.index)}
              style={[
                styles.chip,
                chapter === c.index && { borderColor: c.paletteAccent, backgroundColor: `${c.paletteAccent}22` },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${c.index + 1} ${c.name}`}
            >
              <Text style={[styles.chipText, chapter === c.index && { color: c.paletteAccent }]}>
                {String(c.index + 1).padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <Text style={styles.sectionLabel}>MISSION</Text>
        <View style={styles.pickerGrid}>
          {Array.from({ length: MISSIONS_PER_CHAPTER }, (_, m) => (
            <Pressable
              key={m}
              onPress={() => setMission(m)}
              style={[
                styles.chip,
                styles.chipGrid,
                mission === m && { borderColor: COLORS.tertiary, backgroundColor: `${COLORS.tertiary}22` },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Mission ${m + 1}`}
            >
              <Text style={[styles.chipText, mission === m && { color: COLORS.tertiary }]}>
                {String(m + 1).padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>
          {chapterDef?.name ?? `Chapter ${chapter + 1}`} · {level?.name ?? id}
        </Text>
        <Text style={styles.metaSub}>{id}{overridden ? '  ·  OVERRIDDEN' : ''}</Text>
        {level && (
          <View style={styles.metaGrid}>
            <Stat label="GRID" value={`${level.grid.cols}×${level.grid.rows}`} />
            <Stat label="LANES" value={String(level.paths.length)} />
            <Stat label="WAVES" value={String(level.waves.length)} />
            <Stat label="OBSTACLES" value={String(level.obstacles?.length ?? 0)} />
            <Stat label="CREDITS" value={String(level.startCredits)} />
            <Stat label="LIVES" value={String(level.startLives)} />
            {chapterDef?.bossEnemyKind && mission === MISSIONS_PER_CHAPTER - 1 && (
              <Stat label="BOSS" value={chapterDef.bossEnemyKind} />
            )}
          </View>
        )}
      </View>

      <View style={styles.previewWrap} onLayout={onPreviewLayout}>
        {level && previewSize.w > 0 && (
          <MapPreview
            levelId={id}
            availableWidth={previewSize.w}
            maxHeight={PREVIEW_MAX_HEIGHT}
            {...(chapterDef?.paletteAccent !== undefined ? { accent: chapterDef.paletteAccent } : {})}
            {...(chapterDef?.paletteSecondary !== undefined ? { secondary: chapterDef.paletteSecondary } : {})}
          />
        )}
      </View>
    </ScreenShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MapPreview({
  levelId: id, availableWidth, maxHeight, accent, secondary,
}: {
  levelId: string;
  availableWidth: number;
  maxHeight: number;
  accent?: string;
  secondary?: string;
}) {
  // Build a real World per level so the existing Skia layers (Path, Base,
  // Spawn, Obstacles) work unchanged. createWorld is pure data construction;
  // we never run an Engine, so this stays cheap and side-effect free.
  const { canvasW, canvasH, viewport, world } = useMemo(() => {
    const lvl = LEVEL_BY_ID[id]!;
    const cols = lvl.grid.cols;
    const rows = lvl.grid.rows;

    // Fit-to-area tile size: shrink whichever dimension would otherwise overflow.
    const tileFromW = (availableWidth - HORIZONTAL_MARGIN_PX * 2) / cols;
    const tileFromH = (maxHeight - HORIZONTAL_MARGIN_PX * 2) / rows;
    const tile = Math.max(8, Math.min(tileFromW, tileFromH));
    const cw = tile * cols + HORIZONTAL_MARGIN_PX * 2;
    const ch = tile * rows + HORIZONTAL_MARGIN_PX * 2;

    const vp = new Viewport({
      canvasWidthPx: cw,
      canvasHeightPx: ch,
      gridCols: cols,
      gridRows: rows,
      canvasOriginScreen: { x: 0, y: 0 },
      dpr: PixelRatio.get(),
    });
    const w = createWorld({
      level: lvl,
      difficulty: 'normal',
      seed: 1,
      redraw: { bump: () => {} },
    });
    return { canvasW: cw, canvasH: ch, viewport: vp, world: w };
  }, [id, availableWidth, maxHeight]);

  const buildHint = useSharedValue<BuildHintSnap>(null);

  return (
    <View style={[styles.canvasWrap, { width: canvasW, height: canvasH }]}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        <BackgroundLayer
          viewport={viewport}
          {...(accent !== undefined ? { accent } : {})}
          {...(secondary !== undefined ? { secondary } : {})}
        />
        <Group>
          <PathLayer
            world={world}
            viewport={viewport}
            {...(accent !== undefined ? { accent } : {})}
            {...(secondary !== undefined ? { secondary } : {})}
          />
          <GridOverlayLayer
            viewport={viewport}
            grid={world.grid}
            buildHint={buildHint}
            {...(accent !== undefined ? { accent } : {})}
          />
          <BaseLayer
            world={world}
            viewport={viewport}
            {...(accent !== undefined ? { accent } : {})}
            {...(secondary !== undefined ? { secondary } : {})}
          />
          <SpawnLayer world={world} viewport={viewport} />
          <ObstaclesLayer world={world} viewport={viewport} />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.sm },
  sectionLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  pickerRow: { gap: SPACING.xs, paddingRight: SPACING.md },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    minWidth: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: { minWidth: 44, flex: 0 },
  chipText: { ...TEXT.button, color: COLORS.textPrimary, fontSize: 12 },
  metaCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    gap: SPACING.sm,
  },
  metaTitle: { ...TEXT.title, color: COLORS.textPrimary },
  metaSub: { ...TEXT.labelSmall, color: COLORS.textMuted },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCell: {
    minWidth: 80,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
  },
  statLabel: { ...TEXT.labelSmall, color: COLORS.textMuted, fontSize: 9 },
  statValue: { ...TEXT.hudValue, color: COLORS.textPrimary, fontSize: 14 },
  previewWrap: { alignItems: 'center', justifyContent: 'flex-start' },
  canvasWrap: { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, overflow: 'hidden' },
});
