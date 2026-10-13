import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import type { IntroStage } from "@/lib/hero-state";
import { playSfx, setIntroActive } from "@/lib/music";
import { chime, enterThunk, keyClick, whoosh } from "@/lib/music/sfx";
import { Corridor } from "./Corridor";
import { FloatingKeys } from "./FloatingKeys";
import { IntroKeyboard, KEYBOARD_POS } from "./IntroKeyboard";
import { Precompile } from "./Precompile";
import { Room } from "./Room";
import { INTRO, KEY_TIMES, NAME_ROWS, SCROLL, easeInOut, smooth, span, type WorldState } from "./timeline";


const BG = "#020809";
const KEY_PAN = NAME_ROWS.flatMap((row) => row.split("").map((_, i) => (i / (row.length - 1) - 0.5) * 0.8));
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(20));

/**
 * Resolution: 1x by default; capable discrete GPUs get up to 1.25x. Decided from the canvas's own
 * context as soon as it exists (before anything is drawn, so nothing resizes on screen).
 */
function isLowEndGpu(gl: THREE.WebGLRenderer, portrait: boolean) {
  if (portrait || (navigator.hardwareConcurrency ?? 8) <= 4) return true;
  const ctx = gl.getContext();
  const info = ctx.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  return /intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe|basic render/i.test(renderer);
}

// ── Intro director: runs the clock, plays the sounds, reports the stages ─────

function Director({ world, revealed, onStage }: { world: MutableRefObject<WorldState>; revealed: boolean; onStage: (stage: IntroStage) => void }) {
  const state = useRef({ start: -1, typed: 0, entered: false, launched: false, named: false, done: false });
  const stage = useRef(onStage);
  stage.current = onStage;

  useEffect(() => {
    if (!revealed || state.current.start >= 0) return;
    if (world.current.reduceMotion) {
      world.current.intro = Infinity;
      world.current.wake();
      stage.current("done");
      setIntroActive(false);
      return;
    }
    state.current.start = performance.now();
    world.current.intro = 0;
    world.current.wake();
    stage.current("typing");
  }, [revealed, world]);

  useFrame(() => {
    const s = state.current;
    if (s.start < 0 || s.done) return;
    const t = (performance.now() - s.start) / 1000;
    world.current.intro = t;
    for (; s.typed < KEY_TIMES.length && t >= KEY_TIMES[s.typed]; s.typed++) {
      const i = s.typed;
      playSfx((ctx, out, at) => keyClick(ctx, out, at, i, KEY_PAN[i]));
    }
    if (!s.entered && t >= INTRO.enterPress) {
      s.entered = true;
      playSfx(enterThunk);
    }
    if (!s.launched && t >= INTRO.launch) {
      s.launched = true;
      playSfx(whoosh, 0.1);
    }
    if (!s.named && t >= INTRO.nameIn) {
      s.named = true;
      playSfx(chime, 0.1);
      stage.current("named");
    }
    if (t >= INTRO.done) {
      s.done = true;
      world.current.intro = Infinity;
      // Keep drawing while the floating keys finish dropping in
      world.current.wake(2600);
      stage.current("done");
      setIntroActive(false);
    }
  });
  return null;
}

// ── Render on demand: frames only while something is moving ───────────────

/**
 * The canvas only draws while the intro plays, the visitor scrolls or moves the pointer, or
 * something is still settling (a short grace period afterwards). Idle, it costs nothing.
 */
function Driver({ world, active }: { world: MutableRefObject<WorldState>; active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    world.current.wake = (ms = 1600) => {
      world.current.busyUntil = Math.max(world.current.busyUntil, performance.now() + ms);
      invalidate();
    };
    return () => {
      world.current.wake = () => undefined;
    };
  }, [world, invalidate]);
  useEffect(() => {
    if (active) world.current.wake();
  }, [active, world]);
  useFrame(() => {
    const w = world.current;
    const intro = w.intro >= 0 && w.intro !== Infinity;
    if (intro || performance.now() < w.busyUntil) invalidate();
  });
  return null;
}

// ── Camera: keyboard close-up → door → through the doorway into the room ────

function Rig({ world }: { world: MutableRefObject<WorldState> }) {
  const { camera, size } = useThree();
  const tmp = useMemo(
    () => ({
      introPos: new THREE.Vector3(),
      introLook: new THREE.Vector3(),
      doorPos: new THREE.Vector3(),
      doorLook: new THREE.Vector3(0, 1.32, 0),
      roomPos: new THREE.Vector3(),
      roomLook: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    }),
    []
  );

  useFrame((_, delta) => {
    const w = world.current;
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;

    // Fit the keyboard (about 3.4 wide) and the door bay (about 2.7 wide, 5.4 tall) on any screen
    const kbDist = Math.max(3.6, (aspect < 1 ? 3.45 : 4.2) / (2 * TAN_HALF_FOV * aspect));
    tmp.introLook.copy(KEYBOARD_POS).add(new THREE.Vector3(0, 0.05, 0));
    tmp.introPos.copy(tmp.introLook).add(new THREE.Vector3(0, 0.42, 0.9).normalize().multiplyScalar(kbDist));
    const doorDist = Math.max(7.4, 2.8 / (2 * TAN_HALF_FOV * aspect));
    tmp.doorPos.set(0, 1.5, doorDist);
    tmp.roomPos.set(0, 1.42, -2.25);
    tmp.roomLook.set(w.portrait ? 0 : -1.05, 1.12, -8);

    // Scroll: glide along a path that threads the doorway
    const pts = tmp.curve.points;
    pts[0].copy(tmp.doorPos);
    pts[1].set(0, 1.46, Math.min(doorDist * 0.45, 3.4));
    pts[2].set(0, 1.4, 0.9);
    pts[3].set(0, 1.4, -0.9);
    pts[4].copy(tmp.roomPos);
    const fly = easeInOut(span(w.progress, SCROLL.fly));
    tmp.curve.getPoint(fly, tmp.pos);
    tmp.look.copy(tmp.doorLook).lerp(tmp.roomLook, smooth(fly * 1.15));

    // Intro: start on the keyboard, pull back to the door after Enter
    if (!w.reduceMotion && w.intro !== Infinity) {
      const back = w.intro < 0 ? 0 : easeInOut(span(w.intro, INTRO.pullBack));
      tmp.pos.copy(tmp.introPos).lerp(tmp.doorPos, back);
      tmp.look.copy(tmp.introLook).lerp(tmp.doorLook, back);
    }
    if (w.reduceMotion) {
      tmp.pos.copy(tmp.roomPos);
      tmp.look.copy(tmp.roomLook);
    }

    // Drift toward the pointer (capped step, so the first frame after an idle pause can't jump)
    const step = Math.min(delta, 1 / 20);
    w.pointer.x = THREE.MathUtils.damp(w.pointer.x, pointerTarget.x, 3, step);
    w.pointer.y = THREE.MathUtils.damp(w.pointer.y, pointerTarget.y, 3, step);
    if (!w.reduceMotion) {
      tmp.pos.x += w.pointer.x * 0.18;
      tmp.pos.y += w.pointer.y * 0.1;
    }
    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.look);
  });
  return null;
}

/** Raw pointer in -1..1, written by a window listener and eased by the rig. */
const pointerTarget = new THREE.Vector2();

// ── Floor ──────────────────────────────────────────────────────────────────

/** Wet concrete: a plain sheen that catches the coral and teal lights (no mirror pass). */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]}>
      <planeGeometry args={[18, 22]} />
      <meshStandardMaterial color="#0d1415" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

// ── The world ──────────────────────────────────────────────────────────────

export interface HeroWorldProps {
  progress: MotionValue<number>;
  /** The boot screen has lifted: start the intro */
  revealed: boolean;
  /** Pause rendering when the hero is off-screen */
  active: boolean;
  portrait: boolean;
  reduceMotion: boolean;
  colors: PaletteColors;
  onReady: () => void;
  onStage: (stage: IntroStage) => void;
}

const HeroWorld = ({ progress, revealed, active, portrait, reduceMotion, colors, onReady, onStage }: HeroWorldProps) => {
  const world = useRef<WorldState>({
    intro: -1,
    progress: progress.get(),
    pointer: new THREE.Vector2(),
    portrait,
    reduceMotion,
    busyUntil: 0,
    wake: () => undefined,
  });
  world.current.portrait = portrait;
  world.current.reduceMotion = reduceMotion;

  useEffect(
    () =>
      progress.on("change", (p) => {
        world.current.progress = p;
        world.current.wake(900);
      }),
    [progress]
  );
  useEffect(() => {
    const fine = !reduceMotion && window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (fine) pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      world.current.wake(1400);
    };
    const onDown = () => world.current.wake(1800);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [reduceMotion]);
  // Theme switches ease the colours over a moment
  useEffect(() => world.current.wake(1500), [colors]);

  // Nothing is drawn until every shader has compiled in the background: drawing earlier makes
  // the GPU driver compile them synchronously on the first frame and freezes the page for seconds
  const [compiled, setCompiled] = useState(false);
  const neonA = colors.c1;
  const neonB = colors.c2;

  return (
    <Canvas
      frameloop={active && compiled ? "demand" : "never"}
      dpr={1}
      onCreated={({ gl, setDpr }) => {
        if (!isLowEndGpu(gl, portrait)) setDpr(Math.min(window.devicePixelRatio || 1, 1.25));
      }}
      camera={{ position: [0, 1.5, 7.4], fov: 40, near: 0.05, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={[BG]} />
      <fogExp2 attach="fog" args={[BG, 0.055]} />
      <ambientLight intensity={0.16} color="#5fa8a4" />
      <hemisphereLight args={["#2a5254", "#050808", 0.5]} />

      <Driver world={world} active={active} />
      <Director world={world} revealed={revealed} onStage={onStage} />
      <Rig world={world} />

      <Floor />
      <Corridor world={world} neonA={neonA} neonB={neonB} />
      <Room neonA={neonA} neonB={neonB} />
      <IntroKeyboard world={world} ramp={[colors.c1, colors.c2, colors.c3]} />
      <FloatingKeys world={world} colors={colors} />
      <Precompile onCompiled={() => setCompiled(true)} onReady={onReady} />
    </Canvas>
  );
};

export default HeroWorld;
