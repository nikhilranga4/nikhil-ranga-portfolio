import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import { lenisRef } from "@/lib/lenis";
import type { PaletteColors } from "@/lib/palettes";

/*
 * "RobotExpressive" by Tomás Laulhé (Quaternius), CC0 1.0 — via the three.js examples.
 * https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive
 */
const MODEL_URL = "/models/RobotExpressive.glb";
const MODEL_HEIGHT = 4.5; // approximate height of the model in its own units

type Clip = "Idle" | "Walking" | "Running" | "Wave" | "Yes" | "ThumbsUp" | "Punch" | "Dance" | "Jump";

interface Waypoint {
  /** -1 = left edge, 0 = centre, 1 = right edge */
  side: -1 | 0 | 1;
  action: Clip;
  loop?: boolean;
  bubble: string;
}

const WAYPOINTS: Record<string, Waypoint> = {
  home: { side: 1, action: "Wave", bubble: "Hi! I'm Nikhil's bot 👋" },
  about: { side: -1, action: "Yes", bubble: "Here's the story…" },
  education: { side: 1, action: "ThumbsUp", bubble: "Where it all started 🎓" },
  experience: { side: -1, action: "Punch", bubble: "Work mode: ON 💼" },
  skills: { side: 1, action: "Dance", loop: true, bubble: "My superpowers ⚡" },
  projects: { side: -1, action: "ThumbsUp", bubble: "Check these out! 🚀" },
  github: { side: 1, action: "Jump", bubble: "Commit streak 🔥" },
  contact: { side: 0, action: "Wave", bubble: "Let's build together ✉️" },
};
const ORDER = Object.keys(WAYPOINTS);

/** Which section currently owns the middle of the viewport. */
function detectSection() {
  let active = ORDER[0];
  for (const id of ORDER) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) active = id;
  }
  return active;
}

interface RobotGuideProps {
  colors: PaletteColors;
  reduceMotion: boolean;
}

/**
 * A rigged robot that walks along the bottom of the screen as you scroll, travelling to a new
 * side for each section, then greeting you with a section-specific animation and speech bubble.
 */
const RobotGuide = ({ colors, reduceMotion }: RobotGuideProps) => {
  const { scene, animations } = useGLTF(MODEL_URL);
  const { viewport, size } = useThree();
  const mover = useRef<THREE.Group>(null);
  const turner = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, turner);

  const [section, setSection] = useState(detectSection);
  const [settled, setSettled] = useState(false);
  const sectionRef = useRef(section);
  const settledRef = useRef(false);
  const current = useRef<Clip | null>(null);
  const idleTime = useRef(0);
  const lastScroll = useRef({ y: window.scrollY, v: 0 });

  // Tint the robot's body to the palette's lead colour
  const bodyMaterial = useMemo(() => {
    let found: THREE.MeshStandardMaterial | null = null;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m.name === "Main") found = m as THREE.MeshStandardMaterial;
      });
    });
    return found as THREE.MeshStandardMaterial | null;
  }, [scene]);
  const bodyTarget = useMemo(() => new THREE.Color(colors.c1), [colors.c1]);

  const fadeTo = (name: Clip, once = false) => {
    if (current.current === name) return;
    const next = actions[name];
    if (!next) return;
    const prev = current.current ? actions[current.current] : null;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.35).play();
    prev?.fadeOut(0.35);
    current.current = name;
  };

  useEffect(() => {
    fadeTo("Idle");
    const onFinished = () => {
      idleTime.current = 0;
      fadeTo("Idle");
    };
    mixer.addEventListener("finished", onFinished);

    const onScroll = () => {
      const next = detectSection();
      if (next !== sectionRef.current) {
        sectionRef.current = next;
        setSection(next);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      mixer.removeEventListener("finished", onFinished);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer]);

  const mobile = size.width < 768;
  const unit = viewport.width / size.width;
  const heightPx = mobile ? 88 : Math.min(size.height * 0.2, 185);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!mover.current || !turner.current) return;
    const wp = WAYPOINTS[sectionRef.current];

    // Scroll velocity (px/s), preferring Lenis' smoothed value
    const y = window.scrollY;
    const measured = (y - lastScroll.current.y) / Math.max(delta, 1e-4);
    lastScroll.current.y = y;
    const velocity = lenisRef.current ? lenisRef.current.velocity * 60 : measured;
    lastScroll.current.v = THREE.MathUtils.damp(lastScroll.current.v, velocity, 6, delta);
    const scrollSpeed = Math.abs(lastScroll.current.v);

    // Layout in world units
    const scale = (heightPx * unit) / MODEL_HEIGHT;
    const edge = viewport.width / 2 - (mobile ? 12 + heightPx * 0.42 : 28 + heightPx * 0.42) * unit;
    const targetX = wp.side * edge;
    const baseY = -viewport.height / 2 + (mobile ? 6 : 12) * unit;
    turner.current.scale.setScalar(scale);

    // Travel
    const pos = mover.current.position;
    const dx = targetX - pos.x;
    const running = Math.abs(dx) > edge * 1.1 || scrollSpeed > 1800;
    const speed = (viewport.width / (running ? 1.5 : 2.6)) * (1 + Math.min(scrollSpeed / 3000, 0.8));
    if (reduceMotion) pos.x = targetX;
    else pos.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * delta);
    const moving = Math.abs(targetX - pos.x) > 1.5 * unit;

    // Idle bob
    const bob = moving ? 0 : Math.sin(state.clock.elapsedTime * 2.2) * 2 * unit;
    pos.y = baseY + bob;

    // Face direction of travel, or turn toward the page centre when standing
    const faceY = moving ? Math.sign(dx) * (Math.PI / 2) : -wp.side * 0.45;
    turner.current.rotation.y = THREE.MathUtils.damp(turner.current.rotation.y, faceY, 7, delta);
    // Lean slightly into fast scrolling
    const lean = THREE.MathUtils.clamp(lastScroll.current.v / 12000, -0.12, 0.12);
    turner.current.rotation.x = THREE.MathUtils.damp(turner.current.rotation.x, moving ? 0 : lean, 5, delta);

    // Animation state machine
    if (reduceMotion) {
      fadeTo("Idle");
    } else if (moving) {
      fadeTo(running ? "Running" : "Walking");
      const clip = current.current ? actions[current.current] : null;
      clip?.setEffectiveTimeScale(1 + Math.min(scrollSpeed / 2500, 0.9));
    } else if (!settledRef.current) {
      fadeTo(wp.action, !wp.loop);
      idleTime.current = 0;
    } else if (!wp.loop && current.current === "Idle") {
      idleTime.current += delta;
      if (idleTime.current > 6) {
        idleTime.current = 0;
        fadeTo(wp.action, true);
      }
    }

    const nowSettled = !moving;
    if (nowSettled !== settledRef.current) {
      settledRef.current = nowSettled;
      setSettled(nowSettled);
    }

    // Palette tint
    bodyMaterial?.color.lerp(bodyTarget, 1 - Math.exp(-4 * delta));
  });

  const bubble = WAYPOINTS[section].bubble;

  return (
    <group ref={mover} position={[WAYPOINTS[section].side * viewport.width * 0.4, -viewport.height / 2, 0]}>
      <group ref={turner}>
        <primitive object={scene} />
      </group>
      <Html
        position={[0, heightPx * unit * 1.05, 0]}
        center
        zIndexRange={[75, 71]}
        style={{ pointerEvents: "none" }}
      >
        {/* Shift the bubble toward the page centre so it never runs off-screen */}
        <div style={{ transform: `translateX(${-WAYPOINTS[section].side * 32}%)` }}>
          <AnimatePresence mode="wait">
            {settled && (
              <motion.div
                key={bubble}
                initial={{ opacity: 0, scale: 0.4, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 6 }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
                className="glass relative whitespace-nowrap rounded-2xl px-3.5 py-2 font-display text-xs font-bold text-foreground shadow-[0_10px_30px_-8px_hsl(var(--brand-1)/0.55)] sm:text-sm"
              >
                {bubble}
                <span
                  style={{ left: `${50 + WAYPOINTS[section].side * 32}%` }}
                  className="absolute -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[hsl(var(--glass-border))] bg-[hsl(var(--background))]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Html>
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default RobotGuide;
