import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

interface BentoTileProps {
  children: ReactNode;
  /** Grid placement classes (col/row spans) */
  className?: string;
  /** Classes for the padded content area */
  innerClassName?: string;
  /** Entrance order, drives the stagger */
  index: number;
  /** Hero scroll-out progress (0 → 1) */
  progress: MotionValue<number>;
  /** Where the tile flies to as the hero scrolls away: [x px, y px, rotate deg] */
  explode: [number, number, number];
  tilt?: number;
}

/**
 * A floating glass tile for the hero bento grid: flies in from depth, tilts toward the mouse
 * with a cursor-following spotlight, and drifts apart as the hero scrolls out.
 */
export function BentoTile({
  children,
  className,
  innerClassName,
  index,
  progress,
  explode,
  tilt = 6,
}: BentoTileProps) {
  const reduceMotion = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);

  const x = useTransform(progress, [0, 1], [0, explode[0]]);
  const y = useTransform(progress, [0, 1], [0, explode[1]]);
  const rotate = useTransform(progress, [0, 1], [0, explode[2]]);
  const scale = useTransform(progress, [0, 1], [1, 0.85]);
  const opacity = useTransform(progress, [0.15, 0.85], [1, 0]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = surface.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div style={reduceMotion ? undefined : { x, y, rotate, scale, opacity }} className={cn("relative", className)}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 50, rotateX: -35, scale: 0.85, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        transition={{ type: "spring", stiffness: 110, damping: 16, delay: 0.15 + index * 0.08 }}
        style={{ transformPerspective: 1000 }}
        className="h-full"
      >
        <TiltCard max={tilt}>
          <div
            ref={surface}
            onPointerMove={onPointerMove}
            className="gradient-border group/tile relative h-full rounded-[2rem] preserve-3d"
          >
            <div className="glass absolute inset-0 rounded-[2rem]" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100"
              style={{
                background:
                  "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--brand-1) / 0.2), transparent 45%)",
              }}
            />
            <div className={cn("relative h-full", innerClassName)}>{children}</div>
          </div>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}

export default BentoTile;
