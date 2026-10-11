import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { cursorState } from "@/lib/cursor-state";

/**
 * Precise glowing dot for fine pointers. It also publishes pointer / hover / press state to
 * `cursorState`, which drives the WebGL 3D cursor ring in the global stage.
 */
const CustomCursor = () => {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || reduceMotion) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      cursorState.x = e.clientX;
      cursorState.y = e.clientY;
      cursorState.active = true;
      const target = e.target as HTMLElement | null;
      const over = !!target?.closest("a, button, [role='button'], label, [data-cursor='hover']");
      cursorState.hovering = over;
      setHovering(over);
    };
    const down = () => (cursorState.pressed = true);
    const up = () => (cursorState.pressed = false);
    const leave = () => (cursorState.active = false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      cursorState.active = false;
    };
  }, [reduceMotion, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      animate={{ scale: hovering ? 0.5 : 1 }}
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-1 -mt-1 h-2 w-2 rounded-full bg-foreground shadow-glow-1"
    />
  );
};

export default CustomCursor;
