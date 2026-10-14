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
  /** The copy leaves and the camera steps up to the window behind the desk */
  tilt: [0.7, 0.78] as const,
  /** Cracks race across the window */
  crack: [0.72, 0.8] as const,
  /** The window blows out (from here the fall plays by itself, see useAutoDrop) */
  shatter: [0.8, 0.92] as const,
  /** The camera goes out through the window and down to the road (finishes past the hero) */
  drop: [0.86, 1] as const,
};

/** The road, far below the room: the camera falls straight down to it */
export const STREET_Y = -70;
/** The avenue starts out along +x (up the screen once we're hovering above it), six lanes wide; see route.ts for its corners */
export const ROAD = { z: -14, lane: 3.5, lanes: 6 } as const;
export const ROAD_HALF = (ROAD.lane * ROAD.lanes) / 2;
/** Where along the road we land (just past the room, so the tower is in view at first) */
export const ROAD_X0 = 4;
/** The camera drifts along the road at this share of the convoy's speed */
export const CAMERA_DRIFT = 0.6;
/** Viewports scrolled past the hero over which the drop finishes */
export const DROP_AFTER = 0.85;
/** Height of the card plane above the road (the panels ride on the trucks) */
export const CARD_PLANE = 3.2;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(20));

/**
 * World units per CSS pixel at the card plane. Phones see a narrower stretch of road, so the
 * trucks stay a sensible size next to the cards.
 */
export const roadScale = (vw: number) => (vw >= 1024 ? 30 : vw >= 640 ? 24 : 19) / vw;

/** Camera height above the road that makes the card plane map 1:1 onto the page */
export const hoverHeight = (vw: number, vh: number) => CARD_PLANE + (roadScale(vw) * vh) / (2 * TAN_HALF_FOV);

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
  /** Page scroll (CSS px), read from Lenis on the frame it moves the page */
  scroll: number;
  /** Scroll position where the hero's pinned track ends */
  heroEnd: number;
  /** Where the pinned track starts, and its scroll length */
  heroTop: number;
  heroLen: number;
  /** Viewports of hero scroll the drop beat takes */
  heroDropVh: number;
  /** Viewport size (CSS px) */
  vw: number;
  vh: number;
  /** Timestamp of the frame being drawn (same clock as the page's animations) */
  now: number;
  /** Scroll velocity in viewports per second (for wind and sway) */
  velocity: number;
  /** Sky and street lighting: the visitor's light/dark mode */
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

/** Street level (shards and debris come to rest there) */
export const streetLevel = () => STREET_Y;

/** 0 at the start of the drop, 1 once hovering over the road */
export function dropProgress(w: WorldState) {
  const inHero = span(w.progress, SCROLL.drop) * w.heroDropVh;
  return clamp01((inHero + w.fall) / (w.heroDropVh + DROP_AFTER));
}

/** Scroll position where the camera has landed and the convoy takes over */
export const landedAt = (w: WorldState) => w.heroEnd + DROP_AFTER * w.vh;

/**
 * How far we are into the free fall (0 in the room, 1 once falling), and how much of the day
 * sky is showing (light mode only).
 */
export function fallBlend(w: WorldState) {
  // The open air shows through as soon as the glass breaks
  const inFall = smooth(Math.min(1, span(w.progress, [SCROLL.shatter[0], SCROLL.drop[1]]) * 0.85 + w.fall * 1.2));
  // Light mode: daylight floods in as the glass breaks, fully day by the time we drop through
  const day = w.mode === "day" ? smooth(Math.min(1, span(w.progress, [SCROLL.shatter[0], SCROLL.drop[1]]) * 1.1 + w.fall * 2)) : 0;
  return { inFall, day };
}
