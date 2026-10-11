import type { CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

type Kind = "cube" | "pyramid" | "ring";

interface ShapeSpec {
  kind: Kind;
  size: number;
  /** Position as % of the page height / width */
  top: string;
  side: { left?: string; right?: string };
  /** Parallax speed: px of vertical drift per px scrolled (negative drifts up faster) */
  speed: number;
  color: 1 | 2 | 3 | 4 | 5;
  duration: number;
  mobile?: boolean;
}

const SHAPES: ShapeSpec[] = [
  { kind: "cube", size: 70, top: "9%", side: { left: "4%" }, speed: -0.25, color: 1, duration: 18, mobile: true },
  { kind: "ring", size: 110, top: "16%", side: { right: "3%" }, speed: -0.4, color: 3, duration: 14 },
  { kind: "pyramid", size: 80, top: "27%", side: { left: "2%" }, speed: -0.15, color: 4, duration: 22 },
  { kind: "cube", size: 46, top: "36%", side: { right: "6%" }, speed: -0.35, color: 2, duration: 16, mobile: true },
  { kind: "ring", size: 90, top: "47%", side: { left: "5%" }, speed: -0.2, color: 1, duration: 12 },
  { kind: "pyramid", size: 64, top: "58%", side: { right: "3%" }, speed: -0.3, color: 5, duration: 20 },
  { kind: "cube", size: 60, top: "69%", side: { left: "3%" }, speed: -0.45, color: 3, duration: 17, mobile: true },
  { kind: "ring", size: 120, top: "80%", side: { right: "5%" }, speed: -0.25, color: 2, duration: 15 },
  { kind: "pyramid", size: 54, top: "90%", side: { left: "6%" }, speed: -0.35, color: 1, duration: 19 },
];

const face = (color: number, extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: `linear-gradient(135deg, hsl(var(--brand-${color}) / 0.55), hsl(var(--brand-${color}) / 0.12))`,
  border: `1px solid hsl(var(--brand-${color}) / 0.7)`,
  boxShadow: `inset 0 0 18px hsl(var(--brand-${color}) / 0.35)`,
  ...extra,
});

const Cube = ({ size, color }: { size: number; color: number }) => {
  const half = size / 2;
  const transforms = [
    `translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <>
      {transforms.map((t) => (
        <div key={t} style={face(color, { transform: t, borderRadius: size * 0.12 })} />
      ))}
    </>
  );
};

const Pyramid = ({ size, color }: { size: number; color: number }) => {
  const tilt = 30;
  const depth = size * 0.29;
  return (
    <>
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          style={face(color, {
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            transformOrigin: "50% 100%",
            transform: `rotateY(${deg}deg) translateZ(${depth}px) rotateX(${tilt}deg)`,
          })}
        />
      ))}
    </>
  );
};

const Ring = ({ color }: { color: number }) => (
  <>
    {[0, 60, 120].map((deg) => (
      <div
        key={deg}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `3px solid hsl(var(--brand-${color}) / 0.75)`,
          boxShadow: `0 0 16px hsl(var(--brand-${color}) / 0.5), inset 0 0 12px hsl(var(--brand-${color}) / 0.4)`,
          transform: `rotateY(${deg}deg)`,
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        inset: "38%",
        borderRadius: "50%",
        background: `hsl(var(--brand-${color}))`,
        boxShadow: `0 0 24px hsl(var(--brand-${color}))`,
      }}
    />
  </>
);

const Shape = ({ spec }: { spec: ShapeSpec }) => {
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, (v) => v * spec.speed);
  const y = useSpring(drift, { stiffness: 60, damping: 20, mass: 0.6 });
  const rotateZ = useTransform(scrollY, (v) => v * 0.05 * (spec.speed < -0.3 ? -1 : 1));

  return (
    <motion.div
      style={{ top: spec.top, ...spec.side, y, rotateZ, width: spec.size, height: spec.size }}
      className={`absolute ${spec.mobile ? "" : "hidden md:block"} [perspective:800px]`}
    >
      <div
        className="relative h-full w-full animate-tumble preserve-3d"
        style={{ animationDuration: `${spec.duration}s` }}
      >
        {spec.kind === "cube" && <Cube size={spec.size} color={spec.color} />}
        {spec.kind === "pyramid" && <Pyramid size={spec.size} color={spec.color} />}
        {spec.kind === "ring" && <Ring color={spec.color} />}
      </div>
    </motion.div>
  );
};

/** Glassy CSS-3D shapes scattered down the page margins, tumbling and parallaxing on scroll. */
const FloatingShapes = () => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-70 dark:opacity-80">
      {SHAPES.map((spec, i) => (
        <Shape key={i} spec={spec} />
      ))}
    </div>
  );
};

export default FloatingShapes;
