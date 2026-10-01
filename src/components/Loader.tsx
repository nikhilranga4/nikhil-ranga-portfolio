import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const DURATION_MS = 2300;

/** Boot log lines and the progress (0–100) at which each one appears. */
const BOOT_LOG = [
  { at: 0, text: "$ npm run portfolio", kind: "cmd" },
  { at: 14, text: "✓ installing creativity@latest", kind: "ok" },
  { at: 34, text: "✓ compiling React components", kind: "ok" },
  { at: 54, text: "✓ loading 3D scene & shaders", kind: "ok" },
  { at: 74, text: "✓ applying theme tokens", kind: "ok" },
  { at: 92, text: "➜ ready on nikhil.dev", kind: "ready" },
] as const;

const RAIN_GLYPHS = "01{}<>/=;()[]#$&*+</>=>const let fn".split("");
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

/** A column of faint code characters falling down the background. */
const RainColumn = ({ left, delay, duration }: { left: string; delay: number; duration: number }) => {
  const chars = useMemo(
    () => Array.from({ length: 18 }, () => RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)]),
    []
  );
  return (
    <motion.div
      aria-hidden
      initial={{ y: "-60%" }}
      animate={{ y: "110%" }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
      className="absolute top-0 flex flex-col font-mono text-xs leading-5 text-brand-3/30 [mask-image:linear-gradient(to_bottom,transparent,black_40%,black_80%,transparent)]"
      style={{ left }}
    >
      {chars.map((c, i) => (
        <span key={i} className={i === chars.length - 1 ? "text-brand-3/80" : undefined}>
          {c}
        </span>
      ))}
    </motion.div>
  );
};

const Loader = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      // Ease in-out so it starts quick, "works" in the middle, then lands
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else timer = window.setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [onDone]);

  const columns = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i / 14) * 100 + Math.random() * 4}%`,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 3,
      })),
    []
  );

  const visibleLog = BOOT_LOG.filter((line) => progress >= line.at);
  const filled = Math.round(progress / 5);
  const curtain = { duration: 0.75, ease: [0.76, 0, 0.24, 1] } as const;

  return (
    <motion.div key="loader" className="fixed inset-0 z-[90] overflow-hidden" exit={{ pointerEvents: "none" }}>
      {/* Curtain halves — they split apart to reveal the site */}
      <motion.div exit={{ y: "-100%" }} transition={curtain} className="absolute inset-x-0 top-0 h-1/2 bg-background" />
      <motion.div exit={{ y: "100%" }} transition={curtain} className="absolute inset-x-0 bottom-0 h-1/2 bg-background" />

      <motion.div
        exit={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6"
      >
        {/* Backdrop: grid, glow and code rain */}
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-1/20 blur-3xl" />
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          {columns.map((c, i) => (
            <RainColumn key={i} {...c} />
          ))}
        </div>

        {/* Logo: </> brackets snap around the monogram inside a progress ring */}
        <div className="relative flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
            <defs>
              <linearGradient id="loader-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--brand-1))" />
                <stop offset="50%" stopColor="hsl(var(--brand-2))" />
                <stop offset="100%" stopColor="hsl(var(--brand-3))" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <circle
              cx="64"
              cy="64"
              r={RING_R}
              fill="none"
              stroke="url(#loader-ring)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress / 100)}
            />
            {/* dashed outer orbit */}
            <circle
              cx="64"
              cy="64"
              r="62"
              fill="none"
              stroke="hsl(var(--brand-2) / 0.35)"
              strokeWidth="1"
              strokeDasharray="2 6"
              className="origin-center animate-spin-slow"
            />
          </svg>
          {/* orbiting spark at the head of the ring */}
          <div className="absolute inset-0" style={{ transform: `rotate(${(progress / 100) * 360}deg)` }}>
            <span className="absolute left-1/2 top-[7px] h-3 w-3 -translate-x-1/2 rounded-full bg-brand-3 shadow-[0_0_14px_hsl(var(--brand-3))]" />
          </div>

          <div className="relative flex items-center font-mono text-3xl font-bold">
            <motion.span
              initial={{ x: -26, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
              className="text-brand-2"
            >
              &lt;
            </motion.span>
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.35 }}
              className="text-gradient mx-1 font-display text-4xl font-extrabold"
            >
              NR
            </motion.span>
            <motion.span
              initial={{ x: 26, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
              className="text-brand-3"
            >
              /&gt;
            </motion.span>
          </div>
        </div>

        {/* Terminal boot log */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.2 }}
          className="glass relative w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_hsl(var(--brand-2)/0.6)]"
        >
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 font-mono text-[0.68rem] text-muted-foreground">~/nikhil-ranga — zsh</span>
          </div>
          <div className="h-[9.5rem] space-y-1 px-4 py-3 font-mono text-[0.78rem] leading-relaxed">
            {visibleLog.map((line) => (
              <motion.p
                key={line.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  line.kind === "cmd"
                    ? "text-foreground"
                    : line.kind === "ready"
                      ? "font-semibold text-brand-3"
                      : "text-brand-4"
                }
              >
                {line.text}
              </motion.p>
            ))}
            <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-brand-1" />
          </div>
          <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5 font-mono text-[0.72rem]">
            <span className="flex flex-1 gap-[3px]" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className={`h-2.5 flex-1 rounded-[2px] transition-colors duration-150 ${
                    i < filled ? "bg-gradient-to-t from-brand-2 to-brand-3 shadow-[0_0_6px_hsl(var(--brand-3)/0.6)]" : "bg-muted"
                  }`}
                />
              ))}
            </span>
            <span className="w-10 text-right font-bold tabular-nums text-foreground">{progress}%</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Loader;
