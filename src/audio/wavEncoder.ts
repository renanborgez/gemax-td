/**
 * Encode mono Float32 PCM samples as a 16-bit PCM RIFF WAV (Uint8Array).
 * Values are clamped to [-1, 1] and quantized to int16 via *32767.
 */
export function encodeWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // 'RIFF' <size> 'WAVE'
  writeAscii(u8, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(u8, 8, 'WAVE');

  // 'fmt ' subchunk
  writeAscii(u8, 12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // format = PCM
  view.setUint16(22, 1, true);           // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate (mono * 16-bit)
  view.setUint16(32, 2, true);           // blockAlign
  view.setUint16(34, 16, true);          // bitsPerSample

  // 'data' subchunk
  writeAscii(u8, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = pcm[i]!;
    const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }
  return u8;
}

function writeAscii(u8: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) u8[offset + i] = text.charCodeAt(i);
}
