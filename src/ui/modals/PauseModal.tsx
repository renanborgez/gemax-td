import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export function PauseModal({
  visible, onResume, onRestart, onExit,
}: { visible: boolean; onResume: () => void; onRestart: () => void; onExit: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">PAUSED</Text>
          <Pressable
            onPress={onResume}
            style={styles.btnPrimary}
            accessibilityRole="button"
            accessibilityLabel="Resume mission"
          >
            <Text style={styles.btnPrimaryText}>RESUME</Text>
          </Pressable>
          <Pressable
            onPress={onRestart}
            style={styles.btnSecondary}
            accessibilityRole="button"
            accessibilityLabel="Restart mission"
          >
            <Text style={styles.btnSecondaryText}>RESTART</Text>
          </Pressable>
          <Pressable
            onPress={onExit}
            style={styles.btnDanger}
            accessibilityRole="button"
            accessibilityLabel="Exit mission to map"
          >
            <Text style={styles.btnDangerText}>EXIT</Text>
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
    minWidth: 260,
    backgroundColor: COLORS.bgCard,
  },
  title: { ...TEXT.title, color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.sm },
  btnPrimary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: { ...TEXT.button, color: COLORS.textOnAccent },
  btnSecondary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  btnSecondaryText: { ...TEXT.button, color: COLORS.textPrimary },
  btnDanger: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  btnDangerText: { ...TEXT.button, color: COLORS.danger },
});
