import { createContext, useContext } from "react";
import { motionValue, type MotionValue } from "framer-motion";

export interface IntroState {
  /** True once the intro has been watched to the end or skipped; stays true */
  done: boolean;
  /** A moment after `done`, once the hand-off animation has played: safe to start heavy 3D */
  settled: boolean;
  finish: () => void;
  /** Scroll progress through the intro, 0–1 */
  progress: MotionValue<number>;
}

export const IntroContext = createContext<IntroState>({
  done: true,
  settled: true,
  finish: () => undefined,
  progress: motionValue(1),
});

export const useIntro = () => useContext(IntroContext);
