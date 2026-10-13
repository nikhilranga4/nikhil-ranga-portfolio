import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getAnalyser, toggleMusic, useMusic } from "@/lib/music";
import { cn } from "@/lib/utils";

const BARS = 4;
const REST = [0.35, 0.6, 0.45, 0.3];
/** [frequency bin, gain] per bar: bass, low-mids, presence, highs */
const BANDS = [
  [1, 0.72],
  [3, 0.8],
  [9, 1.45],
  [24, 3.4],
] as const;

/**
 * Background music on/off. The equaliser bars dance to the actual music while it plays; muted
 * shows a slash. While music is on but waiting for the first interaction, a soft ring pulses.
 */
const SoundToggle = ({ className }: { className?: string }) => {
  const { enabled, playing } = useMusic();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const setHeights = (values: number[]) =>
      bars.current.forEach((bar, i) => bar && (bar.style.transform = `scaleY(${values[i]})`));
    if (!playing) {
      setHeights(REST.map((v) => v * 0.6));
      return;
    }
    let raf = 0;
    let data: Uint8Array | null = null;
    const loop = () => {
      const analyser = getAnalyser();
      if (analyser) {
        data ??= new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        // Four bands from bass to highs (bins are ~190 Hz wide), evened out so every bar moves
        setHeights(BANDS.map(([bin, gain], i) => Math.max(REST[i] * 0.5, Math.min(1, Math.pow(data![bin] / 255, 2.2) * gain))));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const waiting = enabled && !playing;

  return (
    <motion.button
      type="button"
      data-sound-toggle
      onClick={toggleMusic}
      whileTap={{ scale: 0.88 }}
      aria-pressed={playing}
      aria-label={playing ? "Mute music" : "Play music"}
      title={playing ? "Mute music" : waiting ? "Music starts when you interact — or tap to play" : "Play music"}
      className={cn(
        "group relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/70 text-foreground transition-colors hover:border-brand-1/60",
        className
      )}
    >
      {waiting && <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-brand-1/70" />}
      <span aria-hidden className="relative flex h-4 items-end gap-[3px]">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => (bars.current[i] = el)}
            className={cn(
              "block h-full w-[3px] origin-bottom rounded-full transition-[background-color,opacity] duration-300",
              playing ? "bg-candy" : "bg-foreground/50"
            )}
            style={{ transform: `scaleY(${REST[i] * 0.6})` }}
          />
        ))}
      </span>
      {/* Muted: a slash across the bars */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ rotate: -45, scaleX: enabled ? 0 : 1, opacity: enabled ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="absolute h-[2px] w-6 rounded-full bg-brand-2"
      />
    </motion.button>
  );
};

export default SoundToggle;
