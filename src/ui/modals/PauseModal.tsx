import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export type PauseModalMode = 'paused' | 'abort-confirm';

export function PauseModal({
  visible, mode, onResume, onRestart, onAskAbort, onCancelAbort, onConfirmAbort,
}: {
  visible: boolean;
  mode: PauseModalMode;
  onResume: () => void;
  onRestart: () => void;
  onAskAbort: () => void;
  onCancelAbort: () => void;
  onConfirmAbort: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancelAbort}>
      <View style={styles.bg}>
        <View style={styles.card}>
          {mode === 'paused' ? (
            <>
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
                onPress={onAskAbort}
                style={styles.btnDanger}
                accessibilityRole="button"
                accessibilityLabel="Exit mission"
              >
                <Text style={styles.btnDangerText}>EXIT</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.titleDanger} accessibilityRole="header">EXIT MISSION?</Text>
              <Text style={styles.body}>
                Leaving now will forfeit this run. No shards will be awarded.
              </Text>
              <Pressable
                onPress={onCancelAbort}
                style={styles.btnPrimary}
                accessibilityRole="button"
                accessibilityLabel="Stay in mission"
              >
                <Text style={styles.btnPrimaryText}>STAY</Text>
              </Pressable>
              <Pressable
                onPress={onConfirmAbort}
                style={styles.btnDanger}
                accessibilityRole="button"
                accessibilityLabel="Confirm exit"
              >
                <Text style={styles.btnDangerText}>CONFIRM EXIT</Text>
              </Pressable>
            </>
          )}
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
  title: { ...TEXT.title, color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.sm },
  titleDanger: { ...TEXT.title, color: COLORS.danger, textAlign: 'center', marginBottom: SPACING.sm },
  body: { ...TEXT.body, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.sm },
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
