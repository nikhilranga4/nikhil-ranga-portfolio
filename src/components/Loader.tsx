import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import { brandMix } from "@/lib/brand";

const ROWS = ["NIKHIL", "RANGA"];
const KEY_COUNT = ROWS.join("").length;

/** Timeline in ms (scaled down for reduced motion). */
const T = {
  typeStart: 1000,
  typeGap: 115,
  enterIn: 2350,
  enterPress: 2620,
  done: 2950,
};

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
const Key = ({ char, index, lit, pressed }: KeyProps) => {
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
      transition={{ type: "spring", stiffness: 260, damping: 17, delay: 0.25 + index * 0.05 }}
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
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-[0.95rem] border-2"
          style={{ borderColor: litColor(index) }}
        />
      )}
    </motion.div>
  );
};

/**
 * Intro: a little mechanical keyboard drops in, types out the name key by key (each key lights
 * up in the theme colours), hits Enter, and the keys launch upward as the screen wipes away in
 * colourful columns, handing over to the hero where 3D keycaps fall into place.
 */
const Loader = ({ onDone }: { onDone: () => void }) => {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const speed = reduceMotion ? 0.45 : 1;

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / speed;
      setElapsed(t);
      if (t < T.done) raf = requestAnimationFrame(tick);
      else timer = window.setTimeout(onDone, 60);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [onDone, speed]);

  const typed = Math.max(0, Math.min(KEY_COUNT, Math.floor((elapsed - T.typeStart) / T.typeGap) + 1));
  const pressingIndex = typed - 1;
  const pressing = pressingIndex >= 0 && elapsed - (T.typeStart + pressingIndex * T.typeGap) < 95;
  const enterVisible = elapsed >= T.enterIn;
  const enterPressed = elapsed >= T.enterPress;
  const raw = Math.min(1, elapsed / T.enterPress);
  const progress = Math.round((1 - Math.pow(1 - raw, 2)) * 100);
  const caption = enterPressed ? "let's go!" : CAPTIONS.find((c) => progress < c.until)?.text ?? "";

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
            <span className="text-muted-foreground">
              {caption}
              {!enterPressed && <span className="ml-0.5 inline-block animate-blink text-brand-1">▍</span>}
            </span>
            <span className="font-bold tabular-nums text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-candy h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Loader;
