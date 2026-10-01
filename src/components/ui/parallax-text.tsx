import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ParallaxTextProps {
  text: string;
  className?: string;
  /** 1 slides right while scrolling down, -1 slides left */
  direction?: 1 | -1;
}

/**
 * Giant outlined word that drifts sideways with scroll and skews with scroll velocity.
 * Purely decorative — sits behind section headings.
 */
export function ParallaxText({ text, className, direction = 1 }: ParallaxTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress, scrollY } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [`${-18 * direction}%`, `${18 * direction}%`]);
  const velocity = useVelocity(scrollY);
  const skewX = useSpring(useTransform(velocity, [-2500, 2500], [12, -12], { clamp: true }), {
    stiffness: 200,
    damping: 30,
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 -z-10 flex w-screen -translate-x-1/2 select-none justify-center overflow-hidden",
        className
      )}
    >
      <motion.span
        style={{ x, skewX, WebkitTextStroke: "1.5px hsl(var(--brand-2) / 0.22)" }}
        className="whitespace-nowrap font-display text-[18vw] font-extrabold uppercase leading-none text-transparent opacity-70 sm:opacity-100 md:text-[15vw]"
      >
        {text}
      </motion.span>
    </div>
  );
}

export default ParallaxText;
