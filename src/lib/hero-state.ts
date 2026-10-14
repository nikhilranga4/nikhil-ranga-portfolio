import { useSyncExternalStore } from "react";
import { motionValue } from "framer-motion";

/** Scroll progress through the pinned hero (0–1). Written by the hero, read by the 3D world. */
export const heroProgress = motionValue(0);

/**
 * A falling section hitting the ground: the 3D world gives the camera a short jolt. `wake` is set
 * by the world so it draws the frames for it (it only renders on demand).
 */
export const worldImpact = { at: -Infinity, strength: 0, wake: () => undefined as void };
export function bumpWorld(strength = 1) {
  worldImpact.at = performance.now();
  worldImpact.strength = strength;
  worldImpact.wake();
}

/**
 * Shared state of the hero's 3D intro, read outside the hero (the page shell locks scrolling
 * until the intro has played; the navbar waits for the room).
 *
 * - `introStage`: "waiting" (boot screen up) → "typing" (keyboard) → "named" → "done"
 * - `heroReady`: the door has opened and the room's copy is showing
 */
export type IntroStage = "waiting" | "typing" | "named" | "done";

let state = { introStage: "waiting" as IntroStage, heroReady: false };
const listeners = new Set<() => void>();

const update = (patch: Partial<typeof state>) => {
  const next = { ...state, ...patch };
  if (next.introStage === state.introStage && next.heroReady === state.heroReady) return;
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setHeroReady = (heroReady: boolean) => update({ heroReady });
export const setIntroStage = (introStage: IntroStage) => update({ introStage });

export const useHeroReady = () => useSyncExternalStore(subscribe, () => state.heroReady);
export const useIntroStage = () => useSyncExternalStore(subscribe, () => state.introStage);
