import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/** Glowing dot + trailing ring. Only mounts for fine pointers (mouse / trackpad). */
const CustomCursor = () => {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || reduceMotion) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as HTMLElement | null;
      setHovering(!!target?.closest("a, button, [role='button'], [data-cursor='hover']"));
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [reduceMotion, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        animate={{ scale: pressed ? 0.7 : hovering ? 1.8 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="pointer-events-none fixed left-0 top-0 z-[100] -ml-5 -mt-5 h-10 w-10 rounded-full border-2 border-neon-pink/70 mix-blend-difference dark:border-neon-cyan/80"
      />
      <motion.div
        aria-hidden
        style={{ x, y }}
        animate={{ scale: hovering ? 0 : 1 }}
        className="pointer-events-none fixed left-0 top-0 z-[100] -ml-1 -mt-1 h-2 w-2 rounded-full bg-neon-pink shadow-glow-pink"
      />
    </>
  );
};

export default CustomCursor;
