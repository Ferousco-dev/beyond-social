/**
 * Encoding recorded audio as WAV.
 *
 * The browser will not do this for us. `MediaRecorder` produces WebM/Opus
 * almost everywhere, and the video provider refuses WebM, so a clip recorded in
 * the app has to be encoded here or it cannot be used for the thing it was
 * recorded for.
 *
 * WAV rather than a compressed format because it is the only one that can be
 * written correctly in a few dozen lines with no dependency. The cost is size,
 * which is why the capture is mono and downsampled: speech carries fine at
 * 16kHz, and the result is about 32KB a second, so a ten second phrase is a
 * third of a megabyte against a ten megabyte ceiling.
 */

/** Speech stays intelligible here, and every provider accepts it. */
export const TARGET_SAMPLE_RATE = 16_000;

const BYTES_PER_SAMPLE = 2;
const CHANNELS = 1;

/**
 * Resamples to the target rate by averaging each source window.
 *
 * Averaging rather than picking the nearest sample: dropping samples aliases
 * high frequencies down into the speech range, which sounds like a metallic
 * ring and would confuse the transcription this feeds.
 */
export function downsample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_SAMPLE_RATE) return input;
  if (fromRate < TARGET_SAMPLE_RATE) {
    throw new Error(`Cannot upsample from ${fromRate}Hz`);
  }

  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));

  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);

    let total = 0;
    for (let cursor = start; cursor < end; cursor += 1) total += input[cursor] ?? 0;
    output[index] = end > start ? total / (end - start) : 0;
  }

  return output;
}

/**
 * Wraps 32-bit float samples in a 16-bit PCM WAV container.
 *
 * The header is 44 bytes of little-endian fields whose sizes have to agree with
 * the data that follows; a mismatch produces a file that plays as silence or is
 * rejected outright, so the two length fields are derived rather than written
 * by hand.
 */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Blob {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  // Everything after this field, so the header minus the first eight bytes.
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");

  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk length
  view.setUint16(20, 1, true); // 1 is uncompressed PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true); // bits per sample

  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  // Clamped before scaling: a sample above 1 would wrap to a large negative
  // value, which is heard as a click rather than as the clipping it is.
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/** Joins the chunks a recorder collects into one contiguous buffer. */
export function concatChunks(chunks: readonly Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}
