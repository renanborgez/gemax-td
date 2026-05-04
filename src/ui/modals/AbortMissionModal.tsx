import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export function AbortMissionModal({
  visible, onCancel, onConfirm,
}: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>ABORT MISSION?</Text>
          <Text style={styles.body}>Leaving now will forfeit this run. No shards will be awarded.</Text>
          <Pressable onPress={onCancel} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>STAY</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.btnDanger}>
            <Text style={styles.btnDangerText}>ABORT</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000DD' },
  card: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
    minWidth: 280,
    maxWidth: 360,
    backgroundColor: COLORS.bgCard,
  },
  title: { ...TEXT.title, color: COLORS.danger, textAlign: 'center', marginBottom: SPACING.sm },
  body: { ...TEXT.body, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.sm },
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
