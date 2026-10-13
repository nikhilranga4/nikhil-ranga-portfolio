import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import { convoy } from "@/lib/convoy";
import { bumpWorld, worldImpact, type IntroStage } from "@/lib/hero-state";
import { afterScrollFrame, lenisRef } from "@/lib/lenis";
import { playSfx, setIntroActive } from "@/lib/music";
import { chime, enterThunk, keyClick, landThud, whoosh } from "@/lib/music/sfx";
import { Corridor, DOOR } from "./Corridor";
import { FloatingKeys } from "./FloatingKeys";
import { GlassWindow, WINDOW_CENTER } from "./GlassWindow";
import { IntroKeyboard, KEYBOARD_POS } from "./IntroKeyboard";
import { Precompile } from "./Precompile";
import { RoadScene } from "./RoadScene";
import { ROOM, Room } from "./Room";
import { cameraPose } from "./route";
import {
  INTRO,
  KEY_TIMES,
  NAME_ROWS,
  ROAD,
  ROAD_X0,
  SCROLL,
  STREET_Y,
  dropProgress,
  easeInOut,
  landedAt,
  fallBlend,
  hoverHeight,
  smooth,
  span,
  type WorldState,
} from "./timeline";


const BG = "#020809";
const THREE_ORIGIN = new THREE.Vector3();
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

// ── Render on demand, on the scroll's own frame ─────────────────────────────

const readScroll = () => lenisRef.current?.scroll ?? window.scrollY;

/**
 * The canvas only draws while the intro plays, the visitor scrolls or moves the pointer, or
 * something is still settling (a short grace period afterwards). Idle, it costs nothing.
 *
 * Frames are drawn right after the smooth scroller has moved the page, in the same animation
 * frame, so the trucks under the section cards never trail them by a frame. Without the smooth
 * scroller (reduced motion) a plain animation-frame loop does the same job.
 */
function Driver({ world, compiled }: { world: MutableRefObject<WorldState>; compiled: boolean }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const w = world.current;
    w.wake = (ms = 1600) => {
      w.busyUntil = Math.max(w.busyUntil, performance.now() + ms);
    };
    worldImpact.wake = () => w.wake(700);
    convoy.wake = (ms = 1600) => w.wake(ms);
    return () => {
      w.wake = () => undefined;
      worldImpact.wake = () => undefined;
      convoy.wake = () => undefined;
    };
  }, [world]);

  useEffect(() => {
    if (!compiled) return;
    const w = world.current;
    w.wake(1200);
    let last = -1;
    const tick = (time: number) => {
      if (time === last) return;
      last = time;
      const y = readScroll();
      if (y !== w.scroll) {
        w.scroll = y;
        w.fall = Math.max(0, (y - w.heroEnd) / w.vh);
        w.wake(900);
      }
      const intro = w.intro >= 0 && w.intro !== Infinity;
      if (!intro && performance.now() >= w.busyUntil) return;
      w.now = time;
      advance(time);
    };
    afterScrollFrame.add(tick);
    let raf = 0;
    const own = (time: number) => {
      if (!lenisRef.current) tick(time);
      raf = requestAnimationFrame(own);
    };
    raf = requestAnimationFrame(own);
    return () => {
      afterScrollFrame.delete(tick);
      cancelAnimationFrame(raf);
    };
  }, [world, compiled, advance]);
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
      // Stepping up to the window behind the desk
      tiltPos: new THREE.Vector3(0.1, 1.68, -4.7),
      exit: new THREE.Vector3(),
      hoverPos: new THREE.Vector3(),
      p0: new THREE.Vector3(),
      p1: new THREE.Vector3(),
      p2: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      qLook: new THREE.Quaternion(),
      // Looking straight down, the top of the screen pointing up the road (along its heading)
      qDown: new THREE.Quaternion(),
      down: new THREE.Vector3(0, -1, 0),
      up: new THREE.Vector3(),
      pose: { x: 0, z: 0, heading: 0 },
      landed: false,
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

    // After the room: up to the window, shake as it shatters, out through it, then down
    const tilt = easeInOut(span(w.progress, SCROLL.tilt));
    if (tilt > 0) {
      tmp.pos.lerp(tmp.tiltPos, tilt);
      tmp.look.lerp(WINDOW_CENTER, tilt);
    }
    const shake = Math.sin(Math.min(1, span(w.progress, [SCROLL.shatter[0], SCROLL.shatter[0] + 0.07])) * Math.PI) * 0.06;
    if (shake > 0) {
      tmp.pos.x += Math.sin(w.progress * 900) * shake;
      tmp.pos.y += Math.cos(w.progress * 1300) * shake;
    }
    // Then the drop: out through the window, straight down, braking into a hover above the road
    const dropP = w.reduceMotion ? (w.fall > 0.3 ? 1 : 0) : dropProgress(w);
    const hover = hoverHeight(size.width, size.height);
    const pose = cameraPose(w, tmp.pose);
    tmp.hoverPos.set(pose.x, STREET_Y + hover, pose.z);
    // The road turns at every section: the camera turns with it, so its heading stays screen-up
    tmp.up.set(Math.cos(pose.heading), 0, Math.sin(pose.heading));
    tmp.m.lookAt(THREE_ORIGIN, tmp.down, tmp.up);
    tmp.qDown.setFromRotationMatrix(tmp.m);
    let turn = 0;
    if (dropP > 0) {
      tmp.m.lookAt(tmp.pos, tmp.look, camera.up);
      tmp.qLook.setFromRotationMatrix(tmp.m);
      tmp.p0.copy(tmp.pos);
      // A step out past the frame...
      tmp.exit.set(WINDOW_CENTER.x, WINDOW_CENTER.y - 0.1, ROOM.back - 2.6);
      const OUT = 0.16;
      if (dropP < OUT) {
        tmp.pos.lerpVectors(tmp.p0, tmp.exit, smooth(dropP / OUT));
      } else {
        // ...then the fall: accelerating, then a firm brake (the halves meet at the same speed)
        const u = (dropP - OUT) / (1 - OUT);
        const S = 0.7;
        const g = u < S ? S * (u / S) ** 2 : S + (1 - S) * (1 - (1 - (u - S) / (1 - S)) ** 2);
        tmp.p1.set(tmp.exit.x, tmp.exit.y - 8, tmp.exit.z - 2);
        tmp.p2.set(ROAD_X0, STREET_Y + hover + 22, ROAD.z);
        const a = (1 - g) ** 3;
        const b = 3 * (1 - g) ** 2 * g;
        const c = 3 * (1 - g) * g * g;
        const d = g ** 3;
        tmp.pos.set(
          a * tmp.exit.x + b * tmp.p1.x + c * tmp.p2.x + d * tmp.hoverPos.x,
          a * tmp.exit.y + b * tmp.p1.y + c * tmp.p2.y + d * tmp.hoverPos.y,
          a * tmp.exit.z + b * tmp.p1.z + c * tmp.p2.z + d * tmp.hoverPos.z
        );
      }
      // Tip forward to look straight down as we leave the building
      turn = smooth((dropP - 0.08) / 0.5);
    }
    // Touchdown: a thud and a jolt, once per forward crossing
    if (dropP >= 0.985 && !tmp.landed) {
      tmp.landed = true;
      if (!w.reduceMotion) {
        playSfx(landThud);
        bumpWorld(0.9);
      }
    } else if (dropP < 0.8) tmp.landed = false;

    // Intro: start on the keyboard, pull back to the door after Enter
    if (!w.reduceMotion && w.intro !== Infinity) {
      const back = w.intro < 0 ? 0 : easeInOut(span(w.intro, INTRO.pullBack));
      tmp.pos.copy(tmp.introPos).lerp(tmp.doorPos, back);
      tmp.look.copy(tmp.introLook).lerp(tmp.doorLook, back);
    }
    if (w.reduceMotion && dropP < 1) {
      tmp.pos.copy(tmp.roomPos);
      tmp.look.copy(tmp.roomLook);
    }

    // Drift toward the pointer (capped step, so the first frame after an idle pause can't jump)
    const step = Math.min(delta, 1 / 20);
    w.velocity = THREE.MathUtils.damp(w.velocity, 0, 2.5, step);
    // Buffeted a little by the wind while falling
    if (!w.reduceMotion && dropP > 0 && dropP < 1) tmp.pos.z += THREE.MathUtils.clamp(w.velocity, -3, 3) * 0.06;
    // A jolt on touchdown
    const since = (performance.now() - worldImpact.at) / 1000;
    if (!w.reduceMotion && since < 0.45) {
      const amp = (1 - since / 0.45) ** 2 * 0.12 * worldImpact.strength;
      tmp.pos.x += Math.sin(since * 70) * amp;
      tmp.pos.z += Math.cos(since * 55) * amp * 0.6;
    }
    w.pointer.x = THREE.MathUtils.damp(w.pointer.x, pointerTarget.x, 3, step);
    w.pointer.y = THREE.MathUtils.damp(w.pointer.y, pointerTarget.y, 3, step);
    // Pointer parallax in the hero only: over the road the camera must stay exactly on its rails
    // (the section cards are mapped onto it)
    if (!w.reduceMotion && dropP < 1) {
      tmp.pos.x += w.pointer.x * 0.18 * (1 - dropP);
      tmp.pos.y += w.pointer.y * 0.1 * (1 - dropP);
    }
    cam.position.copy(tmp.pos);
    const introOn = !w.reduceMotion && w.intro !== Infinity;
    if (turn > 0 && !introOn) cam.quaternion.copy(tmp.qLook).slerp(tmp.qDown, turn);
    else cam.lookAt(tmp.look);
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

// ── Scroll inputs ──────────────────────────────────────────────────────────

/**
 * Sizes for the drop and the road: where the hero ends, how long its drop beat is, the viewport.
 * Measured only when sizes change; the scroll itself is read per frame by the Driver. Scroll
 * events only feed the wind (velocity) and wake the canvas.
 */
function useRoadInputs(world: MutableRefObject<WorldState>) {
  useEffect(() => {
    let lastY = readScroll();
    let lastT = performance.now();
    const onScroll = () => {
      const w = world.current;
      const y = readScroll();
      const now = performance.now();
      const v = (y - lastY) / w.vh / (Math.max(16, now - lastT) / 1000);
      lastY = y;
      lastT = now;
      w.velocity = THREE.MathUtils.lerp(w.velocity, v, 0.35);
      w.wake(900);
    };
    const measure = () => {
      const w = world.current;
      w.vw = window.innerWidth;
      w.vh = window.innerHeight;
      const track = document.querySelector<HTMLElement>("#home > div");
      if (track) {
        let top = 0;
        for (let e: HTMLElement | null = track; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop;
        const length = track.offsetHeight - w.vh;
        w.heroTop = top;
        w.heroLen = length;
        w.heroEnd = top + length;
        w.heroDropVh = ((SCROLL.drop[1] - SCROLL.drop[0]) * length) / w.vh;
      }
      w.scroll = readScroll();
      w.fall = Math.max(0, (w.scroll - w.heroEnd) / w.vh);
      w.wake(900);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, [world]);
}

// ── The fall plays itself ──────────────────────────────────────────────────

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Once the window shatters, the page glides on by itself: out of the window, down to the road, and
 * on until the first section's truck has driven in under the camera, so the fall and the first
 * arrival are one smooth, unbroken move (the visitor's scroll input is held for it).
 * Scrolling back up from the road does the reverse, back into the room. Only for scrolls the
 * visitor makes (wheel, touch, keys): navigation jumps pass straight through.
 */
function useAutoDrop(world: MutableRefObject<WorldState>) {
  useEffect(() => {
    let lastInput = -Infinity;
    let running = false;
    let lastY = readScroll();
    const mark = () => {
      lastInput = performance.now();
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"].includes(e.key)) mark();
    };
    const onScroll = () => {
      const w = world.current;
      const lenis = lenisRef.current;
      const y = readScroll();
      const dir = Math.sign(y - lastY);
      lastY = y;
      if (!lenis || running || w.reduceMotion || !dir || performance.now() - lastInput > 450) return;
      const at = (p: number) => w.heroTop + p * w.heroLen;
      const breakY = at(SCROLL.shatter[0]);
      const roomY = at(SCROLL.crack[0] - 0.02);
      // The end of the glide: the first card a third of the way down the screen, its cab above it
      const first = convoy.slots.get(0);
      const landY = Math.max(landedAt(w), first?.width ? first.top - w.vh * 0.32 : 0);
      let target: number | null = null;
      let duration = 0;
      if (dir > 0 && y >= breakY - 1 && y < landY - 4) {
        target = landY;
        duration = 1 + 3.4 * Math.min(1, (landY - y) / (landY - breakY));
      } else if (dir < 0 && y > breakY && y < landY - 4) {
        target = roomY;
        duration = 0.8 + 1.4 * Math.min(1, (y - roomY) / (landY - roomY));
      }
      if (target === null) return;
      running = true;
      lenis.scrollTo(target, {
        duration,
        easing: easeInOutSine,
        lock: true,
        force: true,
        onComplete: () => {
          running = false;
          lastY = readScroll();
        },
      });
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
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
 * glass floor) plays on the hero's pinned scroll; past it the camera drops to the road and hovers
 * over the convoy that carries the page's sections.
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
    scroll: 0,
    heroEnd: Infinity,
    heroTop: 0,
    heroLen: 1,
    heroDropVh: 0.6,
    vw: window.innerWidth,
    vh: window.innerHeight,
    now: 0,
    velocity: 0,
    mode,
  });
  world.current.portrait = portrait;
  world.current.reduceMotion = reduceMotion;
  world.current.mode = mode;
  useRoadInputs(world);
  useAutoDrop(world);

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
      frameloop="never"
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

      <Driver world={world} compiled={compiled} />
      <Atmosphere world={world} />
      <Director world={world} revealed={revealed} onStage={onStage} />
      <Rig world={world} />

      {/* Everything waits for the city model and skies (behind the boot screen), then compiles */}
      <Suspense fallback={null}>
        <Floor />
        <Corridor world={world} neonA={neonA} neonB={neonB} />
        <Room neonA={neonA} neonB={neonB} />
        <GlassWindow world={world} neonA={neonA} count={lite ? 60 : 110} />
        <RoadScene world={world} lite={lite} colors={colors} />
        <IntroKeyboard world={world} ramp={[colors.c1, colors.c2, colors.c3]} />
        <FloatingKeys world={world} colors={colors} />
        <Precompile onCompiled={() => setCompiled(true)} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
};

export default HeroWorld;
