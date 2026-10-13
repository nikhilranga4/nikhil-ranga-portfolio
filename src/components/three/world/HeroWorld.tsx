import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import { worldImpact, type IntroStage } from "@/lib/hero-state";
import { lenisRef } from "@/lib/lenis";
import { playSfx, setIntroActive } from "@/lib/music";
import { chime, enterThunk, keyClick, whoosh } from "@/lib/music/sfx";
import { Corridor, DOOR } from "./Corridor";
import { FallScene } from "./FallScene";
import { FloatingKeys } from "./FloatingKeys";
import { GlassFloor, IMPACT } from "./GlassFloor";
import { IntroKeyboard, KEYBOARD_POS } from "./IntroKeyboard";
import { Precompile } from "./Precompile";
import { Room } from "./Room";
import {
  INTRO,
  KEY_TIMES,
  NAME_ROWS,
  SCROLL,
  easeInOut,
  fallBlend,
  FALL_START_Z,
  fallCameraX,
  fallCameraY,
  fallDepth,
  smooth,
  span,
  type WorldState,
} from "./timeline";


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
    worldImpact.wake = () => world.current.wake(700);
    return () => {
      world.current.wake = () => undefined;
      worldImpact.wake = () => undefined;
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
      tiltPos: new THREE.Vector3(0.15, 2.9, -2.5),
      fallPos: new THREE.Vector3(),
      fallLook: new THREE.Vector3(),
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
    const kbDist = Math.max(3.6, (aspect < 1 ? 3.35 : 4.2) / (2 * TAN_HALF_FOV * aspect));
    tmp.introLook.copy(KEYBOARD_POS).add(new THREE.Vector3(0, 0.05, 0));
    tmp.introPos.copy(tmp.introLook).add(new THREE.Vector3(0, 0.3, 0.95).normalize().multiplyScalar(kbDist * 0.92));
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

    // After the room: tilt down at the glass, shake as it shatters, drop through, then fall
    const tilt = easeInOut(span(w.progress, SCROLL.tilt));
    if (tilt > 0) {
      tmp.pos.lerp(tmp.tiltPos, tilt);
      tmp.look.lerp(IMPACT, tilt);
    }
    const shake = Math.sin(Math.min(1, span(w.progress, [SCROLL.shatter[0], SCROLL.shatter[0] + 0.07])) * Math.PI) * 0.06;
    if (shake > 0) {
      tmp.pos.x += Math.sin(w.progress * 900) * shake;
      tmp.pos.y += Math.cos(w.progress * 1300) * shake;
    }
    const drop = easeInOut(span(w.progress, SCROLL.drop));
    const fallY = fallCameraY(w.fall, w.fallMax);
    const fallX = fallCameraX(w.fall, w.fallMax);
    const [, landing] = fallDepth(w.fall, w.fallMax);
    tmp.fallPos.set(fallX, fallY, FALL_START_Z);
    // Falling beside the tower's face (on the right, its windows streaming up), looking out and
    // down over the city; levelling out as we touch down on the avenue
    tmp.fallLook.set(fallX + 10, fallY - 6.2 * (1 - landing) - 0.6 * landing, FALL_START_Z - 2.2);
    if (drop > 0) {
      tmp.pos.lerp(tmp.fallPos, drop);
      tmp.look.lerp(tmp.fallLook, drop);
    }

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
    w.velocity = THREE.MathUtils.damp(w.velocity, 0, 2.5, step);
    // Buffeted a little by the wind while falling
    if (!w.reduceMotion && w.fall > 0) tmp.pos.x += THREE.MathUtils.clamp(w.velocity, -3, 3) * 0.05;
    // A jolt when a falling section hits the ground
    const since = (performance.now() - worldImpact.at) / 1000;
    if (!w.reduceMotion && since < 0.45) {
      const amp = (1 - since / 0.45) ** 2 * 0.12 * worldImpact.strength;
      tmp.pos.x += Math.sin(since * 70) * amp;
      tmp.pos.z += Math.cos(since * 55) * amp * 0.6;
    }
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

// ── Atmosphere: room fog → open air → (light mode) day sky ──────────────────

function Atmosphere({ world }: { world: MutableRefObject<WorldState> }) {
  const scene = useThree((s) => s.scene);
  const c = useMemo(
    () => ({ room: new THREE.Color(BG), night: new THREE.Color("#0b1626"), day: new THREE.Color("#c9d8e4"), mix: new THREE.Color() }),
    []
  );
  useFrame(() => {
    const { inFall, day } = fallBlend(world.current);
    c.mix.copy(c.room).lerp(c.night, inFall).lerp(c.day, day);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(c.mix);
      // Thin haze over the city, so its depth reads without washing it out
      scene.fog.density = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.055, 0.0065, inFall), 0.0045, day);
    }
    if (scene.background instanceof THREE.Color) scene.background.copy(c.mix);
  });
  return null;
}

// ── Floor ──────────────────────────────────────────────────────────────────

/** The corridor's wet concrete (the room beyond the door has its own glass floor). */
function Floor() {
  const depth = 12.5 + DOOR.wall;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12.5 - depth / 2]}>
      <planeGeometry args={[18, depth]} />
      <meshStandardMaterial color="#0d1415" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

// ── Scroll inputs for the fall ─────────────────────────────────────────────

/**
 * How far the page has scrolled past the hero, in viewports. Reads the Lenis scroll value (a
 * number, no layout); the hero's end and the page length are measured only when sizes change.
 */
function useFallInputs(world: MutableRefObject<WorldState>) {
  useEffect(() => {
    let heroEnd = Infinity;
    let vh = window.innerHeight;
    let lastY = 0;
    let lastT = performance.now();
    const scrollY = () => lenisRef.current?.scroll ?? window.scrollY;
    const update = () => {
      const y = scrollY();
      const now = performance.now();
      const v = (y - lastY) / vh / (Math.max(16, now - lastT) / 1000);
      lastY = y;
      lastT = now;
      world.current.velocity = THREE.MathUtils.lerp(world.current.velocity, v, 0.35);
      world.current.fall = Math.max(0, (y - heroEnd) / vh);
      world.current.wake(900);
    };
    const measure = () => {
      vh = window.innerHeight;
      const track = document.querySelector<HTMLElement>("#home > div");
      if (track) heroEnd = track.getBoundingClientRect().top + scrollY() + track.offsetHeight - vh;
      const pageEnd = document.documentElement.scrollHeight - vh;
      world.current.fallMax = Math.max(1, (pageEnd - heroEnd) / vh);
      update();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", update, { passive: true });
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
    };
  }, [world]);
}

// ── The world ──────────────────────────────────────────────────────────────

export interface HeroWorldProps {
  /** Scroll progress through the pinned hero */
  progress: MotionValue<number>;
  /** The boot screen has lifted: start the intro */
  revealed: boolean;
  portrait: boolean;
  /** Light mode gets a daytime sky for the fall */
  mode: "night" | "day";
  reduceMotion: boolean;
  colors: PaletteColors;
  onReady: () => void;
  onStage: (stage: IntroStage) => void;
}

/**
 * The site's single, page-wide 3D world, fixed behind the page. The hero (keyboard, door, room,
 * glass floor) plays on the hero's pinned scroll; past it, the page scroll drives the free fall
 * down to the street.
 */
const HeroWorld = ({ progress, revealed, portrait, mode, reduceMotion, colors, onReady, onStage }: HeroWorldProps) => {
  const world = useRef<WorldState>({
    intro: -1,
    progress: progress.get(),
    pointer: new THREE.Vector2(),
    portrait,
    reduceMotion,
    busyUntil: 0,
    wake: () => undefined,
    fall: 0,
    fallMax: 1,
    velocity: 0,
    mode,
  });
  world.current.portrait = portrait;
  world.current.reduceMotion = reduceMotion;
  world.current.mode = mode;
  useFallInputs(world);

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
  useEffect(() => world.current.wake(1500), [colors, mode]);

  // Nothing is drawn until every shader has compiled in the background: drawing earlier makes
  // the GPU driver compile them synchronously on the first frame and freezes the page for seconds
  const [compiled, setCompiled] = useState(false);
  const [lite, setLite] = useState(portrait);
  const neonA = colors.c1;
  const neonB = colors.c2;

  return (
    <Canvas
      frameloop={compiled ? "demand" : "never"}
      dpr={1}
      onCreated={({ gl, setDpr }) => {
        const low = isLowEndGpu(gl, portrait);
        setLite(low);
        if (!low) setDpr(Math.min(window.devicePixelRatio || 1, 1.25));
      }}
      camera={{ position: [0, 1.5, 7.4], fov: 40, near: 0.05, far: 420 }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={[BG]} />
      <fogExp2 attach="fog" args={[BG, 0.055]} />
      <ambientLight intensity={0.16} color="#5fa8a4" />
      <hemisphereLight args={["#2a5254", "#050808", 0.5]} />

      <Driver world={world} active />
      <Atmosphere world={world} />
      <Director world={world} revealed={revealed} onStage={onStage} />
      <Rig world={world} />

      {/* Everything waits for the city model and skies (behind the boot screen), then compiles */}
      <Suspense fallback={null}>
        <Floor />
        <Corridor world={world} neonA={neonA} neonB={neonB} />
        <Room neonA={neonA} neonB={neonB} />
        <GlassFloor world={world} neonA={neonA} count={lite ? 70 : 140} />
        <FallScene world={world} neonA={neonA} lite={lite} />
        <IntroKeyboard world={world} ramp={[colors.c1, colors.c2, colors.c3]} />
        <FloatingKeys world={world} colors={colors} />
        <Precompile onCompiled={() => setCompiled(true)} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
};

export default HeroWorld;
