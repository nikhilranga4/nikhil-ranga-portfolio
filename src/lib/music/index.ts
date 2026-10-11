import { useEffect, useSyncExternalStore } from "react";
import type { NightShift } from "./engine";

/**
 * Site audio controller: background music plus the intro's sound effects. Browsers only allow
 * audio once the visitor has interacted with the page (unless their browser allows autoplay).
 * The intro tries to start audio straight away and otherwise unlocks it on the first key press /
 * tap, then the music fades in when the home page is revealed; after the intro, the first
 * interaction starts the music directly. Music fades in and out, pauses while the tab is hidden,
 * and the visitor's mute choice is remembered.
 */

const STORAGE_KEY = "portfolio-music";
const VOLUME = 0.6;
const LOOKAHEAD = 0.15;
const SFX_VOLUME = 1.2;

interface MusicState {
  /** The visitor wants music (persisted). */
  enabled: boolean;
  /** Audio is actually playing right now. */
  playing: boolean;
  /** The browser has let audio start (needs a user interaction, unless autoplay is allowed). */
  unlocked: boolean;
}

const readPref = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writePref = (value: "on" | "off") => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage unavailable — the choice just won't persist
  }
};

let state: MusicState = { enabled: readPref() !== "off", playing: false, unlocked: false };
const listeners = new Set<() => void>();
const setState = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let engine: NightShift | null = null;
let timer = 0;
let suspendTimer = 0;

const tick = () => {
  if (ctx && engine) engine.scheduleUntil(ctx.currentTime + LOOKAHEAD);
};

const fadeTo = (value: number, seconds: number) => {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(value, now + seconds);
};

/** Create the context inside the user gesture (required on iOS), then load the synth lazily. */
function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor({ latencyHint: "playback" });
  const context = ctx;
  context.onstatechange = () => {
    if (context.state === "running" && !state.unlocked) setState({ unlocked: true });
  };
  master = ctx.createGain();
  master.gain.value = 0;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  master.connect(analyser);
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = SFX_VOLUME;
  sfxBus.connect(ctx.destination);
  return ctx;
}

async function startEngine() {
  if (!ctx || !master) return;
  if (!engine) {
    const { NightShift } = await import("./engine");
    if (!ctx || !master) return;
    engine = new NightShift(ctx, master);
  }
  engine.resync(ctx.currentTime);
  window.clearInterval(timer);
  timer = window.setInterval(tick, 25);
  tick();
}

function resumeAudio() {
  const context = ensureContext();
  if (!context) return;
  window.clearTimeout(suspendTimer);
  void context.resume().then(() => {
    if (context.state !== "running") {
      // The browser didn't accept this as a user gesture; wait for the next one
      setState({ playing: false });
      armAutostart();
      return;
    }
    void startEngine().then(() => {
      // The visitor may have muted again while the synth was loading
      if (state.playing) fadeTo(VOLUME, 2.5);
    });
  });
}

function pauseAudio(fade = 0.6) {
  if (!ctx) return;
  fadeTo(0, fade);
  window.clearTimeout(suspendTimer);
  suspendTimer = window.setTimeout(() => {
    window.clearInterval(timer);
    void ctx?.suspend();
  }, fade * 1000 + 50);
}

export function playMusic() {
  writePref("on");
  setState({ enabled: true, playing: true });
  resumeAudio();
}

export function muteMusic() {
  disarmAutostart();
  writePref("off");
  setState({ enabled: false, playing: false });
  pauseAudio();
}

export function toggleMusic() {
  if (state.playing) muteMusic();
  else playMusic();
}

export function getAnalyser() {
  return analyser;
}

/** Whether the visitor wants sound (not muted). */
export function soundEnabled() {
  return state.enabled;
}

/**
 * Create / resume the audio context without starting the music (works straight away if the
 * browser allows autoplay, otherwise from inside a user gesture), and warm up the synth so the
 * music can start instantly later. Returns whether audio is running.
 */
export function unlockAudio() {
  if (!state.enabled) return false;
  const context = ensureContext();
  if (!context) return false;
  window.clearTimeout(suspendTimer);
  if (context.state !== "running") void context.resume();
  void import("./engine");
  return context.state === "running";
}

/** Play a sound effect now (or `delay` seconds from now) if sound is on and unlocked. */
export function playSfx(fx: (ctx: BaseAudioContext, out: AudioNode, t: number) => void, delay = 0) {
  if (!state.enabled || !ctx || !sfxBus || ctx.state !== "running") return;
  fx(ctx, sfxBus, ctx.currentTime + 0.005 + delay);
}

let introActive = false;

/** The intro loader is showing (true) or has started revealing the page (false). */
export function setIntroActive(active: boolean) {
  introActive = active;
  if (active || !state.enabled || state.playing) return;
  if (ctx && ctx.state === "running") {
    disarmAutostart();
    setState({ playing: true });
    resumeAudio();
  } else {
    armAutostart();
  }
}

// ── Autostart on the first interaction ─────────────────────────────────────

const GESTURES = ["pointerdown", "keydown", "touchend"] as const;
let armed = false;

const onGesture = (e: Event) => {
  // The sound button handles its own clicks (it would otherwise start and then mute)
  if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
  if (e instanceof KeyboardEvent && (e.key === "Escape" || e.metaKey || e.ctrlKey)) return;
  // During the intro this gesture only unlocks audio; the music waits for the reveal
  if (introActive) {
    unlockAudio();
    return;
  }
  disarmAutostart();
  if (state.enabled && !state.playing) {
    setState({ playing: true });
    resumeAudio();
  }
};

function armAutostart() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  GESTURES.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }));
}

function disarmAutostart() {
  armed = false;
  GESTURES.forEach((g) => window.removeEventListener(g, onGesture, { capture: true }));
}

// Pause while the tab is hidden; pick up again when the visitor comes back
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!state.playing || !ctx) return;
    if (document.hidden) pauseAudio(0.3);
    else resumeAudio();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

/** Music state for UI, and arms the start-on-first-interaction behaviour. */
export function useMusic() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (state.enabled && !state.playing) armAutostart();
  }, []);
  return snapshot;
}
