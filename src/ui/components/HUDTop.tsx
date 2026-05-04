import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';

export function HUDTop({
  onPause, onSpeed, onSendNextWave,
}: { onPause: () => void; onSpeed: (s: 1 | 2 | 3) => void; onSendNextWave: () => void }) {
  const lives = useHudStore((s) => s.lives);
  const credits = useHudStore((s) => s.credits);
  const waveIndex = useHudStore((s) => s.waveIndex);
  const totalWaves = useHudStore((s) => s.totalWaves);
  const speed = useHudStore((s) => s.speed);
  const status = useHudStore((s) => s.waveStatus);

  return (
    <View style={styles.root}>
      <View style={styles.col}><Text style={styles.label}>LIVES</Text><Text style={styles.value}>{lives}</Text></View>
      <View style={styles.col}><Text style={styles.label}>CREDITS</Text><Text style={styles.value}>{credits}</Text></View>
      <View style={styles.col}>
        <Text style={styles.label}>WAVE</Text>
        <Text style={styles.value}>{Math.max(0, waveIndex + 1)}/{totalWaves}</Text>
      </View>
      <View style={styles.colActions}>
        <Pressable onPress={onPause} style={styles.btn}><Text style={styles.btnText}>‖</Text></Pressable>
        {[1, 2, 3].map((s) => (
          <Pressable key={s} onPress={() => onSpeed(s as 1 | 2 | 3)} style={[styles.btn, speed === s && styles.btnActive]}>
            <Text style={styles.btnText}>{s}×</Text>
          </Pressable>
        ))}
        {(status === 'idle' || status === 'cleared') && (
          <Pressable onPress={onSendNextWave} style={[styles.btn, styles.send]}>
            <Text style={styles.btnText}>SEND</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 8, gap: 12, alignItems: 'center', backgroundColor: '#0A0E1ACC' },
  col: { alignItems: 'center' },
  colActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  label: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 10 },
  value: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 14 },
  btn: { paddingVertical: 6, paddingHorizontal: 8, borderColor: '#00F0FF', borderWidth: 1 },
  btnActive: { backgroundColor: '#00F0FF22' },
  btnText: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 12 },
  send: { borderColor: '#FFB347' },
});
