import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function LoseModal({
  visible, wavesCleared, onRetry, onExit,
}: { visible: boolean; wavesCleared: number; onRetry: () => void; onExit: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>SYSTEM COMPROMISED</Text>
          <Text style={styles.sub}>Cleared {wavesCleared} wave{wavesCleared === 1 ? '' : 's'}</Text>
          <Pressable onPress={onRetry} style={styles.btn}><Text style={styles.btnText}>RETRY</Text></Pressable>
          <Pressable onPress={onExit} style={[styles.btn, styles.exit]}><Text style={styles.btnText}>EXIT</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#FF2BD6', borderWidth: 1, gap: 12, minWidth: 280, alignItems: 'center' },
  title: { color: '#FF2BD6', fontFamily: 'monospace', fontSize: 18 },
  sub: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  exit: { borderColor: '#FF2BD6' },
});
