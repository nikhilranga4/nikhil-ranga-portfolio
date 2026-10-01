import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ScrollReveal3DProps {
  children: ReactNode;
  className?: string;
  /** Swing in from the left (-1), right (1) or straight up (0) */
  direction?: -1 | 0 | 1;
  /** Starting tilt in degrees */
  tilt?: number;
}

/**
 * Scroll-scrubbed 3D entrance: the element tilts up from the floor, rises and fades in as it
 * travels from the bottom of the viewport to its centre — and reverses when scrolling back.
 */
export function ScrollReveal3D({ children, className, direction = 0, tilt = 35 }: ScrollReveal3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Phones get a calmer, straight-up rise so cards never look crooked mid-scroll
  const isMobile = useIsMobile();
  const side = isMobile ? 0 : direction;
  const angle = isMobile ? Math.min(tilt, 14) : tilt;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", isMobile ? "start 70%" : "center 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });

  const rotateX = useTransform(progress, [0, 1], [angle, 0]);
  const rotateY = useTransform(progress, [0, 1], [side * -25, 0]);
  const x = useTransform(progress, [0, 1], [side * 80, 0]);
  const y = useTransform(progress, [0, 1], [isMobile ? 40 : 90, 0]);
  const scale = useTransform(progress, [0, 1], [isMobile ? 0.95 : 0.86, 1]);
  const opacity = useTransform(progress, [0, 0.55], [0, 1]);

  return (
    <div ref={ref} className={cn("perspective", className)}>
      <motion.div
        style={reduceMotion ? undefined : { rotateX, rotateY, x, y, scale, opacity }}
        className="h-full origin-bottom will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default ScrollReveal3D;
