import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, RoundedBox, Sparkles } from "@react-three/drei";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { PaletteColors, PaletteId } from "@/lib/palettes";
import { createScreen, type ScreenState } from "./screenTexture";
import { NAME_WORDS, PHASES, easeInOut, easeOut, easeOutBack, letterProgress, phase } from "./timeline";

type Vec3 = [number, number, number];

const FOV = 40;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const SCREEN = { w: 3.44, h: 2.15 };
const OK_GREEN = "#2ee59d";
const AMBER = "#ffb020";

// ── Layout ─────────────────────────────────────────────────────────────────
// Wide screens flow left → right; portrait screens flow top → bottom.

interface Layout {
  portrait: boolean;
  letterSize: number;
  client: { pos: Vec3; scale: number };
  server: Vec3;
  db: Vec3;
  desktop: Vec3;
  pipeA: Vec3[];
  pipeB: Vec3[];
  /** Overall bounds of the "network" shot, for camera fitting */
  bounds: { w: number; h: number; center: Vec3 };
  /** How far the camera drifts toward the desktop while deploying (0–1) */
  deployPan: number;
  ok: Vec3;
}

const WIDE: Layout = {
  portrait: false,
  letterSize: 1.25,
  client: { pos: [-5.3, 1.9, -0.6], scale: 0.4 },
  server: [-0.3, 0.1, 0],
  db: [1.5, -0.95, -0.9],
  desktop: [5.4, -0.15, 0],
  pipeA: [
    [-3.3, 1.75, -0.6],
    [-2.3, 2.2, -0.3],
    [-1.6, 1.4, 0],
    [-1.05, 0.55, 0],
  ],
  pipeB: [
    [0.55, 0.35, 0],
    [1.8, 1.1, 0.3],
    [2.9, 0.2, 0.3],
    [3.55, 0.1, 0],
  ],
  bounds: { w: 15.6, h: 5.6, center: [0.1, 0.4, 0] },
  deployPan: 0.22,
  ok: [-0.3, 1.65, 0.4],
};

const PORTRAIT: Layout = {
  portrait: true,
  letterSize: 1.05,
  client: { pos: [0, 5.1, -0.6], scale: 0.42 },
  server: [-0.55, 1.5, 0],
  db: [1.25, 0.45, -0.9],
  desktop: [0, -3.1, 0],
  pipeA: [
    [0, 4.15, -0.6],
    [0.7, 3.5, -0.3],
    [-0.1, 2.95, 0],
    [-0.5, 2.5, 0],
  ],
  pipeB: [
    [-0.55, 0.55, 0],
    [-1.4, -0.2, 0.3],
    [-0.6, -1.2, 0.3],
    [0, -1.75, 0],
  ],
  bounds: { w: 4.8, h: 12.4, center: [0, 0.9, 0] },
  deployPan: 0.06,
  ok: [1.35, 2.55, 0.4],
};

/** Camera distance that fits a w × h box at the given aspect ratio, with some margin. */
const fitZ = (w: number, h: number, aspect: number, margin = 1.12) =>
  Math.max(h / (2 * TAN), w / (2 * TAN * aspect)) * margin;

const lerp3 = (out: THREE.Vector3, a: Vec3 | THREE.Vector3, b: Vec3 | THREE.Vector3, t: number) => {
  const av = Array.isArray(a) ? a : [a.x, a.y, a.z];
  const bv = Array.isArray(b) ? b : [b.x, b.y, b.z];
  return out.set(av[0] + (bv[0] - av[0]) * t, av[1] + (bv[1] - av[1]) * t, av[2] + (bv[2] - av[2]) * t);
};

/** A material whose colour eases toward `hex` when the palette changes. */
function useEasedColor(material: THREE.Material & { color: THREE.Color }, hex: string) {
  const target = useMemo(() => new THREE.Color(hex), [hex]);
  useFrame((_, delta) => material.color.lerp(target, 1 - Math.exp(-4 * Math.min(delta, 0.5))));
  useEffect(() => () => material.dispose(), [material]);
}

// ── Shared progress (smoothed so wheel/touch jumps glide) ──────────────────

function useSmoothedProgress(progress: MotionValue<number>) {
  const value = useRef(progress.get());
  useFrame((_, delta) => {
    value.current = THREE.MathUtils.damp(value.current, progress.get(), 9, Math.min(delta, 0.5));
  });
  return value;
}

// ── The name in 3D ─────────────────────────────────────────────────────────

interface LetterInfo {
  geometry: THREE.BufferGeometry;
  rest: THREE.Vector3;
  index: number;
}

function buildLetters(font: Font, layout: Layout) {
  const size = layout.letterSize;
  const resolution = (font.data as { resolution: number }).resolution;
  const glyphs = (font.data as { glyphs: Record<string, { ha: number }> }).glyphs;
  const depth = size * 0.34;
  const pivotY = size * 0.36;
  const letters: LetterInfo[] = [];
  const lines = layout.portrait ? NAME_WORDS.map((w) => [w]) : [NAME_WORDS];
  const lineGap = size * 1.3;
  let index = 0;
  let maxWidth = 0;

  lines.forEach((words, row) => {
    const text = words.join(" ");
    const lineLetters: LetterInfo[] = [];
    let cursor = 0;
    for (const char of text) {
      const advance = ((glyphs[char]?.ha ?? resolution * 0.3) / resolution) * size;
      if (char !== " ") {
        const geometry = new TextGeometry(char, {
          font,
          size,
          depth,
          curveSegments: 5,
          bevelEnabled: true,
          bevelThickness: size * 0.05,
          bevelSize: size * 0.03,
          bevelSegments: 2,
        });
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const cx = (box.min.x + box.max.x) / 2;
        geometry.translate(-cx, -pivotY, -depth / 2);
        lineLetters.push({ geometry, rest: new THREE.Vector3(cursor + cx, pivotY - row * lineGap, 0), index: index++ });
      }
      cursor += advance;
    }
    lineLetters.forEach((l) => (l.rest.x -= cursor / 2));
    maxWidth = Math.max(maxWidth, cursor);
    letters.push(...lineLetters);
  });

  // Centre the block vertically
  const height = size + (lines.length - 1) * lineGap;
  const shiftY = ((lines.length - 1) * lineGap) / 2 - size * 0.36;
  letters.forEach((l) => (l.rest.y += shiftY));
  return { letters, width: maxWidth, height };
}

function Letter({ info, color, smoothed }: { info: LetterInfo; color: string; smoothed: { current: number } }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.22,
        metalness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEasedColor(material, color);
  const side = info.index % 2 ? 1 : -1;

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = letterProgress(smoothed.current, info.index);
    m.visible = t > 0.001;
    if (!m.visible) return;
    const e = easeOut(t);
    const s = Math.max(0.001, easeOutBack(t));
    const bob = Math.sin(state.clock.elapsedTime * 1.4 + info.index * 0.7) * 0.05 * e;
    m.position.set(info.rest.x, info.rest.y - (1 - e) * 2.4 + bob, info.rest.z - (1 - e) * 4);
    m.rotation.set((1 - e) * -1.5, (1 - e) * 1.3 * side, (1 - e) * 0.4 * side);
    m.scale.setScalar(s);
  });

  return <mesh ref={mesh} geometry={info.geometry} material={material} visible={false} />;
}

function Name({ font, layout, colors, smoothed, onMeasured }: {
  font: Font;
  layout: Layout;
  colors: PaletteColors;
  smoothed: { current: number };
  onMeasured: (size: { w: number; h: number }) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const built = useMemo(() => buildLetters(font, layout), [font, layout]);
  useEffect(() => () => built.letters.forEach((l) => l.geometry.dispose()), [built]);
  useEffect(() => onMeasured({ w: built.width, h: built.height }), [built, onMeasured]);

  const ramp = useMemo(() => {
    const stops = [colors.c1, colors.c3, colors.c2].map((c) => new THREE.Color(c));
    const n = built.letters.length;
    return built.letters.map((_, i) => {
      const u = n > 1 ? i / (n - 1) : 0;
      const c = u < 0.5 ? stops[0].clone().lerp(stops[1], u * 2) : stops[1].clone().lerp(stops[2], (u - 0.5) * 2);
      return `#${c.getHexString()}`;
    });
  }, [built, colors.c1, colors.c2, colors.c3]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!group.current) return;
    // After the name is complete it shrinks into the "client" that sends the request
    const k = easeInOut(phase(smoothed.current, "request", 0, 0.5));
    group.current.position.copy(lerp3(tmp, [0, 0, 0], layout.client.pos, k));
    group.current.scale.setScalar(1 + (layout.client.scale - 1) * k);
  });

  return (
    <group ref={group}>
      {built.letters.map((info, i) => (
        <Letter key={`${layout.portrait}-${i}`} info={info} color={ramp[i]} smoothed={smoothed} />
      ))}
    </group>
  );
}

// ── Pipelines with data packets ────────────────────────────────────────────

const TUBE_SEGMENTS = 160;
const TUBE_RADIAL = 8;
const PACKETS = 9;

function Pipe({ points, color, grow, flow, direction, packetColor }: {
  points: Vec3[];
  color: string;
  grow: () => number;
  flow: () => number;
  direction: () => 1 | -1;
  packetColor: () => string;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  const core = useMemo(() => new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.045, TUBE_RADIAL, false), [curve]);
  const shell = useMemo(() => new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.13, TUBE_RADIAL, false), [curve]);
  useEffect(() => () => {
    core.dispose();
    shell.dispose();
  }, [core, shell]);

  const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const shellMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const packetMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), []);
  useEasedColor(coreMaterial, color);
  useEasedColor(shellMaterial, color);
  useEffect(() => () => packetMaterial.dispose(), [packetMaterial]);

  const packets = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const packetTarget = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const g = grow();
    const segments = Math.floor(TUBE_SEGMENTS * g);
    const count = segments * TUBE_RADIAL * 6;
    core.setDrawRange(0, count);
    shell.setDrawRange(0, count);

    const mesh = packets.current;
    if (!mesh) return;
    const f = flow();
    const dir = direction();
    packetMaterial.color.lerp(packetTarget.set(packetColor()), 1 - Math.exp(-6 * Math.min(delta, 0.5)));
    for (let k = 0; k < PACKETS; k++) {
      const u = (k / PACKETS + state.clock.elapsedTime * 0.32) % 1;
      const along = dir > 0 ? u : 1 - u;
      const visible = f > 0.01 && along <= g;
      if (visible) {
        curve.getPointAt(along, point);
        dummy.position.copy(point);
        // Packets swell in the middle of the pipe and shrink at its ends
        dummy.scale.setScalar(f * (0.55 + Math.sin(u * Math.PI) * 0.6));
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={core} material={coreMaterial} />
      <mesh geometry={shell} material={shellMaterial} />
      <instancedMesh ref={packets} args={[undefined, undefined, PACKETS]} material={packetMaterial} frustumCulled={false}>
        <sphereGeometry args={[0.1, 12, 12]} />
      </instancedMesh>
    </group>
  );
}

// ── Server rack, database and the "200 OK" response ────────────────────────

const LEDS_PER_UNIT = 6;
const UNITS = 3;

function Server({ position, colors, smoothed }: { position: Vec3; colors: PaletteColors; smoothed: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const leds = useRef<THREE.InstancedMesh>(null);
  const body = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#1d2433", metalness: 0.7, roughness: 0.32, clearcoat: 0.6 }),
    []
  );
  const trim = useMemo(() => new THREE.MeshBasicMaterial({ color: colors.c1, toneMapped: false }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEasedColor(trim, colors.c1);
  useEffect(() => () => body.dispose(), [body]);
  const ledMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => () => ledMaterial.dispose(), [ledMaterial]);
  const amber = useMemo(() => new THREE.Color(AMBER), []);
  const green = useMemo(() => new THREE.Color(OK_GREEN), []);
  const off = useMemo(() => new THREE.Color("#2a3246"), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = leds.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let u = 0; u < UNITS; u++) {
      for (let j = 0; j < LEDS_PER_UNIT; j++) {
        dummy.position.set(0.25 + j * 0.15, (u - 1) * 0.58, 0.57);
        dummy.updateMatrix();
        mesh.setMatrixAt(u * LEDS_PER_UNIT + j, dummy.matrix);
        mesh.setColorAt(u * LEDS_PER_UNIT + j, off);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [off]);

  useFrame((state) => {
    const p = smoothed.current;
    const g = group.current;
    if (!g) return;
    const appear = easeOutBack(phase(p, "request", 0, 0.35));
    g.visible = appear > 0.001;
    g.scale.setScalar(Math.max(0.001, appear));
    g.rotation.y = -0.35 + (1 - appear) * 1.2 + Math.sin(state.clock.elapsedTime * 0.6) * 0.05;

    const mesh = leds.current;
    if (!mesh || !mesh.instanceColor) return;
    // Waiting: amber LEDs blink. Accepted: a green sweep runs across every LED
    const accept = phase(p, "respond", 0, 0.5);
    const receiving = phase(p, "request", 0.5, 0.9);
    const total = UNITS * LEDS_PER_UNIT;
    for (let i = 0; i < total; i++) {
      let color: THREE.Color = off;
      if (accept > i / total) color = green;
      else if (receiving > 0) {
        const blink = Math.sin(state.clock.elapsedTime * 9 + i * 1.7) > 0;
        color = blink ? amber : off;
      }
      mesh.setColorAt(i, tmp.copy(color));
    }
    mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group} position={position} visible={false}>
      {[-1, 0, 1].map((u) => (
        <group key={u} position={[0, u * 0.58, 0]}>
          <RoundedBox args={[1.9, 0.5, 1.1]} radius={0.06} smoothness={3} material={body} />
          {/* drive bays */}
          {[0, 1, 2].map((b) => (
            <mesh key={b} position={[-0.62 + b * 0.24, 0, 0.56]} material={trim}>
              <boxGeometry args={[0.16, 0.05, 0.01]} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={leds} args={[undefined, undefined, UNITS * LEDS_PER_UNIT]} material={ledMaterial}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
      </instancedMesh>
    </group>
  );
}

function Database({ position, colors, smoothed }: { position: Vec3; colors: PaletteColors; smoothed: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const shell = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: colors.c3, metalness: 0.2, roughness: 0.25, clearcoat: 1 }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: colors.c1, toneMapped: false }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEasedColor(shell, colors.c3);
  useEasedColor(ring, colors.c1);
  const rings = useRef<THREE.Group>(null);

  useFrame((state) => {
    const p = smoothed.current;
    const g = group.current;
    if (!g) return;
    const appear = easeOutBack(phase(p, "request", 0.2, 0.5));
    g.visible = appear > 0.001;
    g.scale.setScalar(Math.max(0.001, appear));
    // Rings pulse while the database answers
    const busy = Math.min(phase(p, "respond", 0, 0.3), 1 - phase(p, "deploy", 0.2, 0.5));
    if (rings.current) {
      rings.current.children.forEach((child, i) => {
        const pulse = 1 + busy * 0.12 * Math.max(0, Math.sin(state.clock.elapsedTime * 6 - i * 1.2));
        child.scale.set(pulse, pulse, 1);
      });
    }
  });

  return (
    <group ref={group} position={position} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.4 - 0.4, 0]} material={shell}>
          <cylinderGeometry args={[0.55, 0.55, 0.3, 40]} />
        </mesh>
      ))}
      <group ref={rings}>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, i * 0.4 - 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={ring}>
            <torusGeometry args={[0.56, 0.025, 8, 48]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function OkBadge({ font, position, smoothed }: { font: Font; position: Vec3; smoothed: { current: number } }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new TextGeometry("200 OK", {
      font,
      size: 0.42,
      depth: 0.12,
      curveSegments: 4,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    g.center();
    return g;
  }, [font]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: OK_GREEN, emissive: OK_GREEN, emissiveIntensity: 0.6, roughness: 0.3 }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const p = smoothed.current;
    const s = easeOutBack(phase(p, "respond", 0.25, 0.6)) * (1 - phase(p, "deploy", 0.5, 0.9));
    m.visible = s > 0.001;
    m.scale.setScalar(Math.max(0.001, s));
    m.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.06;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} position={position} visible={false} />;
}

// ── Desktop ────────────────────────────────────────────────────────────────

function Desktop({ position, colors, smoothed }: { position: Vec3; colors: PaletteColors; smoothed: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const screen = useMemo(() => createScreen(), []);
  useEffect(() => () => screen.texture.dispose(), [screen]);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const glow = useRef<THREE.PointLight>(null);
  const body = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#1b202b", metalness: 0.8, roughness: 0.28, clearcoat: 0.7 }),
    []
  );
  useEffect(() => () => body.dispose(), [body]);

  // Repaint the screen when the theme (colours / font) changes
  useEffect(() => {
    screen.draw(currentState(smoothed.current), colors, true);
    document.fonts?.ready.then(() => screen.draw(currentState(smoothed.current), colorsRef.current, true)).catch(() => undefined);
  }, [colors, screen, smoothed]);

  useFrame(() => {
    const p = smoothed.current;
    const g = group.current;
    if (!g) return;
    const appear = easeOutBack(phase(p, "deploy", 0, 0.25));
    g.visible = appear > 0.001;
    g.scale.setScalar(Math.max(0.001, appear));
    screen.draw(currentState(p), colorsRef.current);
    if (glow.current) glow.current.intensity = 8 * phase(p, "deploy", 0.45, 0.9);
  });

  return (
    <>
      {/* Kept outside the hidden group: a light appearing later would force every shader to recompile */}
      <pointLight ref={glow} position={[position[0], position[1], position[2] + 1.6]} intensity={0} distance={6} color={colors.c1} />
      <group ref={group} position={position} visible={false}>
      <RoundedBox args={[SCREEN.w + 0.26, SCREEN.h + 0.22, 0.16]} radius={0.08} smoothness={3} material={body} />
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -SCREEN.h / 2 - 0.5, -0.12]} material={body}>
        <boxGeometry args={[0.3, 0.9, 0.12]} />
      </mesh>
      <RoundedBox args={[1.5, 0.08, 0.75]} radius={0.03} smoothness={2} position={[0, -SCREEN.h / 2 - 0.95, -0.1]} material={body} />
      <RoundedBox args={[2.7, 0.08, 0.8]} radius={0.03} smoothness={2} position={[0, -SCREEN.h / 2 - 0.95, 1.05]} material={body} />
      </group>
    </>
  );
}

function currentState(p: number): ScreenState {
  const boot = phase(p, "deploy", 0.45, 0.92);
  if (boot <= 0) return { kind: "off" };
  if (boot < 1) return { kind: "boot", progress: boot };
  return { kind: "site" };
}

// ── Camera choreography ────────────────────────────────────────────────────

function CameraRig({ layout, nameSize, smoothed }: {
  layout: Layout;
  nameSize: { w: number; h: number };
  smoothed: { current: number };
}) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  const shots = useMemo(() => {
    const nameZ = fitZ(nameSize.w, nameSize.h, aspect, 1.3);
    const { bounds, desktop } = layout;
    const overZ = fitZ(bounds.w, bounds.h, aspect);
    const screenCenter: Vec3 = [desktop[0], desktop[1], desktop[2] + 0.09];
    // Wide screens: close enough that the monitor covers the viewport. Portrait: stop with the
    // whole monitor in view (covering would crop it to a sliver) and let the stage dissolve
    const fillZ = layout.portrait
      ? (SCREEN.w / (2 * TAN * aspect)) * 1.04
      : Math.min(SCREEN.h / (2 * TAN), SCREEN.w / (2 * TAN * aspect)) * 0.97;
    const towardDesk = (t: number) => bounds.center.map((c, i) => c + (desktop[i] - c) * t) as Vec3;
    return {
      name: { pos: [0, 0, nameZ] as Vec3, look: [0, 0, 0] as Vec3 },
      over: { pos: [bounds.center[0], bounds.center[1], overZ] as Vec3, look: bounds.center },
      deploy: {
        pos: [...towardDesk(layout.deployPan).slice(0, 2), overZ * 0.93] as Vec3,
        look: towardDesk(layout.deployPan),
      },
      enter: { pos: [screenCenter[0], screenCenter[1], screenCenter[2] + fillZ] as Vec3, look: screenCenter },
    };
  }, [aspect, layout, nameSize]);

  useFrame((state) => {
    const p = smoothed.current;
    const k1 = easeInOut(phase(p, "request", 0, 0.55));
    const k2 = easeInOut(phase(p, "deploy", 0, 0.7));
    const k3 = easeInOut(phase(p, "enter", 0, 0.9));
    lerp3(a, shots.name.pos, shots.over.pos, k1);
    lerp3(b, a, shots.deploy.pos, k2);
    lerp3(pos, b, shots.enter.pos, k3);
    lerp3(a, shots.name.look, shots.over.look, k1);
    lerp3(b, a, shots.deploy.look, k2);
    lerp3(look, b, shots.enter.look, k3);
    // A little parallax from the pointer, fading out as we fly into the screen
    const sway = 1 - k3;
    pos.x += state.pointer.x * 0.35 * sway;
    pos.y += state.pointer.y * 0.25 * sway;
    state.camera.position.copy(pos);
    state.camera.lookAt(look);
  });
  return null;
}

// ── Scene root ─────────────────────────────────────────────────────────────

function useIntroFont(palette: PaletteId) {
  const [font, setFont] = useState<Font | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new FontLoader();
    const load = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    load(`/fonts/intro-${palette}.json`)
      .catch(() => load("/fonts/helvetiker_bold.typeface.json"))
      .then((json) => !cancelled && setFont(loader.parse(json)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [palette]);
  return font;
}

/**
 * Draw every object once into a tiny off-screen target so geometry buffers and textures are
 * uploaded to the GPU now, not the first time each object appears mid-scroll.
 */
function warmUp(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  const target = new THREE.WebGLRenderTarget(4, 4);
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene, camera);
  gl.setRenderTarget(previous);
  target.dispose();
  hidden.forEach((o) => (o.visible = false));
}

function Story({ progress, colors, palette, onReady }: Omit<IntroSceneProps, "active">) {
  const font = useIntroFont(palette);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const layout = aspect < 0.9 ? PORTRAIT : WIDE;
  const smoothed = useSmoothedProgress(progress);
  const [nameSize, setNameSize] = useState({ w: 10, h: 1.4 });
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const { gl, scene, camera } = useThree();

  // Compile every shader up front (including objects that only appear later in the story), so
  // nothing stalls mid-scroll. Uses parallel compilation where the GPU supports it.
  useEffect(() => {
    if (!font) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      gl.compileAsync(scene, camera)
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          warmUp(gl, scene, camera);
          requestAnimationFrame(() => onReadyRef.current());
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [font, gl, scene, camera]);

  const p = () => smoothed.current;

  return (
    <>
      <CameraRig layout={layout} nameSize={nameSize} smoothed={smoothed} />
      {font && <Name font={font} layout={layout} colors={colors} smoothed={smoothed} onMeasured={setNameSize} />}
      <Pipe
        points={layout.pipeA}
        color={colors.c1}
        grow={() => easeInOut(phase(p(), "request", 0.15, 0.6))}
        flow={() => Math.min(phase(p(), "request", 0.45, 0.65), 1 - phase(p(), "deploy", 0.3, 0.7))}
        direction={() => (p() < PHASES.respond[0] + 0.015 ? 1 : -1)}
        packetColor={() => (p() < PHASES.respond[0] + 0.015 ? colors.c1 : OK_GREEN)}
      />
      <Pipe
        points={layout.pipeB}
        color={colors.c2}
        grow={() => easeInOut(phase(p(), "deploy", 0.05, 0.45))}
        flow={() => Math.min(phase(p(), "deploy", 0.3, 0.45), 1 - phase(p(), "enter", 0.15, 0.45))}
        direction={() => 1}
        packetColor={() => colors.c2}
      />
      <Server position={layout.server} colors={colors} smoothed={smoothed} />
      <Database position={layout.db} colors={colors} smoothed={smoothed} />
      {font && <OkBadge font={font} position={layout.ok} smoothed={smoothed} />}
      <Desktop position={layout.desktop} colors={colors} smoothed={smoothed} />
    </>
  );
}

export interface IntroSceneProps {
  progress: MotionValue<number>;
  colors: PaletteColors;
  palette: PaletteId;
  /** Pause rendering while the intro is off-screen */
  active: boolean;
  /** Called once the first frame with the 3D name has been drawn */
  onReady: () => void;
}

/** The 3D story: name → pipeline → server & database → 200 OK → pipeline → desktop → fly in. */
const IntroScene = ({ progress, colors, palette, active, onReady }: IntroSceneProps) => {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, dpr]}
      camera={{ position: [0, 0, 12], fov: FOV, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <pointLight position={[-8, 3, 6]} intensity={40} color={colors.c1} />
      <pointLight position={[8, -2, 6]} intensity={32} color={colors.c2} />
      <Story progress={progress} colors={colors} palette={palette} onReady={onReady} />
      <Sparkles count={50} scale={[22, 14, 8]} size={2.4} speed={0.3} color={colors.c1} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[3, 5, 6]} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[-5, 2, 4]} scale={3} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, -5, 3]} scale={[10, 1, 1]} />
      </Environment>
    </Canvas>
  );
};

export default IntroScene;
