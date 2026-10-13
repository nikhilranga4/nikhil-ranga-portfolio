import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import { Keycap, luminance, useKeyMaterial, useLabelTexture } from "./keycap";
import { INTRO, SCROLL, smooth, span, type WorldState } from "./timeline";

type Tone = "c1" | "c2" | "c3" | "c4" | "c5" | "neutral";

/** [fx, fy] as fractions of the half-width / half-height at the key's depth */
type Spot = [number, number];

interface KeySpec {
  label: string;
  tone: Tone;
  width?: number;
  z: number;
  scale: number;
  rot: [number, number, number];
  /** Around the name at the door */
  door: Spot;
  /** Clear of the copy in the room (it sits on the left on desktop, at the bottom on phones) */
  room: Spot;
}

const WIDE: KeySpec[] = [
  { label: "N", tone: "c1", z: -0.4, scale: 1, rot: [0.95, 0.35, 0.2], door: [-0.86, 0.6], room: [0.08, 0.8] },
  { label: "esc", tone: "neutral", z: -1.8, scale: 0.6, rot: [1.05, -0.25, -0.18], door: [-0.5, 0.78], room: [0.34, 0.9] },
  { label: "R", tone: "c2", z: -0.3, scale: 0.98, rot: [0.9, -0.4, -0.22], door: [0.86, 0.58], room: [0.86, 0.6] },
  { label: "</>", tone: "neutral", z: -2, scale: 0.62, rot: [1.1, 0.3, 0.15], door: [0.5, 0.78], room: [0.6, 0.86] },
  { label: "{ }", tone: "c3", z: 0.5, scale: 0.88, rot: [0.75, 0.45, -0.12], door: [-0.8, -0.5], room: [0.92, 0.02] },
  { label: "enter", tone: "c4", width: 1.9, z: -0.5, scale: 0.74, rot: [0.95, 0.25, -0.1], door: [-0.45, -0.76], room: [0.6, -0.72] },
  { label: "TS", tone: "c5", z: 0.6, scale: 0.84, rot: [0.8, -0.5, 0.14], door: [0.8, -0.48], room: [0.88, -0.4] },
  { label: "JS", tone: "neutral", z: -0.8, scale: 0.68, rot: [1.0, -0.2, 0.25], door: [0.48, -0.76], room: [0.3, -0.86] },
  { label: "fn", tone: "neutral", z: -2.6, scale: 0.6, rot: [1.0, 0.6, 0.3], door: [-0.95, 0.24], room: [0.05, -0.62] },
  { label: "git", tone: "neutral", z: -2.6, scale: 0.6, rot: [1.0, -0.6, -0.3], door: [0.95, 0.26], room: [0.74, 0.3] },
];

// Phones: around the door, then in a band above the copy
const COMPACT: KeySpec[] = [
  { label: "N", tone: "c1", z: 0, scale: 1, rot: [0.95, 0.4, 0.2], door: [-0.74, 0.74], room: [-0.66, 0.7] },
  { label: "</>", tone: "neutral", z: -1.2, scale: 0.72, rot: [1.05, -0.2, -0.1], door: [-0.34, 0.9], room: [-0.1, 0.88] },
  { label: "R", tone: "c2", z: 0.1, scale: 1, rot: [0.9, -0.45, -0.22], door: [0.74, 0.72], room: [0.66, 0.68] },
  { label: "{ }", tone: "c3", z: 0.5, scale: 0.7, rot: [0.8, 0.3, -0.15], door: [-0.84, 0.12], room: [-0.8, 0.36] },
  { label: "enter", tone: "c4", width: 1.9, z: 0.2, scale: 0.6, rot: [0.95, -0.2, 0.12], door: [0.78, 0.08], room: [0.74, 0.34] },
  { label: "JS", tone: "neutral", z: -1.6, scale: 0.62, rot: [1.0, 0.5, 0.3], door: [0.34, 0.9], room: [0.3, 0.86] },
  { label: "TS", tone: "c5", z: -1.6, scale: 0.62, rot: [1.0, -0.5, -0.3], door: [-0.84, -0.3], room: [-0.36, 0.56] },
];

/** The layout is designed as if the keys sat 10 units from the camera… */
const CAMERA_Z = 10;
/** …but they're drawn this much closer (and smaller), riding along with the camera */
const NEAR = 0.12;
/** Keys draw after everything else, over a freshly cleared depth buffer */
const KEY_ORDER = 1000;
/** The hero is always dark, whatever the site's light/dark mode */
const SCENE_BG = "#071214";
const SCENE_FG = "#e8f4f2";

function keyColors(tone: Tone, colors: PaletteColors) {
  if (tone === "neutral") {
    const face = new THREE.Color(SCENE_BG).lerp(new THREE.Color(SCENE_FG), 0.13);
    return { face: `#${face.getHexString()}`, label: SCENE_FG, accent: colors.c1 };
  }
  const face = colors[tone];
  return { face, label: luminance(face) > 0.42 ? SCENE_BG : "#ffffff", accent: null };
}

interface PointerState {
  ndc: THREE.Vector2;
  inside: boolean;
  tap: THREE.Vector2 | null;
}

interface KeyHandle {
  meshes: THREE.Object3D[];
  bump: () => void;
}

interface FloatingKeyProps {
  spec: KeySpec;
  index: number;
  colors: PaletteColors;
  world: MutableRefObject<WorldState>;
  hovered: MutableRefObject<number>;
  register: (index: number, handle: KeyHandle) => void;
}

function FloatingKey({ spec, index, colors, world, hovered, register }: FloatingKeyProps) {
  const width = spec.width ?? 1;
  const { face, label, accent } = keyColors(spec.tone, colors);
  const material = useKeyMaterial(face);
  const faceColor = useMemo(() => new THREE.Color(face), [face]);
  const legend = useLabelTexture(spec.label, width, label, accent);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const sim = useRef({ born: Infinity, drop: 7, vel: 0, press: 0, spin: 0, spinTarget: 0, phase: index * 1.7, time: 0 });

  useEffect(() => {
    // Draw in the transparent pass after the world (see DepthReset), keeping self-occlusion
    material.transparent = true;
    root.current?.traverse((o) => (o.renderOrder = KEY_ORDER));
  }, [material]);

  useEffect(() => {
    register(index, {
      meshes: root.current ? [root.current] : [],
      bump: () => {
        sim.current.spinTarget += Math.PI * 2;
        sim.current.vel += 5;
      },
    });
  }, [index, register]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const w = world.current;
    const s = sim.current;
    // Own clock, advanced by capped steps: rendering pauses when idle and must resume smoothly
    s.time += delta;
    const t = s.time;
    material.color.lerp(faceColor, 1 - Math.exp(-4 * delta));
    if (!root.current || !tilt.current || !spin.current || !top.current) return;

    // Drop in from above once the keyboard has launched its keys
    if (s.born === Infinity && w.intro >= INTRO.keysDrop) s.born = t + (w.intro === Infinity ? 0.2 : 0) + index * 0.09;
    if (t >= s.born) {
      for (let left = delta; left > 0; left -= 1 / 120) {
        const h = Math.min(left, 1 / 120);
        s.vel += (-70 * s.drop - 9 * s.vel) * h;
        s.drop += s.vel * h;
      }
    }
    root.current.visible = t >= s.born - 0.05;

    // Door layout → room layout, scattering outward while the camera flies through the door
    const blend = smooth(span(w.progress, [0.16, SCROLL.room - 0.04]));
    const scatter = Math.sin(blend * Math.PI);
    const fx = THREE.MathUtils.lerp(spec.door[0], spec.room[0], blend);
    const fy = THREE.MathUtils.lerp(spec.door[1], spec.room[1], blend);
    const dist = (CAMERA_Z - spec.z) * NEAR;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * (size.width / size.height);
    const len = Math.hypot(fx, fy) || 1;
    const ptr = w.pointer;
    const depth = 1 + spec.z * 0.18;
    // Bob, pointer parallax and the drop-in are authored in layout units (scaled by NEAR)
    const x = fx * halfW + (fx / len) * scatter * halfW * 0.9 + ptr.x * 0.18 * depth * NEAR;
    const y = fy * halfH + (fy / len) * scatter * halfH * 0.9 + (Math.sin(t * 0.9 + s.phase) * 0.09 + ptr.y * 0.12 * depth + s.drop) * NEAR;
    root.current.position.set(x, y, -dist);
    // Narrow screens: smaller caps so they frame the scene instead of covering it
    root.current.scale.setScalar(spec.scale * NEAR * (w.portrait ? 0.62 : 1));

    tilt.current.rotation.set(
      spec.rot[0] + Math.sin(t * 0.7 + s.phase) * 0.07 - ptr.y * 0.15 + scatter * 0.9,
      spec.rot[1] + Math.sin(t * 0.5 + s.phase) * 0.1 + ptr.x * 0.25,
      spec.rot[2] + s.drop * 0.12 + scatter * Math.sign(fx || 1) * 0.8
    );

    const target = hovered.current === index ? 1 : 0;
    s.press = THREE.MathUtils.damp(s.press, target, 16, delta);
    s.spin = THREE.MathUtils.damp(s.spin, s.spinTarget, 5, delta);
    top.current.position.y = -s.press * 0.13;
    spin.current.rotation.y = s.spin;
  });

  return (
    <group ref={root} scale={spec.scale * NEAR} visible={false}>
      <group ref={tilt} rotation={spec.rot}>
        <group ref={spin}>
          <Keycap width={width} material={material} legend={legend} topRef={top} />
        </group>
      </group>
    </group>
  );
}

function Keys({ world, colors }: { world: MutableRefObject<WorldState>; colors: PaletteColors }) {
  const { camera, gl } = useThree();
  const specs = world.current.portrait ? COMPACT : WIDE;
  const hovered = useRef(-1);
  const handles = useRef(new Map<number, KeyHandle>());
  const pointer = useRef<PointerState>({ ndc: new THREE.Vector2(), inside: false, tap: null });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const register = useMemo(() => (index: number, handle: KeyHandle) => handles.current.set(index, handle), []);

  // Window-level pointer handling, so keys react even under the hero copy
  useEffect(() => {
    const toNdc = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      return { inside, v: new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1) };
    };
    const onMove = (e: PointerEvent) => {
      const { inside, v } = toNdc(e);
      pointer.current.inside = inside;
      if (inside) pointer.current.ndc.copy(v);
    };
    const onDown = (e: PointerEvent) => {
      const { inside, v } = toNdc(e);
      if (inside) pointer.current.tap = v;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [gl]);

  const hit = (ndc: THREE.Vector2) => {
    raycaster.setFromCamera(ndc, camera);
    let best = -1;
    let bestDistance = Infinity;
    handles.current.forEach((handle, index) => {
      const [first] = raycaster.intersectObjects(handle.meshes, true);
      if (first && first.distance < bestDistance) {
        bestDistance = first.distance;
        best = index;
      }
    });
    return best;
  };

  useFrame(() => {
    const p = pointer.current;
    hovered.current = p.inside ? hit(p.ndc) : -1;
    if (p.tap) {
      const index = hit(p.tap);
      if (index >= 0) handles.current.get(index)?.bump();
      p.tap = null;
    }
  });

  // Ride along with the camera (the rig moves it earlier in the frame)
  const rig = useRef<THREE.Group>(null);
  useFrame(() => {
    rig.current?.position.copy(camera.position);
    rig.current?.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={rig}>
      <DepthReset />
      {specs.map((spec, i) => (
        <FloatingKey key={`${world.current.portrait}-${i}`} spec={spec} index={i} colors={colors} world={world} hovered={hovered} register={register} />
      ))}
    </group>
  );
}

/**
 * Clears the depth buffer just before the keys draw, so walls and the door frame never cut
 * through them as the camera passes — without a second render pass.
 */
function DepthReset() {
  const mesh = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -1, 0.001, 0, -1, 0, 0.001, -1], 3));
    const material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, transparent: true });
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false;
    m.renderOrder = KEY_ORDER - 1;
    m.onBeforeRender = (renderer) => renderer.clearDepth();
    return m;
  }, []);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh]
  );
  return <primitive object={mesh} />;
}

/** The chunky hero keycaps: they ride in front of the camera and draw over the world. */
export function FloatingKeys({ world, colors }: { world: MutableRefObject<WorldState>; colors: PaletteColors }) {
  return <Keys world={world} colors={colors} />;
}
