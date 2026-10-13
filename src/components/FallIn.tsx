import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { FallContext } from "@/lib/fall";
import { bumpWorld } from "@/lib/hero-state";
import { playSfx } from "@/lib/music";
import { glassClink } from "@/lib/music/sfx";
import { cn } from "@/lib/utils";

/** Most pieces animated per section (heading, cards, grid cells …) */
const MAX_PIECES = 14;
const SLAB_MS = 1150;
const PIECE_MS = 780;
/** Where in the slab's fall it hits the ground */
const IMPACT_AT = 0.7;

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
 * Seen from above: the object starts high up, close to the camera (big, turned, a little tilted),
 * falls away from us onto the ground (accelerating), hits, bounces once and settles flat.
 * `perspective()` lives in the transform so it reads as 3D whatever the parent.
 */
function dropFrames(height: number, spin: number, tilt: number, drift: [number, number]): Keyframe[] {
  const p = "perspective(1200px)";
  const [dx, dy] = drift;
  return [
    { transform: `${p} translate3d(${dx}px, ${dy}px, ${height}px) rotateZ(${spin}deg) rotateX(${tilt}deg) rotateY(${-tilt * 0.6}deg)`, opacity: 0, easing: "cubic-bezier(0.5, 0, 1, 0.5)" },
    { transform: `${p} translate3d(${dx * 0.6}px, ${dy * 0.6}px, ${height * 0.62}px) rotateZ(${spin * 0.7}deg) rotateX(${tilt * 0.7}deg) rotateY(${-tilt * 0.4}deg)`, opacity: 1, offset: 0.3, easing: "cubic-bezier(0.5, 0, 1, 0.5)" },
    { transform: `${p} translate3d(0, 0, ${-height * 0.04}px) rotateZ(${spin * 0.04}deg) rotateX(0deg) rotateY(0deg)`, opacity: 1, offset: IMPACT_AT, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { transform: `${p} translate3d(0, 0, ${height * 0.035}px) rotateZ(0deg) rotateX(0deg) rotateY(0deg)`, opacity: 1, offset: 0.86, easing: "cubic-bezier(0.5, 0, 0.6, 1)" },
    { transform: `${p} translate3d(0, 0, 0) rotateZ(0deg) rotateX(0deg) rotateY(0deg)`, opacity: 1 },
  ];
}

/** The slab's shadow on the ground: wide, faint and offset while high up; tight and dark on landing. */
function shadowFrames(drift: [number, number]): Keyframe[] {
  const [dx, dy] = drift;
  return [
    { transform: `translate(${dx * 0.3 + 60}px, ${dy * 0.3 + 90}px) scale(0.7)`, opacity: 0, easing: "cubic-bezier(0.5, 0, 1, 0.5)" },
    { transform: `translate(${dx * 0.2 + 40}px, ${dy * 0.2 + 60}px) scale(0.8)`, opacity: 0.25, offset: 0.3, easing: "cubic-bezier(0.5, 0, 1, 0.5)" },
    { transform: "translate(0, 14px) scale(1)", opacity: 0.85, offset: IMPACT_AT },
    { transform: "translate(0, 18px) scale(1)", opacity: 0.6 },
  ];
}

interface FallInProps {
  children: ReactNode;
  /** Position in the page: alternates the spin direction */
  index: number;
  className?: string;
}

/**
 * A page section as a glass slab dropped from the broken floor, seen from the camera above:
 * when you reach it, it falls away from you onto the ground, lands with a jolt and a clink, then
 * its components drop into it one by one. While it scrolls by it leans in perspective like a panel
 * lying below the camera (CSS scroll-driven, no JS). Plays once per section; the section itself is
 * untouched, so its UI keeps working. With reduced motion it's simply there.
 */
const FallIn = ({ children, index, className }: FallInProps) => {
  const slab = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = slab.current;
    const sh = shadow.current;
    if (!el || !sh || reduceMotion) return;
    el.style.opacity = "0";
    sh.style.opacity = "0";
    const side = index % 2 === 0 ? 1 : -1;
    const timers: number[] = [];

    const play = () => {
      const narrow = window.innerWidth < 640;
      const height = narrow ? 520 : 900;
      const drift: [number, number] = [side * (narrow ? 40 : 160), narrow ? -60 : -140];
      el.style.opacity = "";
      sh.style.opacity = "";
      el.animate(dropFrames(height, side * (narrow ? 10 : 16), narrow ? 10 : 18, drift), { duration: SLAB_MS, fill: "backwards" });
      sh.animate(shadowFrames(drift), { duration: SLAB_MS, fill: "both" });
      timers.push(
        window.setTimeout(() => {
          el.classList.remove("slab-landed");
          void el.offsetWidth;
          el.classList.add("slab-landed");
          bumpWorld(1);
          playSfx((ctx, out, t) => glassClink(ctx, out, t, index));
        }, SLAB_MS * IMPACT_AT)
      );
      // Then each component drops in from above, smaller and quicker
      pieces(el).forEach((piece, i) => {
        const turn = (i % 2 === 0 ? 1 : -1) * side;
        piece.animate(dropFrames(narrow ? 320 : 480, turn * (narrow ? 6 : 9), narrow ? 8 : 12, [turn * 30, -40]), {
          duration: PIECE_MS,
          delay: SLAB_MS * IMPACT_AT + 60 + i * 80,
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
      sh.style.opacity = "";
    };
  }, [index, reduceMotion]);

  return (
    <div className={cn("fall-tilt relative mx-auto my-[10vh] w-[calc(100%-1rem)] max-w-[1400px] sm:my-[14vh] sm:w-[min(1400px,96vw)]", className)}>
      {/* Shadow on the ground beneath the slab */}
      <div ref={shadow} aria-hidden className="fall-shadow pointer-events-none absolute inset-x-[3%] inset-y-[2%] rounded-[2rem]" />
      <div ref={slab} className="glass-slab relative rounded-[1.75rem] sm:rounded-[2.25rem]">
        <FallContext.Provider value>{children}</FallContext.Provider>
      </div>
    </div>
  );
};

export default FallIn;
