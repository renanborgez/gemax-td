import { describe, expect, it } from 'vitest';
import { encodeWav } from '@/audio/wavEncoder';

describe('encodeWav', () => {
  it('emits a valid 16-bit mono RIFF header at 44.1 kHz', () => {
    const pcm = new Float32Array(1000);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    // RIFF header
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    // 'fmt ' subchunk
    expect(String.fromCharCode(...wav.slice(12, 16))).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);          // PCM fmt chunk size
    expect(view.getUint16(20, true)).toBe(1);           // PCM format
    expect(view.getUint16(22, true)).toBe(1);           // mono
    expect(view.getUint32(24, true)).toBe(44100);       // sample rate
    expect(view.getUint32(28, true)).toBe(44100 * 2);   // byte rate
    expect(view.getUint16(32, true)).toBe(2);           // block align
    expect(view.getUint16(34, true)).toBe(16);          // bits per sample
    // 'data' subchunk
    expect(String.fromCharCode(...wav.slice(36, 40))).toBe('data');
    expect(view.getUint32(40, true)).toBe(pcm.length * 2);
    expect(wav.byteLength).toBe(44 + pcm.length * 2);
  });

  it('round-trips Float32 samples through 16-bit quantization', () => {
    const inputs = [0, 0.5, -0.5, 1, -1, 0.123];
    const pcm = new Float32Array(inputs);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    for (let i = 0; i < inputs.length; i++) {
      const stored = view.getInt16(44 + i * 2, true);
      const decoded = stored / 32767;
      expect(decoded).toBeCloseTo(inputs[i]!, 4);
    }
  });

  it('clamps values outside [-1, 1]', () => {
    const pcm = new Float32Array([2, -2]);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32767);
  });
});
