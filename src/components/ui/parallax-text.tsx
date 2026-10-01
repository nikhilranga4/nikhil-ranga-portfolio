import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParallaxTextProps {
  text: string;
  className?: string;
  /** 1 slides right while scrolling down, -1 slides left */
  direction?: 1 | -1;
}

const MEASURE_PX = 100;
const MAX_PX = 220;
/** Share of the viewport width the word may fill */
const FILL = 0.92;

/**
 * Giant background word behind a section heading. It sizes itself so the whole word fits the
 * screen in every theme font, uses a soft gradient fill plus a crisp outline so it stays legible,
 * and drifts gently sideways (and skews a little) with scroll.
 */
export function ParallaxText({ text, className, direction = 1 }: ParallaxTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  const { scrollYProgress, scrollY } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [`${-5 * direction}%`, `${5 * direction}%`]);
  const velocity = useVelocity(scrollY);
  const skewX = useSpring(useTransform(velocity, [-2500, 2500], [8, -8], { clamp: true }), {
    stiffness: 200,
    damping: 30,
  });

  // Fit the word to the viewport; re-fit on resize, when fonts load and when the theme (font) changes
  useEffect(() => {
    const fit = () => {
      const probe = measureRef.current;
      if (!probe) return;
      const width = probe.offsetWidth;
      if (!width) return;
      setFontSize(Math.min(MAX_PX, (window.innerWidth * FILL * MEASURE_PX) / width));
    };
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.addEventListener("loadingdone", fit);
    document.fonts?.ready.then(fit).catch(() => undefined);
    const observer = new MutationObserver(() => requestAnimationFrame(fit));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
    return () => {
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
      observer.disconnect();
    };
  }, [text]);

  const word = "whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-tight";

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 -z-10 flex w-screen -translate-x-1/2 select-none justify-center overflow-hidden",
        className
      )}
    >
      {/* Invisible copy at a fixed size, used only to measure the word in the current font */}
      <span
        ref={measureRef}
        className={cn(word, "invisible absolute left-0 top-0")}
        style={{ fontSize: MEASURE_PX }}
      >
        {text}
      </span>

      <motion.span
        style={{ x, skewX, fontSize: fontSize ?? "14vw" }}
        className="relative grid place-items-center"
      >
        {/* Soft gradient fill */}
        <span
          className={cn(word, "col-start-1 row-start-1 bg-clip-text text-transparent opacity-[0.1] dark:opacity-[0.14]")}
          style={{ backgroundImage: "var(--grad-text)" }}
        >
          {text}
        </span>
        {/* Crisp outline on top */}
        <span
          className={cn(word, "col-start-1 row-start-1 text-transparent")}
          style={{ WebkitTextStroke: "1.5px hsl(var(--brand-1) / 0.45)" }}
        >
          {text}
        </span>
      </motion.span>
    </div>
  );
}

export default ParallaxText;
