import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const FACES = [
  { label: "</>", transform: "translateZ(40px)" },
  { label: "{ }", transform: "rotateY(180deg) translateZ(40px)" },
  { label: "AI", transform: "rotateY(90deg) translateZ(40px)" },
  { label: "JS", transform: "rotateY(-90deg) translateZ(40px)" },
  { label: "NR", transform: "rotateX(90deg) translateZ(40px)" },
  { label: "✦", transform: "rotateX(-90deg) translateZ(40px)" },
];

const DURATION_MS = 1200;

const Loader = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      // ease-out so it feels snappy
      setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <motion.div
      key="loader"
      exit={{ opacity: 0, scale: 1.6, filter: "blur(14px)" }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-10 bg-background"
    >
      <div className="perspective-near">
        <div className="relative h-20 w-20 animate-spin-cube preserve-3d">
          {FACES.map((face) => (
            <div
              key={face.label}
              style={{ transform: face.transform }}
              className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/20 bg-candy font-mono text-lg font-bold text-white shadow-glow-2 backface-hidden"
            >
              {face.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-gradient font-display text-5xl font-extrabold tabular-nums">{progress}%</p>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="bg-candy h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="font-mono text-xs text-muted-foreground">compiling awesomeness…</p>
      </div>
    </motion.div>
  );
};

export default Loader;
