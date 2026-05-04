import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function WinModal({
  visible, stars, shards, onContinue,
}: { visible: boolean; stars: 0 | 1 | 2 | 3; shards: number; onContinue: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>BREACH REPELLED</Text>
          <Text style={styles.stars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          {shards > 0 && <Text style={styles.shards}>+{shards} shards</Text>}
          <Pressable onPress={onContinue} style={styles.btn}><Text style={styles.btnText}>CONTINUE</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#7CFF6B', borderWidth: 1, gap: 12, minWidth: 280, alignItems: 'center' },
  title: { color: '#7CFF6B', fontFamily: 'monospace', fontSize: 18 },
  stars: { color: '#FFB347', fontSize: 28 },
  shards: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 14 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderColor: '#7CFF6B', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
});
