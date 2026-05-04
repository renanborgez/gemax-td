import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function PauseModal({
  visible, onResume, onRestart, onExit,
}: { visible: boolean; onResume: () => void; onRestart: () => void; onExit: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>PAUSED</Text>
          <Pressable onPress={onResume} style={styles.btn}><Text style={styles.btnText}>RESUME</Text></Pressable>
          <Pressable onPress={onRestart} style={styles.btn}><Text style={styles.btnText}>RESTART</Text></Pressable>
          <Pressable onPress={onExit} style={[styles.btn, styles.exit]}><Text style={styles.btnText}>EXIT</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#00F0FF', borderWidth: 1, gap: 12, minWidth: 240 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 18, textAlign: 'center' },
  btn: { paddingVertical: 12, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  exit: { borderColor: '#FF2BD6' },
});
