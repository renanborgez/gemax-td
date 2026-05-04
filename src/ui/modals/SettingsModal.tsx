import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'];
const VOLS = [0, 0.25, 0.5, 0.75, 1];

export function SettingsModal({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const { data, store, refresh } = useSave();
  const [confirmReset, setConfirmReset] = useState(false);

  const setVol = (k: 'audioMaster' | 'sfx' | 'music', v: number) => {
    store.update((d) => { d.settings[k] = v; });
    refresh();
  };
  const setDifficulty = (d: Difficulty) => {
    store.update((s) => { s.settings.difficultyDefault = d; });
    refresh();
  };
  const onReset = async () => {
    await store.reset();
    refresh();
    setConfirmReset(false);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>SETTINGS</Text>
          <Section label={`MASTER ${pct(data.settings.audioMaster)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('audioMaster', v)} style={[styles.dot, data.settings.audioMaster === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label={`SFX ${pct(data.settings.sfx)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('sfx', v)} style={[styles.dot, data.settings.sfx === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label={`MUSIC ${pct(data.settings.music)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('music', v)} style={[styles.dot, data.settings.music === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label="DEFAULT DIFFICULTY">
            {DIFFICULTIES.map((d) => (
              <Pressable key={d} onPress={() => setDifficulty(d)} style={[styles.pill, data.settings.difficultyDefault === d && styles.pillActive]}>
                <Text style={[styles.pillText, data.settings.difficultyDefault === d && styles.pillActiveText]}>{d.toUpperCase()}</Text>
              </Pressable>
            ))}
          </Section>
          <Pressable
            onPress={() => (confirmReset ? onReset() : setConfirmReset(true))}
            style={[styles.action, styles.danger]}
          >
            <Text style={styles.actionText}>{confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET SAVE DATA'}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.action}>
            <Text style={styles.actionText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}
function pct(v: number): string { return `${Math.round(v * 100)}%`; }

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 20, borderColor: '#00F0FF', borderWidth: 1, gap: 12, minWidth: 320 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  section: { gap: 6 },
  label: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 11 },
  row: { flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 18, borderColor: '#00F0FF44', borderWidth: 1, borderRadius: 9 },
  dotActive: { backgroundColor: '#00F0FF', borderColor: '#00F0FF' },
  pill: { paddingVertical: 4, paddingHorizontal: 8, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#00F0FF', backgroundColor: '#00F0FF22' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 11 },
  pillActiveText: { color: '#00F0FF' },
  action: { paddingVertical: 10, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  actionText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 12 },
  danger: { borderColor: '#FF2BD6' },
});
