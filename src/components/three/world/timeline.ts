import * as THREE from "three";

/**
 * One continuous shot, in two halves:
 *  - the intro plays on a clock once the boot screen lifts (seconds below), and
 *  - everything after is driven by scroll through the pinned hero (`progress`, 0–1).
 */

/** Gap before each key press: an uneven, human rhythm with a breath between the two words. */
const GAPS = [0, 0.23, 0.25, 0.22, 0.26, 0.24, 0.42, 0.23, 0.25, 0.22, 0.24];

export const NAME_ROWS = ["NIKHIL", "RANGA"] as const;
export const NAME_KEYS = NAME_ROWS.join("").length;

export const INTRO = {
  /** The keyboard rises out of the dark */
  keyboardIn: 0.15,
  typeStart: 1.2,
  enterIn: 3.95,
  enterPress: 4.5,
  /** The door's neon flickers on */
  powerOn: 4.55,
  /** Typed keys launch off the keyboard */
  launch: 4.7,
  /** Camera pulls back from the keyboard to frame the door */
  pullBack: [4.7, 6.5] as const,
  /** Floating hero keycaps start dropping in */
  keysDrop: 5.5,
  /** The name types in over the scene (DOM) */
  nameIn: 5.8,
  done: 6.6,
};

/** When each name key gets pressed, in seconds from the intro start. */
export const KEY_TIMES = GAPS.reduce<number[]>((times, gap, i) => [...times, (i ? times[i - 1] : INTRO.typeStart) + gap], []);
export const PRESS_TIME = 0.17;

/** Scroll beats (share of the pinned hero) */
export const SCROLL = {
  doorOpen: [0.04, 0.34] as const,
  fly: [0.1, 0.66] as const,
  /** Room copy and floating keys settle in */
  room: 0.7,
};

export interface WorldState {
  /** Seconds since the intro started (Infinity once skipped / finished, -1 before it starts) */
  intro: number;
  /** Scroll progress through the pinned hero, 0–1 */
  progress: number;
  /** Pointer in -1..1 (y up), eased */
  pointer: THREE.Vector2;
  /** Phone/portrait framing */
  portrait: boolean;
  reduceMotion: boolean;
  /** Keep rendering until this time (performance.now ms): the canvas renders on demand */
  busyUntil: number;
  /** Ask for frames for the next `ms` milliseconds */
  wake: (ms?: number) => void;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** 0→1 over [a, b] */
export const span = (v: number, [a, b]: readonly [number, number]) => clamp01((v - a) / (b - a));

/** Neon tube power-on flicker: the light stutters a few times before it holds. */
export function flicker(t: number, seed = 0) {
  if (t <= 0) return 0;
  const steps = [0.05, 0.11, 0.17, 0.26, 0.31, 0.42, 0.5].map((s) => s + seed * 0.04);
  const levels = [1, 0.05, 0.8, 0.15, 1, 0.35, 1];
  for (let i = steps.length - 1; i >= 0; i--) if (t >= steps[i]) return levels[i];
  return 0;
}
