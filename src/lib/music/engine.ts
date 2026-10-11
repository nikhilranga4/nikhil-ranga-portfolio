/**
 * "Night Shift": a laid-back synthwave / lo-fi tech loop, synthesised live with the Web Audio API.
 * No audio files ship with the site and the arrangement keeps evolving, so there is no loop seam.
 *
 * The engine only schedules notes; it works with a realtime AudioContext (driven by the
 * controller in ./index.ts) and with an OfflineAudioContext (rendering to a file).
 */

const BPM = 88;
/** One 16th note, in seconds */
const STEP = 60 / BPM / 4;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Chord {
  root: number;
  pad: number[];
  arp: number[];
}

// A minor: Am9 → Fmaj7 → Cmaj7 → G6, two bars each, voiced to move smoothly
const CHORDS: Chord[] = [
  { root: 45, pad: [57, 60, 64, 67, 71], arp: [69, 72, 76, 79, 83] },
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76, 81] },
  { root: 48, pad: [55, 59, 60, 64], arp: [67, 71, 72, 76, 79] },
  { root: 43, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76, 79] },
];

// Arpeggio patterns: indexes into chord.arp per 16th, -1 = rest
const ARP_SPARSE = [0, -1, 2, 1, -1, 3, 2, -1, 4, -1, 3, 2, -1, 1, 2, -1];
const ARP_FULL = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 1, 3, 4, 3, 2, 1];
// Bass: [step, length in steps, octave up]
const BASS: [number, number, boolean][] = [
  [0, 5, false],
  [6, 2, false],
  [8, 5, false],
  [14, 2, true],
];

export class NightShift {
  private readonly ctx: BaseAudioContext;
  private readonly noise: AudioBuffer;
  private readonly mix: GainNode;
  private readonly padBus: GainNode;
  private readonly reverb: GainNode;
  private readonly delay: GainNode;
  private step = 0;
  private nextTime: number;

  constructor(ctx: BaseAudioContext, out: AudioNode, startAt = ctx.currentTime + 0.05) {
    this.ctx = ctx;
    this.nextTime = startAt;

    // Gentle glue on the whole mix
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.3;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 15000;
    this.mix = ctx.createGain();
    this.mix.connect(warmth).connect(comp).connect(out);

    // Room: generated impulse response, so nothing is downloaded
    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulse(3.2);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.32;
    this.reverb = ctx.createGain();
    this.reverb.connect(convolver).connect(reverbReturn).connect(this.mix);

    // Dotted-eighth echo with a darkening feedback loop
    const delayLine = ctx.createDelay(2);
    delayLine.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const darken = ctx.createBiquadFilter();
    darken.type = "lowpass";
    darken.frequency.value = 2400;
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.28;
    this.delay = ctx.createGain();
    this.delay.connect(delayLine);
    delayLine.connect(darken).connect(feedback).connect(delayLine);
    delayLine.connect(delayReturn).connect(this.mix);

    // Pads share one slowly breathing filter
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 1100;
    padFilter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 450;
    lfo.connect(lfoDepth).connect(padFilter.frequency);
    lfo.start(startAt);
    this.padBus = ctx.createGain();
    this.padBus.connect(padFilter);
    padFilter.connect(this.mix);
    padFilter.connect(this.send(this.reverb, 0.6));

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Schedule every note that starts before `until` (seconds on the context clock). */
  scheduleUntil(until: number) {
    while (this.nextTime < until) {
      this.play(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
    }
  }

  /** Skip ahead if the clock moved on without us (e.g. after the tab was in the background). */
  resync(now: number) {
    if (this.nextTime < now) this.nextTime = now + 0.05;
  }

  // ── Arrangement ──────────────────────────────────────────────────────────

  private play(step: number, t: number) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const phrase = bar % 16; // 16-bar phrase: chords twice, second half busier
    const chord = CHORDS[Math.floor(phrase / 2) % CHORDS.length];
    const intro = bar < 4;
    const busy = phrase >= 8 && !intro;

    if (s === 0 && phrase % 2 === 0) this.pad(chord, t, STEP * 32);

    const pattern = busy ? ARP_FULL : ARP_SPARSE;
    const idx = pattern[s];
    if (idx >= 0) this.pluck(chord.arp[idx], t, s % 2 === 0 ? 0.3 : -0.3, intro ? 0.55 : busy ? 0.85 : 1);

    if (bar >= 2) {
      for (const [at, len, up] of BASS) if (at === s) this.bass(chord.root + (up ? 12 : 0), t, STEP * len);
    }

    if (!intro) {
      // Lazy swing on the off-beat 8ths
      const swing = s % 4 === 2 ? STEP * 0.18 : 0;
      if (s === 0 || s === 10 || (s === 7 && bar % 4 === 3)) this.kick(t);
      if (s === 4 || s === 12) this.snare(t);
      if (s % 2 === 0) this.hat(t + swing, s === 14 && bar % 2 === 1 ? 0.26 : 0.075, s % 4 === 0 ? 0.6 : 1);
      if (busy && s % 2 === 1 && (s === 3 || s === 11)) this.hat(t, 0.06, 0.45);
    }

    if (busy && phrase % 2 === 0 && (s === 0 || s === 10)) this.bell(chord.arp[s === 0 ? 4 : 3] + 12, t);
  }

  // ── Voices ───────────────────────────────────────────────────────────────

  private pad(chord: Chord, t: number, length: number) {
    const { ctx } = this;
    const attack = 1.2;
    const release = 1.8;
    for (const note of chord.pad) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.045, t + attack);
      env.gain.setValueAtTime(0.045, t + length - 0.2);
      env.gain.linearRampToValueAtTime(0, t + length + release);
      env.connect(this.padBus);
      for (const cents of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = hz(note);
        osc.detune.value = cents;
        osc.connect(env);
        osc.start(t);
        osc.stop(t + length + release + 0.05);
      }
    }
  }

  private pluck(note: number, t: number, pan: number, level: number) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz(note);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.Q.value = 3;
    tone.frequency.setValueAtTime(4800, t);
    tone.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(tone).connect(env).connect(panner);
    panner.connect(this.mix);
    panner.connect(this.send(this.delay, 0.5));
    panner.connect(this.send(this.reverb, 0.3));
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private bass(note: number, t: number, length: number) {
    const { ctx } = this;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.1, t + 0.015);
    env.gain.setValueAtTime(0.1, t + length * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.08);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 420;
    tone.connect(env).connect(this.mix);
    for (const [type, gain] of [
      ["sine", 1],
      ["triangle", 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = hz(note);
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(tone);
      osc.start(t);
      osc.stop(t + length + 0.1);
    }
  }

  private kick(t: number) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.45, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(env).connect(this.mix);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  private snare(t: number) {
    const { ctx } = this;
    const src = this.noiseSource(t, 0.25);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1700;
    band.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.42, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(band).connect(env);
    env.connect(this.mix);
    env.connect(this.send(this.reverb, 0.5));

    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(210, t);
    body.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    const bodyEnv = ctx.createGain();
    bodyEnv.gain.setValueAtTime(0.16, t);
    bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    body.connect(bodyEnv).connect(this.mix);
    body.start(t);
    body.stop(t + 0.12);
  }

  private hat(t: number, decay: number, level: number) {
    const { ctx } = this;
    const src = this.noiseSource(t, decay + 0.05);
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 6000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0.2;
    src.connect(high).connect(env).connect(panner).connect(this.mix);
  }

  /** Soft FM bell for the busier half of each phrase */
  private bell(note: number, t: number) {
    const { ctx } = this;
    const carrier = ctx.createOscillator();
    carrier.frequency.value = hz(note);
    const mod = ctx.createOscillator();
    mod.frequency.value = hz(note) * 3.5;
    const modDepth = ctx.createGain();
    modDepth.gain.setValueAtTime(hz(note) * 1.2, t);
    modDepth.gain.exponentialRampToValueAtTime(1, t + 1.2);
    mod.connect(modDepth).connect(carrier.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    carrier.connect(env);
    env.connect(this.mix);
    env.connect(this.send(this.reverb, 0.7));
    env.connect(this.send(this.delay, 0.4));
    for (const o of [carrier, mod]) {
      o.start(t);
      o.stop(t + 2.1);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private send(bus: AudioNode, amount: number) {
    const g = this.ctx.createGain();
    g.gain.value = amount;
    g.connect(bus);
    return g;
  }

  private noiseSource(t: number, length: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(t, Math.random() * 0.5);
    src.stop(t + length);
    return src;
  }

  private impulse(seconds: number) {
    const { ctx } = this;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    return buffer;
  }
}
