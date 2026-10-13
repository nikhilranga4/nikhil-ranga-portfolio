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
  doorOpen: [0.03, 0.26] as const,
  fly: [0.08, 0.46] as const,
  /** Room copy and floating keys settle in */
  room: 0.48,
  /** The copy leaves and the camera tilts down to the glass floor */
  tilt: [0.7, 0.78] as const,
  /** Cracks race across the glass */
  crack: [0.72, 0.8] as const,
  /** The floor shatters */
  shatter: [0.8, 0.92] as const,
  /** The camera drops through the hole and turns to face the tower */
  drop: [0.86, 1] as const,
};

/** World units fallen per viewport height scrolled after the hero */
export const FALL_PER_VH = 6;
/** Height of the camera above the glass floor's underside where the free fall begins */
export const FALL_START_Y = -3.2;

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
  /** Viewports scrolled past the end of the hero (0 inside it) */
  fall: number;
  /** Viewports available to fall before the end of the page (the street landing) */
  fallMax: number;
  /** Scroll velocity in viewports per second (for wind and sway) */
  velocity: number;
  /** Sky for the free fall: the visitor's light/dark mode */
  mode: "night" | "day";
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

/** Viewports of scroll over which the fall slows to a stop at street level */
const LANDING = 1.3;
/** Camera height above the street once landed */
export const EYE_HEIGHT = 1.7;

/**
 * Fall depth in viewports, eased at the very end of the page so the camera decelerates and
 * touches down instead of stopping dead. Returns [depth, landing 0–1].
 */
export function fallDepth(fall: number, fallMax: number): [number, number] {
  const max = Math.max(fallMax, LANDING + 0.5);
  const f = Math.min(Math.max(fall, 0), max);
  const start = max - LANDING;
  if (f <= start) return [f, 0];
  const u = (f - start) / LANDING;
  // Slope 1 where it joins the free fall, 0 at the end
  return [start + LANDING * 0.5 * (1 - (1 - u) * (1 - u)), u];
}

/** Camera height for a fall position (world units) */
export const fallCameraY = (fall: number, fallMax: number) => FALL_START_Y - FALL_PER_VH * fallDepth(fall, fallMax)[0];

/** Street level: where the camera comes to rest at the end of the page, minus eye height */
export const streetLevel = (fallMax: number) => fallCameraY(Infinity, fallMax) - EYE_HEIGHT;

/**
 * How far we are into the free fall (0 in the room, 1 once falling), and how much of the day
 * sky is showing (light mode only; the switch happens inside the cloud bank).
 */
export function fallBlend(w: WorldState) {
  // The open air shows through as soon as the glass breaks
  const inFall = smooth(Math.min(1, span(w.progress, [SCROLL.shatter[0], SCROLL.drop[1]]) * 0.85 + w.fall * 1.2));
  const day = w.mode === "day" ? smooth(Math.min(1, w.fall * 1.6)) : 0;
  return { inFall, day };
}
