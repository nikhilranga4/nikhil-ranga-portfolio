import { useEffect, useSyncExternalStore } from "react";
import type { NightShift } from "./engine";

/**
 * Background music controller. Browsers only allow audio after the visitor interacts with the
 * page, so music starts on the first click / tap / key press (unless they muted it before), fades
 * in and out, pauses while the tab is hidden, and remembers the visitor's choice.
 */

const STORAGE_KEY = "portfolio-music";
const VOLUME = 0.6;
const LOOKAHEAD = 0.15;

interface MusicState {
  /** The visitor wants music (persisted). */
  enabled: boolean;
  /** Audio is actually playing right now. */
  playing: boolean;
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

let state: MusicState = { enabled: readPref() !== "off", playing: false };
const listeners = new Set<() => void>();
const setState = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
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
  master = ctx.createGain();
  master.gain.value = 0;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  master.connect(analyser);
  master.connect(ctx.destination);
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

// ── Autostart on the first interaction ─────────────────────────────────────

const GESTURES = ["pointerdown", "keydown", "touchend"] as const;
let armed = false;

const onGesture = (e: Event) => {
  // The sound button handles its own clicks (it would otherwise start and then mute)
  if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
  if (e instanceof KeyboardEvent && (e.key === "Escape" || e.metaKey || e.ctrlKey)) return;
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
