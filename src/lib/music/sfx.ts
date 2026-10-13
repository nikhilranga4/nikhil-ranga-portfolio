/**
 * Intro sound effects, synthesised with the Web Audio API: mechanical key clicks, a chunky Enter,
 * an airy whoosh for the reveal and a soft chime as the name types in. Each takes a context, an
 * output and a start time, so the same code plays live and renders offline.
 */

/** Small deterministic random so every key sounds a little different, but the same on each visit. */
const jitter = (seed: number, salt: number) => {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x); // 0..1
};

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

function burst(ctx: BaseAudioContext, out: AudioNode, t: number, o: { type: BiquadFilterType; freq: number; q: number; level: number; decay: number; offset?: number }) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = o.type;
  filter.frequency.value = o.freq;
  filter.Q.value = o.q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(o.level, t + 0.0015);
  env.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  src.connect(filter).connect(env).connect(out);
  src.start(t, o.offset ?? 0);
  src.stop(t + o.decay + 0.02);
}

function thock(ctx: BaseAudioContext, out: AudioNode, t: number, from: number, to: number, level: number, decay: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + decay * 0.6);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + decay + 0.02);
}

function panned(ctx: BaseAudioContext, out: AudioNode, pan: number) {
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(out);
  return p;
}

/** One mechanical key: click + thock on the way down, a lighter clack on release. */
export function keyClick(ctx: BaseAudioContext, out: AudioNode, t: number, index: number, pan = 0) {
  const pitch = 0.92 + jitter(index, 1) * 0.16;
  const level = 0.85 + jitter(index, 2) * 0.3;
  const dest = panned(ctx, out, pan);
  burst(ctx, dest, t, { type: "bandpass", freq: 3600 * pitch, q: 1.2, level: 0.22 * level, decay: 0.012, offset: jitter(index, 3) * 0.5 });
  thock(ctx, dest, t + 0.003, 260 * pitch, 150 * pitch, 0.32 * level, 0.05);
  burst(ctx, dest, t + 0.004, { type: "lowpass", freq: 900, q: 0.7, level: 0.16 * level, decay: 0.03, offset: jitter(index, 4) * 0.5 });
  // Upstroke ~90 ms later
  burst(ctx, dest, t + 0.09, { type: "bandpass", freq: 2800 * pitch, q: 1.5, level: 0.07 * level, decay: 0.01, offset: jitter(index, 5) * 0.5 });
  thock(ctx, dest, t + 0.09, 330 * pitch, 220 * pitch, 0.07 * level, 0.025);
}

/** The Enter key: bigger, deeper, with a little stabiliser rattle. */
export function enterThunk(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const dest = panned(ctx, out, 0.35);
  burst(ctx, dest, t, { type: "bandpass", freq: 2600, q: 1, level: 0.26, decay: 0.016, offset: 0.1 });
  thock(ctx, dest, t + 0.004, 170, 85, 0.5, 0.09);
  burst(ctx, dest, t + 0.006, { type: "lowpass", freq: 650, q: 0.8, level: 0.24, decay: 0.05, offset: 0.2 });
  burst(ctx, dest, t + 0.02, { type: "bandpass", freq: 1900, q: 6, level: 0.05, decay: 0.035, offset: 0.3 });
  burst(ctx, dest, t + 0.13, { type: "bandpass", freq: 2300, q: 1.4, level: 0.09, decay: 0.014, offset: 0.4 });
  thock(ctx, dest, t + 0.13, 240, 160, 0.09, 0.03);
}

/** Airy swoosh that rises and fades as the columns lift off the page. */
export function whoosh(ctx: BaseAudioContext, out: AudioNode, t: number, length = 1.1) {
  for (const [pan, offset, from, to] of [
    [-0.45, 0.05, 280, 2600],
    [0.45, 0.35, 340, 3200],
  ] as const) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(from, t);
    band.frequency.exponentialRampToValueAtTime(to, t + length * 0.55);
    band.frequency.exponentialRampToValueAtTime(to * 0.6, t + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32, t + length * 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(band).connect(env).connect(panned(ctx, out, pan));
    src.start(t, offset);
    src.stop(t + length + 0.05);
  }
  // A soft low sweep underneath gives it weight
  const sub = ctx.createOscillator();
  sub.frequency.setValueAtTime(90, t);
  sub.frequency.exponentialRampToValueAtTime(55, t + length);
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0.0001, t);
  subEnv.gain.exponentialRampToValueAtTime(0.18, t + length * 0.45);
  subEnv.gain.exponentialRampToValueAtTime(0.0001, t + length);
  sub.connect(subEnv).connect(out);
  sub.start(t);
  sub.stop(t + length + 0.05);
}

/** Three soft bell notes (A minor, matching the music) as the name types in. */
export function chime(ctx: BaseAudioContext, out: AudioNode, t: number) {
  [81, 84, 88].forEach((midi, i) => {
    const start = t + i * 0.14;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const carrier = ctx.createOscillator();
    carrier.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * 2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(freq * 0.6, start);
    depth.gain.exponentialRampToValueAtTime(1, start + 0.8);
    mod.connect(depth).connect(carrier.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(0.09, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
    carrier.connect(env).connect(panned(ctx, out, -0.3 + i * 0.3));
    for (const o of [carrier, mod]) {
      o.start(start);
      o.stop(start + 1.5);
    }
  });
}

/** A short bright tinkle: one shard of glass ringing off another. */
function tinkle(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, level: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + 0.25);
  const ring = ctx.createOscillator();
  ring.type = "triangle";
  ring.frequency.value = freq * 2.76; // inharmonic partial, like a struck glass plate
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  const ringEnv = ctx.createGain();
  ringEnv.gain.setValueAtTime(0.0001, t);
  ringEnv.gain.exponentialRampToValueAtTime(level * 0.35, t + 0.002);
  ringEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(env).connect(out);
  ring.connect(ringEnv).connect(out);
  for (const o of [osc, ring]) {
    o.start(t);
    o.stop(t + 0.3);
  }
}

/** The glass floor giving way: a sharp snap, then creaking fractures spreading out. */
export function glassCrack(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const dest = panned(ctx, out, 0.1);
  burst(ctx, dest, t, { type: "highpass", freq: 3200, q: 0.7, level: 0.42, decay: 0.035, offset: 0.12 });
  burst(ctx, dest, t + 0.004, { type: "bandpass", freq: 1500, q: 2.5, level: 0.2, decay: 0.06, offset: 0.3 });
  thock(ctx, dest, t + 0.002, 140, 60, 0.32, 0.18);
  // Fractures racing outward: a few smaller snaps, each panned a little further
  for (let i = 0; i < 6; i++) {
    const at = t + 0.09 + i * 0.07 + jitter(i, 7) * 0.05;
    const side = panned(ctx, out, (jitter(i, 8) - 0.5) * 1.2);
    burst(ctx, side, at, { type: "bandpass", freq: 2400 + jitter(i, 9) * 3000, q: 3, level: 0.12 - i * 0.012, decay: 0.02, offset: jitter(i, 10) * 0.6 });
  }
  // Low creak under it all
  const creak = ctx.createOscillator();
  creak.type = "sawtooth";
  creak.frequency.setValueAtTime(70, t + 0.05);
  creak.frequency.exponentialRampToValueAtTime(42, t + 0.6);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t + 0.05);
  env.gain.exponentialRampToValueAtTime(0.06, t + 0.15);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
  creak.connect(lp).connect(env).connect(out);
  creak.start(t + 0.05);
  creak.stop(t + 0.7);
}

/** The floor shattering: a broadband crash, a shower of ringing shards, then a rattling tail. */
export function glassShatter(ctx: BaseAudioContext, out: AudioNode, t: number) {
  burst(ctx, panned(ctx, out, -0.2), t, { type: "highpass", freq: 1800, q: 0.5, level: 0.5, decay: 0.22, offset: 0.05 });
  burst(ctx, panned(ctx, out, 0.2), t + 0.01, { type: "bandpass", freq: 4200, q: 0.8, level: 0.3, decay: 0.35, offset: 0.45 });
  burst(ctx, out, t, { type: "lowpass", freq: 500, q: 0.7, level: 0.35, decay: 0.12, offset: 0.7 });
  thock(ctx, out, t, 110, 45, 0.42, 0.25);
  // Shards ringing as they break apart and hit each other
  for (let i = 0; i < 18; i++) {
    const at = t + 0.02 + Math.pow(jitter(i, 11), 1.6) * 0.9;
    const freq = 2000 + jitter(i, 12) * 5000;
    tinkle(ctx, panned(ctx, out, (jitter(i, 13) - 0.5) * 1.6), at, freq, 0.07 * (1 - (at - t) / 1.1));
  }
  // Debris rattle
  for (let i = 0; i < 10; i++) {
    const at = t + 0.25 + i * 0.075 + jitter(i, 14) * 0.04;
    burst(ctx, panned(ctx, out, (jitter(i, 15) - 0.5) * 1.4), at, { type: "bandpass", freq: 3000 + jitter(i, 16) * 2500, q: 4, level: 0.07 * (1 - i / 11), decay: 0.015, offset: jitter(i, 17) * 0.6 });
  }
}

/** A falling glass section landing: a soft thud and two quiet clinks (kept low; it repeats). */
export function glassClink(ctx: BaseAudioContext, out: AudioNode, t: number, index = 0) {
  thock(ctx, out, t, 150, 70, 0.14, 0.12);
  burst(ctx, out, t, { type: "lowpass", freq: 700, q: 0.7, level: 0.07, decay: 0.05, offset: jitter(index, 18) * 0.5 });
  const pitch = 2600 + jitter(index, 19) * 1600;
  tinkle(ctx, panned(ctx, out, (jitter(index, 20) - 0.5) * 0.8), t + 0.01, pitch, 0.035);
  tinkle(ctx, panned(ctx, out, (jitter(index, 21) - 0.5) * 0.8), t + 0.07, pitch * 1.34, 0.02);
}

