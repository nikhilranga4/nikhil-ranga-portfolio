import { useRef, type ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Database, Monitor, Server } from "lucide-react";
import { brandMix } from "@/lib/brand";
import { NAME_LETTERS, NAME_WORDS, PHASES, easeInOut, easeOut, letterProgress, phase } from "./timeline";

/**
 * The same story without WebGL, for slow connections, data saver, reduced motion or devices
 * without 3D: CSS-extruded letters, an SVG pipeline drawn by scroll, and server/DB/desktop tiles.
 */

const extrude = (color: string) =>
  [1, 2, 3, 4, 5, 6].map((d) => `0 ${d}px 0 color-mix(in oklab, ${color}, black ${30 + d * 4}%)`).join(", ") +
  ", 0 14px 24px rgb(0 0 0 / 0.35)";

const LiteLetter = ({ char, index, progress }: { char: string; index: number; progress: MotionValue<number> }) => {
  const t = useTransform(progress, (p) => easeOut(letterProgress(p, index)));
  const opacity = useTransform(t, (v) => Math.min(1, v * 1.6));
  const y = useTransform(t, (v) => `${(1 - v) * 0.8}em`);
  const rotateX = useTransform(t, (v) => (1 - v) * -80);
  const scale = useTransform(t, (v) => 0.4 + v * 0.6);
  const color = brandMix(index / (NAME_LETTERS - 1));
  return (
    <motion.span
      className="inline-block"
      style={{ opacity, y, rotateX, scale, color, textShadow: extrude(color), transformPerspective: 600 }}
    >
      {char}
    </motion.span>
  );
};

/** A vertical pipe that draws itself, with packets running along it while data flows. */
const LitePipe = ({ grow, down, up, color }: {
  grow: MotionValue<number>;
  /** Opacity of packets flowing down (request / deploy) and up (response) */
  down: MotionValue<number>;
  up?: MotionValue<number>;
  color: string;
}) => (
  <div className="relative w-6 flex-1">
    <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
      <path d="M12 0 V100" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <motion.path
        d="M12 0 V100"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ pathLength: grow, filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
    {[
      { opacity: down, className: "animate-packet-down" },
      ...(up ? [{ opacity: up, className: "animate-packet-up" }] : []),
    ].map((set) => (
      <motion.div key={set.className} style={{ opacity: set.opacity }} className="absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_white] ${set.className}`}
            style={{ animationDelay: `${-i * 0.37}s` }}
          />
        ))}
      </motion.div>
    ))}
  </div>
);

const Tile = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="glass flex items-center justify-center rounded-2xl p-3 shadow-[0_20px_40px_-20px_hsl(var(--brand-1)/0.6)]">{children}</div>
    <span className="font-mono text-[0.62rem] uppercase tracking-widest text-muted-foreground">{label}</span>
  </div>
);

const IntroLite = ({ progress }: { progress: MotionValue<number> }) => {
  // The name starts large in the middle, then shrinks to the top as the "client"
  const toClient = useTransform(progress, (p) => easeInOut(phase(p, "request", 0, 0.5)));
  const nameY = useTransform(toClient, (k) => `${-k * 38}svh`);
  const nameScale = useTransform(toClient, (k) => 1 - k * 0.62);

  const network = useTransform(progress, (p) => phase(p, "request", 0.1, 0.4));
  const pipeAGrow = useTransform(progress, (p) => easeInOut(phase(p, "request", 0.2, 0.6)));
  const pipeAFlow = useTransform(progress, (p) => Math.min(phase(p, "request", 0.45, 0.65), 1 - phase(p, "deploy", 0.3, 0.7)));
  const responding = (p: number) => p >= PHASES.respond[0];
  const pipeADown = useTransform([pipeAFlow, progress], ([f, p]: number[]) => (responding(p) ? 0 : f));
  const pipeAUp = useTransform([pipeAFlow, progress], ([f, p]: number[]) => (responding(p) ? f : 0));
  const leds = useTransform(progress, (p) => (p >= PHASES.respond[0] + 0.02 ? "#2ee59d" : "#ffb020"));
  const ok = useTransform(progress, (p) => easeOut(phase(p, "respond", 0.25, 0.6)) * (1 - phase(p, "deploy", 0.5, 0.9)));
  const pipeBGrow = useTransform(progress, (p) => easeInOut(phase(p, "deploy", 0.05, 0.45)));
  const pipeBFlow = useTransform(progress, (p) => Math.min(phase(p, "deploy", 0.3, 0.45), 1 - phase(p, "enter", 0.15, 0.45)));
  const desktop = useTransform(progress, (p) => phase(p, "deploy", 0, 0.25));
  const boot = useTransform(progress, (p) => phase(p, "deploy", 0.45, 0.92));
  const bootWidth = useTransform(boot, (b) => `${b * 100}%`);
  const siteOpacity = useTransform(boot, (b) => (b >= 1 ? 1 : 0));
  // Enter: the monitor grows to fill the screen while everything else fades
  const enter = useTransform(progress, (p) => easeInOut(phase(p, "enter", 0, 0.9)));
  const others = useTransform(enter, (k) => 1 - Math.min(1, k * 2.5));
  const networkOpacity = useTransform([network, others], ([n, o]: number[]) => n * o);
  // The monitor grows until it fits the viewport and moves to its centre
  const monitorRef = useRef<HTMLDivElement>(null);
  const fit = useRef<{ scale: number; dy: number } | null>(null);
  const measure = () => {
    const el = monitorRef.current;
    if (!el) return { scale: 1, dy: 0 };
    if (!fit.current) {
      const r = el.getBoundingClientRect();
      const scale = Math.min(window.innerWidth / r.width, window.innerHeight / r.height) * 0.96;
      fit.current = { scale, dy: window.innerHeight / 2 - (r.top + r.height / 2) };
    }
    return fit.current;
  };
  const monitorScale = useTransform(enter, (k) => {
    if (k === 0) fit.current = null;
    return 1 + k * (measure().scale - 1);
  });
  const monitorY = useTransform(enter, (k) => k * measure().dy);

  let index = 0;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div style={{ opacity: others }} className="absolute inset-0 flex items-center justify-center">
        <motion.h2
          aria-hidden
          style={{ y: nameY, scale: nameScale }}
          className="w-full text-center font-display text-[clamp(3.2rem,13vw,9rem)] font-bold leading-[1.05] tracking-tight"
        >
          {NAME_WORDS.map((word) => (
            <span key={word} className="mx-[0.12em] inline-block whitespace-nowrap">
              {word.split("").map((c) => {
                const i = index++;
                return <LiteLetter key={i} char={c} index={i} progress={progress} />;
              })}
            </span>
          ))}
        </motion.h2>
      </motion.div>

      {/* Network: pipe → server + database → pipe → desktop */}
      <div className="absolute inset-x-0 bottom-[6svh] top-[24svh] flex flex-col items-center">
        <motion.div style={{ opacity: networkOpacity }} className="flex w-full flex-1 flex-col items-center">
          <LitePipe grow={pipeAGrow} down={pipeADown} up={pipeAUp} color="hsl(var(--brand-1))" />
          <motion.div style={{ opacity: network, scale: network }} className="relative flex items-end gap-4 py-2">
            <Tile label="api server">
              <div className="flex flex-col items-center gap-1.5">
                <Server className="h-8 w-8" />
                <span className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: leds }} />
                  ))}
                </span>
              </div>
            </Tile>
            <Tile label="database">
              <Database className="h-8 w-8 text-brand-3" />
            </Tile>
            <motion.span
              style={{ opacity: ok, scale: ok }}
              className="absolute -right-24 top-2 rounded-full bg-[#2ee59d] px-3 py-1 font-mono text-xs font-bold text-[#04130c] shadow-[0_0_24px_#2ee59d]"
            >
              200 OK
            </motion.span>
          </motion.div>
          <LitePipe grow={pipeBGrow} down={pipeBFlow} color="hsl(var(--brand-2))" />
        </motion.div>

        <motion.div style={{ opacity: desktop, scale: monitorScale, y: monitorY }} className="relative flex flex-col items-center">
          <div
            ref={monitorRef}
            className="relative h-[clamp(7rem,22svh,10rem)] w-[clamp(11rem,34svh,16rem)] overflow-hidden rounded-xl border-4 border-foreground/80 bg-[#070b14] shadow-[0_30px_60px_-20px_hsl(var(--brand-1)/0.6)]">
            <div className="absolute inset-x-4 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="bg-candy h-full rounded-full" style={{ width: bootWidth }} />
            </div>
            <motion.div style={{ opacity: siteOpacity }} className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background">
              <span className="font-display text-xl font-bold leading-none">
                Nikhil <span className="text-gradient">Ranga</span>
              </span>
              <span className="h-1 w-20 rounded-full bg-foreground/20" />
              <span className="bg-candy mt-1 h-3 w-12 rounded-full" />
            </motion.div>
          </div>
          <Monitor aria-hidden className="mt-1 h-5 w-5 text-muted-foreground" />
        </motion.div>
      </div>
    </div>
  );
};

export default IntroLite;
