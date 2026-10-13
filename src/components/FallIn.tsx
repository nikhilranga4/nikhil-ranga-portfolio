import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { FallContext } from "@/lib/fall";
import { bumpWorld } from "@/lib/hero-state";
import { playSfx } from "@/lib/music";
import { glassClink } from "@/lib/music/sfx";
import { cn } from "@/lib/utils";

/** Most pieces animated per section (heading, cards, grid cells …) */
const MAX_PIECES = 14;
const SLAB_MS = 900;
const PIECE_MS = 650;
/** Where in the slab's settle it touches down */
const IMPACT_AT = 0.55;
/** Long, soft ease-out: quick to arrive, gentle to stop */
const SETTLE = "cubic-bezier(0.16, 1, 0.3, 1)";

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
 * Settles down onto its place from a little above and nearer the viewer, tipped slightly back,
 * then lies flat: a short, smooth arrival (no tumbling). `perspective()` lives in the transform so
 * it reads as 3D whatever the parent.
 */
function settleFrames(lift: number, near: number, tilt: number): Keyframe[] {
  const p = "perspective(1400px)";
  return [
    { transform: `${p} translate3d(0, ${-lift}px, ${near}px) rotateX(${tilt}deg)`, opacity: 0 },
    { transform: `${p} translate3d(0, ${-lift * 0.2}px, ${near * 0.2}px) rotateX(${tilt * 0.2}deg)`, opacity: 1, offset: 0.4 },
    { transform: `${p} translate3d(0, 0, 0) rotateX(0deg)`, opacity: 1 },
  ];
}

/** The slab's shadow on the ground: soft and far while it's above, tightening as it touches down. */
function shadowFrames(): Keyframe[] {
  return [
    { transform: "translate(0, 70px) scale(0.92)", opacity: 0 },
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
 * its components settle into it one by one. Plays once per section; the section itself is
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
      const timers: number[] = [];

    const play = () => {
      const narrow = window.innerWidth < 640;
      el.style.opacity = "";
      sh.style.opacity = "";
      el.animate(settleFrames(narrow ? 40 : 70, narrow ? 80 : 160, narrow ? 6 : 10), { duration: SLAB_MS, easing: SETTLE, fill: "backwards" });
      sh.animate(shadowFrames(), { duration: SLAB_MS, easing: SETTLE, fill: "both" });
      timers.push(
        window.setTimeout(() => {
          el.classList.remove("slab-landed");
          void el.offsetWidth;
          el.classList.add("slab-landed");
          bumpWorld(0.45);
          playSfx((ctx, out, t) => glassClink(ctx, out, t, index));
        }, SLAB_MS * IMPACT_AT)
      );
      // Then each component settles in after it, in a quick stagger
      pieces(el).forEach((piece, i) => {
        piece.animate(settleFrames(narrow ? 18 : 28, narrow ? 50 : 90, narrow ? 5 : 8), {
          duration: PIECE_MS,
          delay: SLAB_MS * 0.35 + i * 60,
          easing: SETTLE,
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
    <div className={cn("relative mx-auto my-[10vh] w-[calc(100%-1rem)] max-w-[1400px] sm:my-[14vh] sm:w-[min(1400px,96vw)]", className)}>
      {/* Shadow on the ground beneath the slab */}
      <div ref={shadow} aria-hidden className="fall-shadow pointer-events-none absolute -inset-x-[2%] inset-y-[4%]" />
      <div ref={slab} className="glass-slab relative rounded-[1.75rem] sm:rounded-[2.25rem]">
        <FallContext.Provider value>{children}</FallContext.Provider>
      </div>
    </div>
  );
};

export default FallIn;
