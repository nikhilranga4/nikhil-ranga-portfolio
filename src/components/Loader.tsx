import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setIntroActive, unlockAudio, useMusic } from "@/lib/music";

/** Shortest time the boot screen stays up, so it never flashes */
const MIN_MS = 900;

const CAPTIONS = [
  { until: 35, text: "booting the world" },
  { until: 70, text: "wiring the neon" },
  { until: 99, text: "compiling shaders" },
  { until: 101, text: "ready" },
];

interface LoaderProps {
  /** The 3D world has compiled and drawn: the intro can start */
  ready: boolean;
  /** Called once the boot screen has finished and should lift */
  onDone: () => void;
}

/**
 * Boot screen shown while the 3D world downloads and compiles. It is dark like the scene, so when
 * it fades the keyboard intro is already sitting there in the dark.
 */
const Loader = ({ ready, onDone }: LoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const { enabled: soundOn, unlocked } = useMusic();
  const done = useRef(onDone);
  done.current = onDone;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    // Music waits for the intro to finish; sound effects play during it
    setIntroActive(true);
    unlockAudio();
    const start = performance.now();
    let raf = 0;
    let finishedAt = 0;
    let value = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      // Creep toward 90% while loading, then run to 100% once the world is ready
      const target = readyRef.current && elapsed > MIN_MS ? 100 : 90 * (1 - Math.exp(-elapsed / 1400));
      value += (target - value) * (readyRef.current ? 0.18 : 0.08);
      if (target === 100 && value > 99.5) value = 100;
      setProgress(Math.round(value));
      if (value === 100 && !finishedAt) finishedAt = now;
      if (finishedAt && now - finishedAt > 250) {
        done.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const caption = CAPTIONS.find((c) => progress < c.until)?.text ?? "";
  // The browser is holding sound back until the visitor interacts: offer it, without waiting
  const soundHint = soundOn && !unlocked;

  return (
    <motion.div
      key="loader"
      role="status"
      aria-label="Loading portfolio"
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-[#020809] px-6 text-[#e8f4f2]"
      exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } }}
    >
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#19e3d4]/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16, transition: { duration: 0.35 } }}
        transition={{ duration: 0.5 }}
        className="relative w-[min(20rem,100%)] font-mono text-xs"
      >
        <p className="mb-6 text-center text-[0.72rem] tracking-wide text-[#e8f4f2]/60">
          <span className="text-[#19e3d4]">~/</span>nikhil-ranga <span className="text-[#e8f4f2]/30">·</span> booting
        </p>
        <div className="mb-2 flex items-center justify-between gap-4">
          <span className="text-[#e8f4f2]/60">
            {caption}
            {progress < 100 && <span className="ml-0.5 inline-block animate-blink text-[#19e3d4]">▍</span>}
          </span>
          <span className="font-bold tabular-nums">{progress}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#19e3d4] via-[#7cf5c8] to-[#ff7a5c] shadow-[0_0_12px_#19e3d4]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>

      {/* Sound hint: only while the browser is holding audio back; never blocks the intro */}
      <AnimatePresence>
        {soundHint && (
          <motion.button
            type="button"
            onClick={() => unlockAudio()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            transition={{ delay: 0.6 }}
            className="relative mt-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.7rem] text-[#19e3d4]"
          >
            <span aria-hidden>🔊 </span>
            {touch ? "tap anywhere for sound" : "click or press any key for sound"}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Loader;
