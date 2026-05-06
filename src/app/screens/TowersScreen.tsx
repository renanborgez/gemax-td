import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { RARITY_ORDER, rarityRank, type Rarity, type TowerDef, type TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS, makeTowerIconPath } from '@/render/towerIcons';
import { canUnlockTower, isInLoadout, loadoutFull, normalizeLoadout, toggleLoadout, unlockTower, getTowerStoreEntries, type TowerStoreEntry } from '@/meta/loadout';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { LOADOUT_SLOTS } from '@/meta/schema';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, RARITY_COLORS, RARITY_LABELS, TEXT, RADIUS, SPACING } from '@/render/theme';

type SortMode = 'rarity' | 'cost' | 'name';
const SORT_CYCLE: readonly SortMode[] = ['rarity', 'cost', 'name'] as const;
const SORT_LABELS: Record<SortMode, string> = {
  rarity: 'RARITY',
  cost: 'COST',
  name: 'NAME',
};
const SORT_ICONS: Record<SortMode, React.ComponentProps<typeof Ionicons>['name']> = {
  rarity: 'star',
  cost: 'cash',
  name: 'text',
};

function compareDefs(a: TowerDef, b: TowerDef, mode: SortMode): number {
  switch (mode) {
    case 'rarity': {
      const r = rarityRank(a.rarity) - rarityRank(b.rarity);
      if (r !== 0) return r;
      return a.cost - b.cost;
    }
    case 'cost':
      return a.cost - b.cost;
    case 'name':
      return a.displayName.localeCompare(b.displayName);
  }
}

type Props = NativeStackScreenProps<RootStackParamList, 'Towers'>;

const TILE_ICON_SIZE = 36;
const DIALOG_ICON_SIZE = 56;
const TILES_PER_ROW = 3;

function trailingPlaceholders(count: number): number {
  const rem = count % TILES_PER_ROW;
  return rem === 0 ? 0 : TILES_PER_ROW - rem;
}

export function TowersScreen({ navigation: _navigation }: Props) {
  const { data, store, refresh } = useSave();

  // Tile tap opens a modal; null means closed. Holding the kind here (not a def)
  // so `data.meta` mutations re-derive the dialog state from the latest save on
  // the next render (no stale snapshot of owned/inLoadout in the dialog).
  const [dialogKind, setDialogKind] = useState<TowerKind | null>(null);
  const closeDialog = () => setDialogKind(null);

  const [sortMode, setSortMode] = useState<SortMode>('rarity');
  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sortMode);
    setSortMode(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length] ?? 'rarity');
  };

  const onUnlock = (kind: TowerKind) => {
    const status = canUnlockTower(kind, data);
    if (!status.ok) return;
    store.update((d) => unlockTower(kind, d));
    refresh();
  };

  const onToggle = (kind: TowerKind) => {
    if (!data.meta.unlockedTowers.includes(kind)) return;
    if (!isInLoadout(kind, data) && loadoutFull(data)) return;
    store.update((d) => toggleLoadout(kind, d));
    refresh();
  };

  // Defensive normalize: legacy saves may have stored a shorter (or longer) array.
  // Pad with nulls so the equipped row always renders exactly LOADOUT_SLOTS tiles.
  const normalizedLoadout = useMemo(
    () => normalizeLoadout(data.meta.activeLoadout),
    [data.meta.activeLoadout],
  );
  const slotsUsed = normalizedLoadout.filter((s) => s !== null).length;

  // Equipped slots: each null renders an empty placeholder tile in its original
  // position (never collapses or shifts when a tower is unequipped).
  const equippedSlots: (TowerDef | null)[] = useMemo(() => {
    const byKind = new Map(ALL_TOWER_DEFS.map((d) => [d.kind, d] as const));
    return normalizedLoadout.map((k) => (k === null ? null : byKind.get(k) ?? null));
  }, [normalizedLoadout]);

  // Available = every tower (equipped tiles flagged inline with an EQUIPPED badge).
  const availableEntries: { def: TowerDef; entry: TowerStoreEntry }[] = useMemo(() => {
    const entries = getTowerStoreEntries(data);
    const byKind = new Map(entries.map((e) => [e.kind, e] as const));
    return ALL_TOWER_DEFS.slice()
      .sort((a, b) => compareDefs(a, b, sortMode))
      .map((def) => ({ def, entry: byKind.get(def.kind)! }));
  }, [data, sortMode]);

  return (
    <ScreenShell sectionTitle="Towers">
      <View style={styles.summaryRow}>
        <View style={styles.slotsBadge}>
          <Text style={styles.slotsLabel}>EQUIPPED</Text>
          <Text style={styles.slotsValue}>{slotsUsed}/{LOADOUT_SLOTS}</Text>
        </View>
        <View style={styles.shardPill}>
          <Text style={styles.shardText}>{data.meta.shards} ◆</Text>
        </View>
      </View>

      <RarityLegend />

      <Text style={styles.sectionLabel}>EQUIPPED</Text>
      <View style={styles.deployedRow}>
        {equippedSlots.map((def, i) => (
          <EquippedTile
            key={def?.kind ?? `empty-${i}`}
            def={def}
            onPress={() => def && setDialogKind(def.kind)}
          />
        ))}
      </View>

      <View style={styles.availableHeader}>
        <Text style={styles.sectionLabel}>AVAILABLE</Text>
        <Pressable onPress={cycleSort} style={styles.sortBtn} hitSlop={8}>
          <Ionicons name={SORT_ICONS[sortMode]} size={12} color={COLORS.textPrimary} />
          <Text style={styles.sortBtnLabel}>SORT · {SORT_LABELS[sortMode]}</Text>
          <Ionicons name="swap-vertical" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>
      <View style={styles.availableGrid}>
        {availableEntries.map(({ def, entry }) => {
          const equipped = normalizedLoadout.includes(def.kind);
          return (
            <AvailableTile
              key={def.kind}
              def={def}
              entry={entry}
              equipped={equipped}
              onPress={() => setDialogKind(def.kind)}
            />
          );
        })}
        {/* Pad the trailing row with empty tiles so every line is 3 cells wide. */}
        {Array.from({ length: trailingPlaceholders(availableEntries.length) }, (_, i) => (
          <View key={`pad-${i}`} style={[styles.tile, styles.tileEmpty]}>
            <Text style={styles.tileEmptyText}>—</Text>
          </View>
        ))}
      </View>

      <TowerDialog
        kind={dialogKind}
        data={data}
        onClose={closeDialog}
        onToggle={onToggle}
        onUnlock={onUnlock}
      />
    </ScreenShell>
  );
}

function RarityLegend() {
  return (
    <View style={styles.legendRow}>
      {RARITY_ORDER.map((r: Rarity) => (
        <View key={r} style={styles.legendChip}>
          <View style={[styles.legendDot, { backgroundColor: RARITY_COLORS[r] }]} />
          <Text style={[styles.legendLabel, { color: RARITY_COLORS[r] }]}>
            {RARITY_LABELS[r]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TowerIcon({ kind, size }: { kind: TowerKind; size: number }) {
  const path = useMemo(() => makeTowerIconPath(kind, size), [kind, size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        transform={[{ translateX: size / 2 }, { translateY: size / 2 }]}
        style="stroke"
        strokeWidth={1.6}
        strokeJoin="round"
        strokeCap="round"
        color={TOWER_ICON_COLORS[kind]}
      />
    </Canvas>
  );
}

/** Soft-tint the tile background by rarity. Locked tiles use a deeper tint
 *  so the dim icon still reads against it; owned tiles use a subtler wash. */
function rarityTileTint(rarity: TowerDef['rarity'], locked: boolean): string {
  return `${RARITY_COLORS[rarity]}${locked ? '26' : '1F'}`;
}

function EquippedTile({
  def, onPress,
}: { def: TowerDef | null; onPress: () => void }) {
  if (def === null) {
    return (
      <View style={[styles.tile, styles.tileEmpty]}>
        <Text style={styles.tileEmptyText}>EMPTY</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, styles.tileEquipped, { backgroundColor: rarityTileTint(def.rarity, false) }]}
    >
      <View style={styles.tileFill} pointerEvents="none">
        <TowerIcon kind={def.kind} size={TILE_ICON_SIZE} />
        <Text style={styles.tileName} numberOfLines={1}>{def.displayName}</Text>
      </View>
    </Pressable>
  );
}

function AvailableTile({
  def, entry, equipped, onPress,
}: {
  def: TowerDef;
  entry: TowerStoreEntry;
  equipped: boolean;
  onPress: () => void;
}) {
  if (entry.state === 'chapter-locked') {
    const ch = CHAPTER_BY_INDEX[entry.chapterHint!.idx];
    const lockedAccent = ch?.paletteAccent ?? COLORS.textMuted;
    return (
      <Pressable
        onPress={onPress}
        style={[styles.tile, styles.tileLocked, { backgroundColor: rarityTileTint(def.rarity, true) }]}
      >
        <View style={styles.tileLockedDimmed} pointerEvents="none">
          <TowerIcon kind={def.kind} size={TILE_ICON_SIZE} />
          <Text style={styles.tileName} numberOfLines={1}>{def.displayName}</Text>
        </View>
        <View style={styles.unlockOverlay} pointerEvents="none">
          <Text style={[styles.unlockOverlayText, { color: lockedAccent }]}>LOCKED</Text>
          <Text style={[styles.unlockOverlayCost, { color: lockedAccent }]}>
            CH {entry.chapterHint!.idx.toString().padStart(2, '0')}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (entry.state === 'buyable') {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.tile, styles.tileLocked, { backgroundColor: rarityTileTint(def.rarity, true) }]}
      >
        <View style={styles.tileLockedDimmed} pointerEvents="none">
          <TowerIcon kind={def.kind} size={TILE_ICON_SIZE} />
          <Text style={styles.tileName} numberOfLines={1}>{def.displayName}</Text>
        </View>
        <View style={styles.unlockOverlay} pointerEvents="none">
          <Text style={styles.unlockOverlayText}>UNLOCK</Text>
          <Text style={styles.unlockOverlayCost}>{def.unlockCost ?? 0} ◆</Text>
        </View>
      </Pressable>
    );
  }

  // entry.state === 'owned'
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        styles.tileAvailable,
        { backgroundColor: rarityTileTint(def.rarity, false) },
      ]}
    >
      <View style={styles.tileFill} pointerEvents="none">
        <TowerIcon kind={def.kind} size={TILE_ICON_SIZE} />
        <Text style={styles.tileName} numberOfLines={1}>{def.displayName}</Text>
      </View>
      {equipped && (
        <View pointerEvents="none" style={styles.equippedBadgeLayer}>
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function TowerDialog({
  kind, data, onClose, onToggle, onUnlock,
}: {
  kind: TowerKind | null;
  data: ReturnType<typeof useSave>['data'];
  onClose: () => void;
  onToggle: (k: TowerKind) => void;
  onUnlock: (k: TowerKind) => void;
}) {
  const def = kind === null ? null : ALL_TOWER_DEFS.find((d) => d.kind === kind) ?? null;
  const visible = def !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tap outside the card to dismiss. Card itself swallows presses so taps
          inside don't bubble up to the backdrop. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialogCard} onPress={() => { /* eat tap */ }}>
          {def !== null && <DialogContent def={def} data={data} onToggle={onToggle} onUnlock={onUnlock} onClose={onClose} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogContent({
  def, data, onToggle, onUnlock, onClose,
}: {
  def: TowerDef;
  data: ReturnType<typeof useSave>['data'];
  onToggle: (k: TowerKind) => void;
  onUnlock: (k: TowerKind) => void;
  onClose: () => void;
}) {
  const owned = data.meta.unlockedTowers.includes(def.kind);
  const equipped = isInLoadout(def.kind, data);
  const accent = !owned ? COLORS.tertiary : equipped ? COLORS.secondary : COLORS.primary;
  const status = !owned ? 'LOCKED' : equipped ? 'EQUIPPED' : 'AVAILABLE';
  const unlock = canUnlockTower(def.kind, data);
  const blockedFull = !equipped && loadoutFull(data);

  return (
    <View style={styles.dialogInner}>
      <View style={[styles.dialogAccent, { backgroundColor: accent }]} />
      <View style={styles.dialogBody}>
        <View style={styles.dialogHeader}>
          <TowerIcon kind={def.kind} size={DIALOG_ICON_SIZE} />
          <View style={styles.dialogTitleCol}>
            <Text style={styles.dialogName}>{def.displayName}</Text>
            <View style={styles.dialogMetaRow}>
              <View style={[styles.rarityBadge, { borderColor: RARITY_COLORS[def.rarity] }]}>
                <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[def.rarity] }]} />
                <Text style={[styles.rarityBadgeText, { color: RARITY_COLORS[def.rarity] }]}>
                  {RARITY_LABELS[def.rarity]}
                </Text>
              </View>
              <Text style={[styles.dialogStatus, { color: accent }]}>{status}</Text>
            </View>
          </View>
          <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <Stat label="COST" value={String(def.cost)} iconName="disc" iconColor={COLORS.tertiary} />
          <Stat label="RANGE" value={def.baseStats.range.toFixed(1)} />
          <Stat label="DMG" value={String(def.baseStats.damage)} />
          <Stat label="RATE" value={`${def.baseStats.fireRate.toFixed(1)}/s`} />
        </View>

        <Text style={styles.dialogDesc}>{def.description ?? ''}</Text>

        {owned ? (
          <Pressable
            disabled={!equipped && blockedFull}
            style={[
              styles.action,
              equipped ? styles.actionEquipped : styles.actionEquip,
              !equipped && blockedFull && styles.actionDisabled,
            ]}
            onPress={() => { onToggle(def.kind); onClose(); }}
          >
            <Text style={[
              styles.actionText,
              equipped ? styles.actionTextEquipped : styles.actionTextEquip,
              !equipped && blockedFull && styles.actionTextDisabled,
            ]}>
              {equipped ? 'UNEQUIP' : blockedFull ? 'LOADOUT FULL' : 'EQUIP'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={!unlock.ok}
            style={[styles.action, styles.actionUnlock, !unlock.ok && styles.actionDisabled]}
            onPress={() => { onUnlock(def.kind); onClose(); }}
          >
            <Text style={[
              styles.actionText,
              styles.actionTextUnlock,
              !unlock.ok && styles.actionTextDisabled,
            ]}>
              {unlock.ok ? `UNLOCK · ${def.unlockCost ?? 0} ◆` : (unlock.reason ?? 'LOCKED')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({
  label, value, iconName, iconColor,
}: {
  label: string;
  value: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        {iconName && <Ionicons name={iconName} size={13} color={iconColor ?? COLORS.textPrimary} />}
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const TILE_GAP = SPACING.sm;

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
  },
  slotsLabel: { ...TEXT.labelSmall, color: COLORS.primary, fontSize: 10 },
  slotsValue: { ...TEXT.buttonSmall, color: COLORS.primary },
  shardPill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tertiarySoft,
  },
  shardText: { ...TEXT.buttonSmall, color: COLORS.tertiary },

  sectionLabel: { ...TEXT.labelSmall, color: COLORS.textMuted, letterSpacing: 1.0 },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgElevated,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { ...TEXT.labelSmall, fontSize: 9, letterSpacing: 0.8 },

  availableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnLabel: {
    ...TEXT.buttonSmall,
    fontSize: 10,
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },

  deployedRow: { flexDirection: 'row', gap: TILE_GAP },
  availableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },

  // Square tile sized to fill exactly 3 per row inside the ScreenShell padding.
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tileEquipped: { borderColor: COLORS.secondary },
  tileAvailable: { borderColor: COLORS.border },
  tileLocked: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.tertiarySoft,
    overflow: 'hidden',
  },
  tileLockedDimmed: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: SPACING.sm,
    opacity: 0.55,
  },
  unlockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.bgCard}66`,
    gap: 2,
  },
  unlockOverlayText: {
    ...TEXT.buttonSmall,
    color: COLORS.tertiary,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  unlockOverlayCost: {
    ...TEXT.labelSmall,
    color: COLORS.tertiary,
    fontSize: 11,
  },
  tileEmpty: {
    backgroundColor: COLORS.bgElevated,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  tileEmptyText: { ...TEXT.labelSmall, color: COLORS.textMuted, letterSpacing: 1.0 },
  tileName: { ...TEXT.labelSmall, color: COLORS.textPrimary, fontSize: 11, textAlign: 'center' },
  tileFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: SPACING.sm,
  },
  equippedBadgeLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    padding: 4,
  },
  equippedBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.secondary,
  },
  equippedBadgeText: {
    ...TEXT.labelSmall,
    fontSize: 8,
    letterSpacing: 0.6,
    color: COLORS.textOnAccent,
  },

  // Dialog
  backdrop: {
    flex: 1,
    backgroundColor: '#000000B0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    flexDirection: 'row',
  },
  dialogInner: { flex: 1, flexDirection: 'row' },
  dialogAccent: { width: 4, alignSelf: 'stretch' },
  dialogBody: { flex: 1, padding: SPACING.lg, gap: SPACING.md },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dialogTitleCol: { flex: 1, gap: 2 },
  dialogName: { ...TEXT.title, fontSize: 18 },
  dialogMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  dialogStatus: { ...TEXT.labelSmall, fontSize: 11, letterSpacing: 0.8 },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityBadgeText: { ...TEXT.labelSmall, fontSize: 9, letterSpacing: 0.8 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  closeBtnText: { ...TEXT.title, fontSize: 18, color: COLORS.textPrimary, lineHeight: 20 },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgElevated,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { ...TEXT.labelSmall, color: COLORS.textMuted, fontSize: 9 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { ...TEXT.hudValue, fontSize: 13 },
  dialogDesc: { ...TEXT.body, fontSize: 13 },

  action: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  actionEquip: { backgroundColor: COLORS.primary },
  actionEquipped: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.secondary, borderWidth: 1 },
  actionUnlock: { backgroundColor: COLORS.tertiary },
  actionDisabled: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.border, borderWidth: 1 },
  actionText: { ...TEXT.button },
  actionTextEquip: { color: COLORS.textOnAccent },
  actionTextEquipped: { color: COLORS.secondary },
  actionTextUnlock: { color: COLORS.textOnAccent },
  actionTextDisabled: { color: COLORS.textMuted },
});
