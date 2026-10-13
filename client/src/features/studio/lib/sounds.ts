/**
 * The built-in sounds. They are generated in the browser from oscillators and
 * noise, so they belong to us: nothing is downloaded and nothing is licensed.
 */
const SAMPLE_RATE = 44_100;

export interface BuiltInSound {
  readonly id: string;
  readonly name: string;
  readonly category: "Effects" | "Music";
  readonly seconds: number;
  readonly render: (ctx: OfflineAudioContext) => void;
}

/** A small, repeatable pseudo-random source, so a sound is the same every time it is made. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function noise(ctx: OfflineAudioContext, seconds: number): AudioBufferSourceNode {
  const random = seeded(7);
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function envelope(ctx: OfflineAudioContext, at: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  return gain;
}

function tone(ctx: OfflineAudioContext, type: OscillatorType, from: number, to: number, at: number, length: number, peak: number, attack = 0.005): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length);
  const gain = envelope(ctx, at, attack, 0, length, peak);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + attack + length);
}

function sweep(ctx: OfflineAudioContext, seconds: number, from: number, to: number, peak: number, q: number): void {
  const source = noise(ctx, seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, 0);
  filter.frequency.exponentialRampToValueAtTime(to, seconds * 0.9);
  const gain = envelope(ctx, 0, seconds * 0.45, 0, seconds * 0.5, peak);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

function pad(ctx: OfflineAudioContext, notes: readonly number[], at: number, length: number): void {
  for (const note of notes) {
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = note;
      osc.detune.value = detune;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.045, at + length * 0.35);
      gain.gain.linearRampToValueAtTime(0.0001, at + length);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + length);
    }
  }
}

const CHORDS = [
  [130.81, 164.81, 196, 246.94],
  [110, 130.81, 164.81, 196],
  [87.31, 130.81, 174.61, 220],
  [98, 123.47, 146.83, 196],
] as const;

export const SOUNDS: readonly BuiltInSound[] = [
  { id: "whoosh", name: "Whoosh", category: "Effects", seconds: 0.9, render: (ctx) => sweep(ctx, 0.9, 300, 3500, 0.6, 1.2) },
  { id: "riser", name: "Riser", category: "Effects", seconds: 2.4, render: (ctx) => sweep(ctx, 2.4, 200, 7000, 0.5, 2) },
  { id: "pop", name: "Pop", category: "Effects", seconds: 0.2, render: (ctx) => tone(ctx, "sine", 520, 110, 0, 0.14, 0.9) },
  {
    id: "click",
    name: "Click",
    category: "Effects",
    seconds: 0.08,
    render: (ctx) => {
      const source = noise(ctx, 0.08);
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2500;
      source.connect(filter).connect(envelope(ctx, 0, 0.001, 0, 0.03, 0.7)).connect(ctx.destination);
      source.start();
    },
  },
  {
    id: "ding",
    name: "Ding",
    category: "Effects",
    seconds: 1.5,
    render: (ctx) => {
      tone(ctx, "sine", 1320, 1320, 0, 1.4, 0.5);
      tone(ctx, "sine", 2640, 2640, 0, 0.9, 0.15);
    },
  },
  {
    id: "chime",
    name: "Chime",
    category: "Effects",
    seconds: 1.6,
    render: (ctx) => [784, 988, 1175].forEach((hz, i) => tone(ctx, "triangle", hz, hz, i * 0.12, 1.1, 0.35)),
  },
  {
    id: "impact",
    name: "Impact",
    category: "Effects",
    seconds: 1.5,
    render: (ctx) => {
      tone(ctx, "sine", 95, 32, 0, 1.3, 0.95);
      const source = noise(ctx, 0.5);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      source.connect(filter).connect(envelope(ctx, 0, 0.002, 0, 0.4, 0.6)).connect(ctx.destination);
      source.start();
    },
  },
  {
    id: "sparkle",
    name: "Sparkle",
    category: "Effects",
    seconds: 1.2,
    render: (ctx) => {
      const random = seeded(11);
      for (let i = 0; i < 9; i += 1) tone(ctx, "sine", 2200 + random() * 2800, 2200 + random() * 2800, i * 0.09, 0.25, 0.18);
    },
  },
  {
    id: "calm-pad",
    name: "Calm pad",
    category: "Music",
    seconds: 16,
    render: (ctx) => CHORDS.forEach((chord, i) => pad(ctx, chord, i * 4, 4.4)),
  },
  {
    id: "pulse",
    name: "Pulse beat",
    category: "Music",
    seconds: 8,
    render: (ctx) => {
      const beat = 0.5;
      for (let i = 0; i < 16; i += 1) {
        if (i % 2 === 0) tone(ctx, "sine", 150, 45, i * beat, 0.22, 0.9);
        const hat = noise(ctx, 0.05);
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 7000;
        hat.connect(filter).connect(envelope(ctx, i * beat * 0.5 + (i % 2) * 0.25, 0.001, 0, 0.04, 0.18)).connect(ctx.destination);
        hat.start(i * beat * 0.5 + (i % 2) * 0.25);
        tone(ctx, "square", [110, 138.59, 164.81, 138.59][i % 4]!, [110, 138.59, 164.81, 138.59][i % 4]!, i * beat, 0.4, 0.12);
      }
    },
  },
];

export const soundRef = (id: string): string => `lib:${id}`;
export const soundId = (src: string): string | null => (src.startsWith("lib:") ? src.slice(4) : null);
export const soundFor = (id: string): BuiltInSound | undefined => SOUNDS.find((s) => s.id === id);

function encodeWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (offset: number, value: string): void => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  return new Blob([bytes], { type: "audio/wav" });
}

const made = new Map<string, Promise<string>>();

/** A playable address for a built-in sound, generated the first time it is asked for. */
export function soundUrl(id: string): Promise<string> {
  const sound = soundFor(id);
  if (!sound) return Promise.reject(new Error("Unknown sound."));
  let url = made.get(id);
  if (!url) {
    url = (async () => {
      const ctx = new OfflineAudioContext(1, Math.ceil(sound.seconds * SAMPLE_RATE), SAMPLE_RATE);
      sound.render(ctx);
      return URL.createObjectURL(encodeWav(await ctx.startRendering()));
    })();
    made.set(id, url);
  }
  return url;
}
