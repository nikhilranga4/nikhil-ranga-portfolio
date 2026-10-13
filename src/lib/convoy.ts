/**
 * The convoy: past the hero, every page section rides on the back of a truck driving up the road
 * below the camera (see RideIn for the cards, RoadScene for the trucks). This module is what the
 * two halves share: where each card sits on the page, which truck carries it (picked at random on
 * every visit), and the arrival path both of them follow, so the DOM card and the WebGL truck move
 * as one.
 */

export const CAB_MODELS = ["truck", "truck-flat", "delivery", "delivery-flat", "garbage-truck", "firetruck"] as const;
export const CAR_MODELS = ["sedan", "sedan-sports", "taxi", "suv", "suv-luxury", "police", "ambulance", "hatchback-sports", "van", "delivery"] as const;
export type CabModel = (typeof CAB_MODELS)[number];
export type CarModel = (typeof CAR_MODELS)[number];

/** How a truck pulls in under its section */
export type ArrivalStyle = "left" | "right" | "behind" | "swerve";
const STYLES: ArrivalStyle[] = ["left", "right", "behind", "swerve"];

/** Paint colours the cabs get tinted with (mixed with white, so the kit's details survive) */
const TINTS = ["#ffffff", "#ffd9a8", "#bfe4ff", "#ffb4a8", "#c9f2d9", "#f2e3ff", "#ffe9a0"];

export interface RidePlan {
  cab: CabModel;
  tint: string;
  style: ArrivalStyle;
  /** Lane-change side for left/right/swerve arrivals */
  side: -1 | 1;
  /** An escort car riding alongside the cab, if any */
  escort: CarModel | null;
  horn: boolean;
}

export interface Slot {
  /** A section card, or the truck carrying the name in 3D letters (no card on it) */
  kind: "card" | "name";
  /** The card, in page coordinates (CSS px, untransformed) */
  top: number;
  left: number;
  width: number;
  height: number;
  /** Height of the gap above the card (where the cab drives) */
  gap: number;
  /** When its arrival started (document timeline ms); -1 = not yet, 0 = already there */
  start: number;
  plan: RidePlan;
}

export const ARRIVAL_MS = 1150;

/** The name the last truck carries, and how its letters are loaded on after it parks */
export const NAME_LOAD = "NIKHIL RANGA";
export const LETTER_GAP_MS = 170;
export const LETTER_DROP_MS = 460;

function shuffle<T>(list: readonly T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A new convoy for every visit: trucks, colours and arrivals all reshuffled */
function makePlans(count: number): RidePlan[] {
  const cabs = shuffle(CAB_MODELS);
  const tints = shuffle(TINTS);
  let styles = shuffle(STYLES);
  const plans: RidePlan[] = [];
  for (let i = 0; i < count; i++) {
    if (i % STYLES.length === 0 && i) {
      // Reshuffle, but never the same arrival twice in a row
      const last = styles[styles.length - 1];
      do styles = shuffle(STYLES);
      while (styles[0] === last);
    }
    plans.push({
      cab: cabs[i % cabs.length],
      tint: tints[i % tints.length],
      style: styles[i % STYLES.length],
      side: Math.random() < 0.5 ? -1 : 1,
      escort: Math.random() < 0.45 ? CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)] : null,
      horn: Math.random() < 0.34,
    });
  }
  return plans;
}

const PLAN_COUNT = 12;

export const convoy = {
  slots: new Map<number, Slot>(),
  plans: makePlans(PLAN_COUNT),
  /** Seed for the background traffic (also new every visit) */
  trafficSeed: Math.floor(Math.random() * 2147483646) + 1,
  /** Bumped whenever a slot is added, removed or re-measured */
  version: 0,
  /** Asks the 3D world for frames (set by the world while it's mounted) */
  wake: (ms?: number) => void ms,
};

if (typeof window !== "undefined") (window as unknown as { __convoyPlan: RidePlan[] }).__convoyPlan = convoy.plans;

// ── Page geometry ───────────────────────────────────────────────────────────

const elements = new Map<number, { card: HTMLElement; wrap: HTMLElement }>();

/** Page position from the layout boxes (unaffected by the arrival transforms) */
function pageOffset(el: HTMLElement) {
  let top = 0;
  let left = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
    top += e.offsetTop;
    left += e.offsetLeft;
  }
  return { top, left };
}

function measure() {
  for (const [index, { card, wrap }] of elements) {
    const slot = convoy.slots.get(index);
    if (!slot) continue;
    const { top, left } = pageOffset(card);
    slot.top = top;
    slot.left = left;
    slot.width = card.offsetWidth;
    slot.height = card.offsetHeight;
    slot.gap = parseFloat(getComputedStyle(wrap).paddingTop) || 0;
  }
  convoy.version++;
  convoy.wake(400);
}

// Anything above a card changing height moves it, so watch the whole page as well as the cards
let observer: ResizeObserver | null = null;
const getObserver = () => {
  if (!observer) {
    observer = new ResizeObserver(() => measure());
    observer.observe(document.body);
  }
  return observer;
};

export function registerSlot(index: number, card: HTMLElement, wrap: HTMLElement, arrived: boolean, kind: Slot["kind"] = "card") {
  elements.set(index, { card, wrap });
  convoy.slots.set(index, { kind, top: 0, left: 0, width: 0, height: 0, gap: 0, start: arrived ? 0 : -1, plan: convoy.plans[index % PLAN_COUNT] });
  getObserver().observe(card);
  measure();
  return () => {
    observer?.unobserve(card);
    elements.delete(index);
    convoy.slots.delete(index);
    convoy.version++;
  };
}

// ── The arrival path (shared by the card and its truck) ────────────────────

export interface Pose {
  /** Offset from the parked position, CSS px (y down) */
  dx: number;
  dy: number;
  /** Heading, radians clockwise on screen */
  yaw: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

function offset(style: ArrivalStyle, side: number, u: number, vw: number, vh: number) {
  // Braking: fast at first, settling softly
  const brake = 1 - Math.pow(1 - clamp01(u), 3);
  const lane = smoothstep(u / 0.82);
  switch (style) {
    case "left":
    case "right": {
      const s = style === "left" ? -1 : 1;
      return { dx: s * 0.26 * vw * (1 - lane), dy: 0.62 * vh * (1 - brake) };
    }
    case "behind":
      return { dx: 0, dy: 1.05 * vh * (1 - brake) };
    case "swerve":
      // Pulls out to overtake, then tucks back in
      return { dx: side * 0.12 * vw * Math.sin(Math.PI * lane), dy: 0.85 * vh * (1 - brake) };
  }
}

/**
 * Where a card and its truck are `u` (0–1) of the way through an arrival, relative to their parked
 * spot. The heading follows the path; the convoy's own forward speed keeps it gentle.
 */
export function arrivalPose(plan: RidePlan, u: number, vw: number, vh: number, height: number): Pose {
  const a = offset(plan.style, plan.side, u, vw, vh);
  const b = offset(plan.style, plan.side, Math.min(1, u + 0.01), vw, vh);
  const vx = (b.dx - a.dx) / 0.01 / ARRIVAL_MS;
  const vy = (b.dy - a.dy) / 0.01 / ARRIVAL_MS;
  // The convoy cruises up the road at about this speed (px/ms) underneath it all
  const cruise = 0.45;
  // Big panels turn less (a long trailer can only swing so far)
  const long = Math.min(1, 520 / Math.max(height, 1), 520 / Math.max(vw * 0.9, 1));
  const yaw = Math.max(-0.07, Math.min(0.07, Math.atan2(vx, cruise - vy) * long));
  return { dx: a.dx, dy: a.dy, yaw };
}

/** WAAPI keyframes for the card, sampled from the same path */
export function arrivalKeyframes(plan: RidePlan, vw: number, vh: number, height: number): Keyframe[] {
  const frames: Keyframe[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const p = arrivalPose(plan, u, vw, vh, height);
    frames.push({ offset: u, transform: `translate3d(${p.dx.toFixed(2)}px, ${p.dy.toFixed(2)}px, 0) rotate(${p.yaw.toFixed(4)}rad)` });
  }
  return frames;
}
