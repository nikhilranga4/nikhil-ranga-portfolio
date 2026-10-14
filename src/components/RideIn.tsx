import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ARRIVAL_MS, arrivalKeyframes, convoy, registerSlot } from "@/lib/convoy";
import { FallContext } from "@/lib/fall";
import { playSfx } from "@/lib/music";
import { airBrake, horn } from "@/lib/music/sfx";
import { cn } from "@/lib/utils";

/** Most pieces animated per section (heading, cards, grid cells …) */
const MAX_PIECES = 14;
const PIECE_MS = 600;
const SETTLE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * The section's "components": the direct children of its container, with grids broken into
 * their cells so each card settles on its own.
 */
function pieces(card: HTMLElement) {
  const out: HTMLElement[] = [];
  card.querySelectorAll<HTMLElement>(":scope > * > .container").forEach((container) => {
    for (const child of Array.from(container.children) as HTMLElement[]) {
      const isGrid = /(^|\s)grid(\s|$)/.test(child.className) && child.children.length > 1;
      if (isGrid) out.push(...(Array.from(child.children) as HTMLElement[]));
      else out.push(child);
    }
  });
  return out.slice(0, MAX_PIECES);
}

interface RideInProps {
  children: ReactNode;
  /** Position in the page (picks this section's truck from the visit's convoy) */
  index: number;
  className?: string;
}

/**
 * A page section riding on a truck in the convoy below the camera. The card is ordinary page
 * HTML (so everything in it keeps working); the 3D world draws its truck, mapped onto it. When
 * the section comes into view its truck drives in and brakes into place, and the card moves with
 * it along the same path (shared with the 3D side, see `arrivalPose`), then its components settle
 * in. The padding above the card is the road space where the cab drives. Plays once per visit;
 * with reduced motion it's simply there.
 */
const RideIn = ({ children, index, className }: RideInProps) => {
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = card.current;
    const box = wrap.current;
    if (!el || !box) return;
    const unregister = registerSlot(index, el, box, !!reduceMotion);
    if (reduceMotion) return unregister;
    el.style.visibility = "hidden";

    const play = () => {
      const slot = convoy.slots.get(index);
      el.style.visibility = "";
      if (!slot) return;
      const anim = el.animate(arrivalKeyframes(slot.plan, window.innerWidth, window.innerHeight, slot.height), {
        duration: ARRIVAL_MS,
        easing: "linear",
        fill: "backwards",
      });
      // The card and its truck run off the same clock (the 3D side reads `slot.start`)
      const start = Number(document.timeline.currentTime ?? performance.now());
      anim.startTime = start;
      slot.start = start;
      convoy.wake(ARRIVAL_MS + 400);

      const pan = slot.plan.style === "left" ? -0.4 : slot.plan.style === "right" ? 0.4 : 0;
      if (slot.plan.horn) playSfx((ctx, out, t) => horn(ctx, out, t, pan), 0.15);
      playSfx((ctx, out, t) => airBrake(ctx, out, t, index, pan * 0.5), (ARRIVAL_MS / 1000) * 0.6);

      // Then its components settle in, in a quick stagger
      pieces(el).forEach((piece, i) => {
        piece.animate(
          [
            { transform: "translate3d(0, 18px, 0)", opacity: 0 },
            { transform: "translate3d(0, 0, 0)", opacity: 1 },
          ],
          { duration: PIECE_MS, delay: ARRIVAL_MS * 0.55 + i * 55, easing: SETTLE, fill: "backwards" }
        );
      });
    };

    // Starts once the card's top is a little way into the screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        play();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.style.visibility = "";
      unregister();
    };
  }, [index, reduceMotion]);

  return (
    <div ref={wrap} className={cn("relative mx-auto w-[calc(100%-1rem)] max-w-[1240px] pt-[28svh] sm:w-[min(1240px,90vw)] sm:pt-[38svh]", className)}>
      <div ref={card} className="glass-slab relative origin-top rounded-[1.75rem] sm:rounded-[2.25rem]">
        <FallContext.Provider value>{children}</FallContext.Provider>
      </div>
    </div>
  );
};

export default RideIn;
