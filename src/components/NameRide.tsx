import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { ARRIVAL_MS, LETTER_DROP_MS, LETTER_GAP_MS, NAME_LOAD, convoy, registerSlot } from "@/lib/convoy";
import { playSfx } from "@/lib/music";
import { airBrake, horn, letterDrop } from "@/lib/music/sfx";

/**
 * The last truck in the convoy: a wide flatbed carrying the name as big 3D letters, "NIKHIL" on
 * one line and "RANGA" on the next, lying flat and loaded on one after another once it has
 * pulled in. The truck and letters are drawn by the 3D world; this only reserves their place on the page (the bed is this box) and starts the arrival when it's in view.
 */
const NameRide = ({ index }: { index: number }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const bed = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = bed.current;
    const box = wrap.current;
    if (!el || !box) return;
    const unregister = registerSlot(index, el, box, !!reduceMotion, "name");
    if (reduceMotion) return unregister;

    const letters = NAME_LOAD.replace(/\s/g, "").length;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const slot = convoy.slots.get(index);
        if (!slot) return;
        slot.start = Number(document.timeline.currentTime ?? performance.now());
        convoy.wake(ARRIVAL_MS + letters * LETTER_GAP_MS + LETTER_DROP_MS + 600);
        const pan = slot.plan.style === "left" ? -0.4 : slot.plan.style === "right" ? 0.4 : 0;
        playSfx((ctx, out, t) => horn(ctx, out, t, pan), 0.1);
        playSfx((ctx, out, t) => airBrake(ctx, out, t, index, pan * 0.5), (ARRIVAL_MS / 1000) * 0.6);
        // Each letter clunks down as it lands (they drop in one after another)
        for (let i = 0; i < letters; i++) {
          const at = (ARRIVAL_MS + i * LETTER_GAP_MS + LETTER_DROP_MS * 0.62) / 1000;
          playSfx((ctx, out, t) => letterDrop(ctx, out, t, i), at);
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      unregister();
    };
  }, [index, reduceMotion]);

  return (
    <div ref={wrap} className="relative mx-auto pt-[28svh] sm:pt-[38svh]">
      {/* The flatbed: two lines of letters, "NIKHIL" over "RANGA" */}
      <div ref={bed} className="mx-auto h-[calc(clamp(280px,82vw,720px)*0.54)] w-[clamp(280px,82vw,720px)]" aria-hidden />
      <h2 className="sr-only">Nikhil Ranga</h2>
    </div>
  );
};

export default NameRide;
