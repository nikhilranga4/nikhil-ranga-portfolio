import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import { brandMix } from "@/lib/brand";
import { playSfx, setIntroActive, soundEnabled, unlockAudio } from "@/lib/music";
import { enterThunk, keyClick } from "@/lib/music/sfx";

const ROWS = ["NIKHIL", "RANGA"];
const KEY_COUNT = ROWS.join("").length;

/** Timeline in ms (scaled down for reduced motion). */
const T = {
  /** With sound on, the keyboard waits here for a key press / tap (browsers need one before audio) */
  waitAt: 1150,
  typeStart: 1200,
  /** Mount the site underneath, after the last key and before Enter pops in */
  mount: 3950,
  enterIn: 4100,
  enterPress: 4700,
  done: 5300,
};

/** Gap before each key press: an uneven, human rhythm with a breath between the two words. */
const GAPS = [0, 230, 250, 220, 260, 240, 420, 230, 250, 220, 240];
/** When each key gets pressed, in ms from the start. */
const KEY_TIMES = GAPS.reduce<number[]>((times, gap, i) => [...times, (i ? times[i - 1] : T.typeStart) + gap], []);
/** How long a typed key stays pushed down. */
const PRESS_MS = 170;
/** If nobody presses a key, carry on silently after this long. */
const WAIT_MS = 4000;
/** Pause between the key press and the first typed key */
const RESUME_DELAY = 220;
/** Stereo position of each key, left to right across the keyboard */
const KEY_PAN = ROWS.flatMap((row) => row.split("").map((_, i) => (i / (row.length - 1) - 0.5) * 0.8));

const CAPTIONS = [
  { until: 30, text: "warming up the keyboard" },
  { until: 62, text: "typing the good stuff" },
  { until: 90, text: "compiling pixels & 3D" },
  { until: 101, text: "press enter" },
];

/** Colour for the i-th lit key, walking along the theme's brand colours. */
const litColor = (i: number) => brandMix(i / (KEY_COUNT - 1));

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface KeyProps {
  char: string;
  index: number;
  lit: boolean;
  pressed: boolean;
}

/** One keycap: drops onto the deck, lights up when "typed", then launches upward on exit. */
const Key = memo(({ char, index, lit, pressed }: KeyProps) => {
  const fly = useMemo(() => ({ rotate: rand(-70, 70), x: `${rand(-30, 30)}vw` }), []);
  return (
    <motion.div
      initial={{ y: "-70vh", rotate: rand(-40, 40), opacity: 0 }}
      animate={{ y: 0, rotate: 0, opacity: 1 }}
      exit={{
        y: "-115vh",
        x: fly.x,
        rotate: fly.rotate,
        transition: { duration: 0.75, ease: [0.6, 0, 0.84, 0.2], delay: index * 0.025 },
      }}
      transition={{ type: "spring", stiffness: 240, damping: 19, delay: 0.25 + index * 0.07 }}
      className="relative"
    >
      <div
        data-pressed={pressed}
        className="keycap flex h-[var(--k)] w-[var(--k)] items-center justify-center font-display text-[calc(var(--k)*0.46)] font-bold leading-none"
        style={
          {
            ...(lit ? { "--key-face": litColor(index) } : null),
            color: lit ? "hsl(var(--on-grad))" : "hsl(var(--foreground) / 0.55)",
            filter: lit ? `drop-shadow(0 0 14px color-mix(in oklab, ${litColor(index)} 55%, transparent))` : undefined,
          } as CSSProperties
        }
      >
        <span className="relative -translate-y-[6%]">{char}</span>
      </div>
      {/* Ring that pops when the key lights up */}
      {lit && (
        <motion.span
          aria-hidden
          initial={{ scale: 0.9, opacity: 0.9 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-[0.95rem] border-2"
          style={{ borderColor: litColor(index) }}
        />
      )}
    </motion.div>
  );
});
Key.displayName = "Key";

/**
 * Intro: a little mechanical keyboard drops in, types out the name key by key (each key lights
 * up in the theme colours), hits Enter, and the keys launch upward as the screen wipes away in
 * colourful columns, handing over to the hero where 3D keycaps fall into place.
 */
interface LoaderProps {
  /** Called once the name is typed: time to mount the site underneath while the loader still covers it. */
  onReady: () => void;
  /** Called when the intro has finished playing. */
  onDone: () => void;
}

const Loader = ({ onReady, onDone }: LoaderProps) => {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const speed = reduceMotion ? 0.45 : 1;
  const [waiting, setWaiting] = useState(false);
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const callbacks = useRef({ onReady, onDone });
  callbacks.current = { onReady, onDone };

  useEffect(() => {
    setIntroActive(true);
    let raf = 0;
    let ready = false;
    let typedSoFar = 0;
    let entered = false;
    const start = performance.now();
    // With sound on, the clock holds at T.waitAt until the first key press / tap (or WAIT_MS)
    const gate = { waiting: soundEnabled(), offset: 0 };
    const raw = (now: number) => (now - start) / speed;
    const release = () => {
      if (!gate.waiting) return;
      gate.waiting = false;
      // Resume a beat later so the audio is unlocked before the first key sounds
      if (raw(performance.now()) >= T.waitAt) gate.offset = raw(performance.now()) - T.waitAt + RESUME_DELAY;
    };
    const onGesture = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === "Escape" || e.metaKey || e.ctrlKey)) return;
      unlockAudio();
      release();
    };
    const gestures = ["keydown", "pointerdown", "touchend"] as const;
    gestures.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }));

    const tick = (now: number) => {
      let t = raw(now) - gate.offset;
      if (gate.waiting && t >= T.waitAt) {
        if (t - T.waitAt > WAIT_MS) release();
        t = T.waitAt;
      }
      setElapsed(t);
      setWaiting(gate.waiting && t >= T.waitAt);

      // Sounds: a click for every key as it's typed, a thunk for Enter
      const typedNow = KEY_TIMES.filter((time) => t >= time).length;
      for (; typedSoFar < typedNow; typedSoFar++) {
        const i = typedSoFar;
        playSfx((ctx, out, at) => keyClick(ctx, out, at, i, KEY_PAN[i]));
      }
      if (!entered && t >= T.enterPress) {
        entered = true;
        playSfx(enterThunk);
      }

      if (!ready && t >= T.mount) {
        ready = true;
        callbacks.current.onReady();
      }
      if (t < T.done) raf = requestAnimationFrame(tick);
      else callbacks.current.onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      gestures.forEach((g) => window.removeEventListener(g, onGesture, { capture: true }));
    };
  }, [speed]);

  const typed = KEY_TIMES.filter((time) => elapsed >= time).length;
  const pressingIndex = typed - 1;
  const pressing = pressingIndex >= 0 && elapsed - KEY_TIMES[pressingIndex] < PRESS_MS;
  const enterVisible = elapsed >= T.enterIn;
  const enterPressed = elapsed >= T.enterPress;
  // A little progress while the keys land, the rest while typing
  const typing = Math.min(1, Math.max(0, (elapsed - T.waitAt) / (T.enterPress - T.waitAt)));
  const progress = Math.round(Math.min(1, elapsed / T.waitAt) * 8 + (1 - Math.pow(1 - typing, 2)) * 92);
  const caption = waiting
    ? touch
      ? "tap anywhere to boot"
      : "press any key to boot"
    : enterPressed
      ? "let's go!"
      : (CAPTIONS.find((c) => progress < c.until)?.text ?? "");

  const wipe = { duration: 0.6, ease: [0.76, 0, 0.24, 1] } as const;
  let keyIndex = 0;

  return (
    <motion.div
      key="loader"
      role="status"
      aria-label="Loading portfolio"
      className="fixed inset-0 z-[90] overflow-hidden"
      exit={{ pointerEvents: "none" }}
    >
      {/* Columns that wipe upward to reveal the site: colour first, then background on top */}
      <div aria-hidden className="absolute inset-0 flex">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="relative h-full flex-1">
            <motion.div
              exit={{ y: "-100%", transition: { ...wipe, delay: 0.42 + i * 0.06 } }}
              className="bg-candy absolute inset-0 -mx-px"
              style={{ backgroundSize: "500% 100%", backgroundPosition: `${i * 25}% 0` }}
            />
            <motion.div
              exit={{ y: "-100%", transition: { ...wipe, delay: 0.3 + i * 0.06 } }}
              className="absolute inset-0 -mx-px bg-background"
            />
          </div>
        ))}
      </div>

      <motion.div
        exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.25 } }}
        className="absolute inset-0 flex flex-col items-center justify-center px-4"
        style={{ "--k": "min(4.6rem, calc((100vw - 2rem) / 8.2))" } as CSSProperties}
      >
        {/* Backdrop glow and grid */}
        <div aria-hidden className="grid-bg absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-1/20 blur-3xl" />

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.1 }}
          className="chip relative mb-8 text-muted-foreground"
        >
          <span className="text-brand-1">~/</span>nikhil-ranga
          <span className="text-foreground/40">·</span>
          booting
        </motion.p>

        {/* Keyboard deck, tilted back a little for depth */}
        <div className="relative [perspective:900px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotateX: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 18 }}
            exit={{ opacity: 0, y: 60, rotateX: 40, transition: { duration: 0.45, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            className="glass relative flex flex-col items-center gap-[calc(var(--k)*0.2)] rounded-[calc(var(--k)*0.42)] p-[calc(var(--k)*0.26)] pb-[calc(var(--k)*0.34)] shadow-[0_40px_90px_-30px_hsl(var(--brand-2)/0.55)]"
          >
            {ROWS.map((row, r) => (
              <div key={row} className="flex gap-[calc(var(--k)*0.18)]">
                {row.split("").map((char) => {
                  const i = keyIndex++;
                  return <Key key={i} char={char} index={i} lit={i < typed} pressed={pressing && i === pressingIndex} />;
                })}
                {r === ROWS.length - 1 && (
                  <motion.div
                    initial={false}
                    animate={enterVisible ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
                    exit={{
                      y: "-115vh",
                      rotate: 25,
                      transition: { duration: 0.75, ease: [0.6, 0, 0.84, 0.2], delay: KEY_COUNT * 0.025 },
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 18 }}
                    className="relative"
                  >
                    <div
                      data-pressed={enterPressed && elapsed < T.enterPress + 160}
                      className="keycap flex h-[var(--k)] w-[calc(var(--k)*1.6)] items-center justify-center gap-1.5 font-mono text-[calc(var(--k)*0.2)] font-bold uppercase"
                      style={
                        {
                          "--key-face": enterPressed ? "hsl(var(--foreground))" : undefined,
                          color: enterPressed ? "hsl(var(--background))" : "hsl(var(--brand-1))",
                        } as CSSProperties
                      }
                    >
                      <CornerDownLeft className="h-[calc(var(--k)*0.32)] w-[calc(var(--k)*0.32)]" strokeWidth={2.5} />
                      <span className="hidden sm:inline">enter</span>
                    </div>
                    {enterVisible && !enterPressed && (
                      <span className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-[0.95rem] border-2 border-brand-1" />
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Readout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.4 }}
          className="relative mt-12 w-[min(22rem,100%)] font-mono text-xs"
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className={waiting ? "font-semibold text-brand-1" : "text-muted-foreground"}>
              {caption}
              {!enterPressed && <span className="ml-0.5 inline-block animate-blink text-brand-1">▍</span>}
            </span>
            {waiting ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: [1, 1.08, 1] }}
                transition={{ scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}
                className="flex items-center gap-1 rounded-md border border-brand-1/50 bg-brand-1/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-1"
              >
                {touch ? "tap" : "any key"}
                <span aria-hidden>🔊</span>
              </motion.span>
            ) : (
              <span className="font-bold tabular-nums text-foreground">{progress}%</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-candy h-full rounded-full transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Loader;
