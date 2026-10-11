import { useRef, type ReactNode, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees */
  max?: number;
  glare?: boolean;
}

/**
 * Wraps content in a 3D card that tilts toward the pointer with a moving glare.
 * Children can use `[transform:translateZ(40px)]` to pop out of the surface.
 */
export function TiltCard({ children, className, max = 12, glare = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28), transparent 55%)`;

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="perspective h-full">
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        className={cn("group relative h-full preserve-3d will-change-transform", className)}
      >
        {children}
        {glare && !reduceMotion && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: glareBg }}
          />
        )}
      </motion.div>
    </div>
  );
}

export default TiltCard;
