import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { FallContext } from "@/lib/fall";
import { playSfx } from "@/lib/music";
import { glassClink } from "@/lib/music/sfx";
import { cn } from "@/lib/utils";

/** Most pieces animated per section (heading, cards, grid cells …) */
const MAX_PIECES = 14;
const SLAB_MS = 1000;
const PIECE_MS = 820;

/**
 * The section's "components": the direct children of its container, with grids broken into
 * their cells so each card falls on its own.
 */
function pieces(slab: HTMLElement) {
  const out: HTMLElement[] = [];
  slab.querySelectorAll<HTMLElement>(":scope > * > .container").forEach((container) => {
    for (const child of Array.from(container.children) as HTMLElement[]) {
      const isGrid = /(^|\s)grid(\s|$)/.test(child.className) && child.children.length > 1;
      if (isGrid) out.push(...(Array.from(child.children) as HTMLElement[]));
      else out.push(child);
    }
  });
  return out.slice(0, MAX_PIECES);
}

/**
 * Falling-from-the-floor keyframes: drops from above (accelerating, tumbling a little), hits,
 * bounces once and settles. `perspective()` is in the transform itself so the tumble reads as 3D
 * whatever the parent.
 */
function fallFrames(drop: number, tiltX: number, tiltZ: number): Keyframe[] {
  const p = "perspective(1400px)";
  return [
    { transform: `${p} translate3d(0, ${-drop}px, 0) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`, opacity: 0, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    { transform: `${p} translate3d(0, ${-drop * 0.55}px, 0) rotateX(${tiltX * 0.6}deg) rotateZ(${tiltZ * 0.6}deg)`, opacity: 1, offset: 0.35, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    { transform: `${p} translate3d(0, ${drop * 0.015}px, 0) rotateX(0deg) rotateZ(${tiltZ * 0.08}deg)`, opacity: 1, offset: 0.72, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { transform: `${p} translate3d(0, ${-drop * 0.03}px, 0) rotateX(0deg) rotateZ(0deg)`, opacity: 1, offset: 0.86, easing: "cubic-bezier(0.5, 0, 0.6, 1)" },
    { transform: `${p} translate3d(0, 0, 0) rotateX(0deg) rotateZ(0deg)`, opacity: 1 },
  ];
}

interface FallInProps {
  children: ReactNode;
  /** Position in the page: alternates the tumble direction */
  index: number;
  className?: string;
}

/**
 * A page section as a glass slab that falls from the broken floor above when you reach it: the
 * slab drops in and lands with a clink, then its components fall into it one by one. Plays once
 * per section (also when jumping there from the nav). The section itself is untouched, so all
 * of its UI keeps working; with reduced motion it's simply there.
 */
const FallIn = ({ children, index, className }: FallInProps) => {
  const slab = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = slab.current;
    if (!el || reduceMotion) return;
    el.style.opacity = "0";
    const side = index % 2 === 0 ? 1 : -1;
    const timers: number[] = [];

    const play = () => {
      const vh = window.innerHeight;
      const narrow = window.innerWidth < 640;
      el.style.opacity = "";
      el.animate(fallFrames(Math.min(vh * (narrow ? 0.55 : 0.85), 760), narrow ? 18 : 32, side * (narrow ? 3 : 6)), {
        duration: SLAB_MS,
        fill: "backwards",
      });
      // The landing: edge glow and a soft clink
      timers.push(
        window.setTimeout(() => {
          el.classList.remove("slab-landed");
          void el.offsetWidth;
          el.classList.add("slab-landed");
          playSfx((ctx, out, t) => glassClink(ctx, out, t, index));
        }, SLAB_MS * 0.72)
      );
      // Then each component drops into the slab
      pieces(el).forEach((piece, i) => {
        const tilt = (i % 2 === 0 ? 1 : -1) * side;
        piece.animate(fallFrames(Math.min(vh * (narrow ? 0.35 : 0.5), 420), narrow ? 14 : 26, tilt * (narrow ? 2 : 4)), {
          duration: PIECE_MS,
          delay: SLAB_MS * 0.55 + i * 85,
          fill: "backwards",
        });
      });
    };

    // Starts once the slab's top is a little way into the screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        play();
      },
      { rootMargin: "0px 0px -18% 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      el.style.opacity = "";
    };
  }, [index, reduceMotion]);

  return (
    <div
      ref={slab}
      className={cn(
        "glass-slab relative mx-auto my-[10vh] w-[calc(100%-1rem)] max-w-[1400px] rounded-[1.75rem] sm:my-[14vh] sm:w-[min(1400px,96vw)] sm:rounded-[2.25rem]",
        className
      )}
    >
      <FallContext.Provider value>{children}</FallContext.Provider>
    </div>
  );
};

export default FallIn;
