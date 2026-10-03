import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";

type Tone = "c1" | "c2" | "c3" | "c4" | "c5" | "neutral";

interface KeySpec {
  label: string;
  tone: Tone;
  /** Position as a fraction of the visible half-width / half-height */
  fx: number;
  fy: number;
  z: number;
  scale: number;
  /** Width in key units (1 = square key) */
  width?: number;
  /** Resting rotation: x tips the top face toward the camera */
  rot: [number, number, number];
}

// Positions are where the key lands on screen (fractions of the half-width / half-height),
// whatever its depth. Desktop: around the edges and corners, clear of the name and copy.
const WIDE: KeySpec[] = [
  { label: "N", tone: "c1", fx: -0.87, fy: 0.6, z: -0.4, scale: 1.0, rot: [0.95, 0.35, 0.2] },
  { label: "esc", tone: "neutral", fx: -0.5, fy: 0.75, z: -1.8, scale: 0.6, rot: [1.05, -0.25, -0.18] },
  { label: "R", tone: "c2", fx: 0.87, fy: 0.58, z: -0.3, scale: 0.98, rot: [0.9, -0.4, -0.22] },
  { label: "</>", tone: "neutral", fx: 0.49, fy: 0.75, z: -2, scale: 0.62, rot: [1.1, 0.3, 0.15] },
  { label: "{ }", tone: "c3", fx: -0.79, fy: -0.28, z: 0.5, scale: 0.88, rot: [0.75, 0.45, -0.12] },
  { label: "enter", tone: "c4", fx: -0.58, fy: -0.64, z: -0.5, scale: 0.74, width: 1.9, rot: [0.95, 0.25, -0.1] },
  { label: "TS", tone: "c5", fx: 0.8, fy: -0.22, z: 0.6, scale: 0.84, rot: [0.8, -0.5, 0.14] },
  { label: "JS", tone: "neutral", fx: 0.6, fy: -0.6, z: -0.8, scale: 0.68, rot: [1.0, -0.2, 0.25] },
  { label: "fn", tone: "neutral", fx: -0.94, fy: 0.04, z: -2.6, scale: 0.6, rot: [1.0, 0.6, 0.3] },
  { label: "git", tone: "neutral", fx: 0.94, fy: 0.1, z: -2.6, scale: 0.6, rot: [1.0, -0.6, -0.3] },
];

// Phones/tablets: a band of keys above the name
const COMPACT: KeySpec[] = [
  { label: "N", tone: "c1", fx: -0.6, fy: 0.02, z: 0, scale: 1, rot: [0.95, 0.4, 0.2] },
  { label: "</>", tone: "neutral", fx: 0.02, fy: 0.27, z: -1.2, scale: 0.72, rot: [1.05, -0.2, -0.1] },
  { label: "R", tone: "c2", fx: 0.61, fy: 0.0, z: 0.1, scale: 1, rot: [0.9, -0.45, -0.22] },
  { label: "{ }", tone: "c3", fx: -0.19, fy: -0.52, z: 0.5, scale: 0.7, rot: [0.8, 0.3, -0.15] },
  { label: "enter", tone: "c4", fx: 0.31, fy: -0.51, z: 0.2, scale: 0.6, width: 1.9, rot: [0.95, -0.2, 0.12] },
  { label: "JS", tone: "neutral", fx: -0.8, fy: 0.34, z: -1.6, scale: 0.62, rot: [1.0, 0.5, 0.3] },
  { label: "TS", tone: "c5", fx: 0.8, fy: 0.34, z: -1.6, scale: 0.62, rot: [1.0, -0.5, -0.3] },
];

const DEPTH = 0.56;
const WIDE_Z = 10;
const COMPACT_Z = 6.5;

// ── Helpers ────────────────────────────────────────────────────────────────

const luminance = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

function keyColors(tone: Tone, colors: PaletteColors) {
  const dark = luminance(colors.background) < 0.4;
  if (tone === "neutral") {
    const face = new THREE.Color(colors.background).lerp(new THREE.Color(colors.foreground), dark ? 0.13 : 0.05);
    return { face: `#${face.getHexString()}`, label: colors.foreground, accent: colors.c1 };
  }
  const face = colors[tone];
  const label = luminance(face) > 0.42 ? (dark ? colors.background : "#0b1220") : "#ffffff";
  return { face, label, accent: null };
}

function displayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  return family || "system-ui, sans-serif";
}

/** Canvas texture with the key's legend, drawn in the active theme's display font. */
function useLabelTexture(label: string, width: number, color: string, accent: string | null) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.height = 256;
    canvas.width = Math.round(256 * ((width - 0.3) / 0.62));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, [width]);

  useEffect(() => {
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const size = label.length === 1 ? 150 : label.length <= 3 ? 104 : 82;
      const font = `700 ${size}px ${displayFont()}`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 6);
      if (accent) {
        // Small accent bar, like a home-row bump
        ctx.fillStyle = accent;
        ctx.fillRect(canvas.width / 2 - 22, canvas.height - 42, 44, 9);
      }
      texture.needsUpdate = true;
      return font;
    };
    const font = draw();
    if (font) document.fonts?.load(font).then(() => draw()).catch(() => undefined);
  }, [canvas, texture, label, color, accent]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// ── Pointer handling (window-level, so keys react even under the hero text) ───

interface PointerState {
  ndc: THREE.Vector2;
  inside: boolean;
  /** Set on tap/click; consumed by the raycaster on the next frame */
  tap: THREE.Vector2 | null;
}

interface KeyHandle {
  meshes: THREE.Object3D[];
  bump: () => void;
}

// ── A single keycap ────────────────────────────────────────────────────────

interface KeycapProps {
  spec: KeySpec;
  index: number;
  compact: boolean;
  colors: PaletteColors;
  hovered: MutableRefObject<number>;
  register: (index: number, handle: KeyHandle) => void;
  pointer: MutableRefObject<PointerState>;
}

function Keycap({ spec, index, compact, colors, hovered, register, pointer }: KeycapProps) {
  const width = spec.width ?? 1;
  const viewport = useThree((s) => s.viewport);
  // Push deeper keys outward so they still land at (fx, fy) on screen
  const cameraZ = compact ? COMPACT_Z : WIDE_Z;
  const spread = (cameraZ - spec.z) / cameraZ;
  const { face, label, accent } = keyColors(spec.tone, colors);
  // One material for both parts of the cap, eased to the new colour when the palette changes
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: face,
        roughness: 0.32,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.25,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const faceColor = useMemo(() => new THREE.Color(face), [face]);
  useEffect(() => () => material.dispose(), [material]);
  const labelTexture = useLabelTexture(spec.label, width, label, accent);

  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const press = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const lower = useRef<THREE.Mesh>(null);
  const upper = useRef<THREE.Mesh>(null);

  // Drop-in spring and interaction state
  const sim = useRef({
    born: performance.now() + (compact ? 250 : 450) + index * 90,
    drop: 7,
    vel: 0,
    press: 0,
    spin: 0,
    spinTarget: 0,
    phase: index * 1.7,
  });

  useEffect(() => {
    register(index, {
      meshes: [lower.current, upper.current].filter(Boolean) as THREE.Object3D[],
      bump: () => {
        sim.current.spinTarget += Math.PI * 2;
        sim.current.vel += 5;
      },
    });
  }, [index, register]);

  useFrame((state, rawDelta) => {
    const s = sim.current;
    // Frame-rate independent: big gaps between frames are integrated in small steps
    const delta = Math.min(rawDelta, 1.5);
    const t = state.clock.elapsedTime;
    material.color.lerp(faceColor, 1 - Math.exp(-4 * delta));
    if (!root.current || !tilt.current || !spin.current || !press.current || !top.current) return;

    // Drop in from above with a bouncy spring once this key's turn comes
    if (performance.now() >= s.born) {
      for (let left = delta; left > 0; left -= 1 / 120) {
        const h = Math.min(left, 1 / 120);
        s.vel += (-70 * s.drop - 9 * s.vel) * h;
        s.drop += s.vel * h;
      }
    }

    // Scatter outward as the hero scrolls away
    const scroll = Math.min(window.scrollY / (window.innerHeight * 0.9), 1.3);
    const outward = Math.sign(spec.fx || 1);

    const ptr = pointer.current.ndc;
    const depthFactor = 1 + spec.z * 0.18;
    const x = spec.fx * (viewport.width / 2) * spread + ptr.x * 0.18 * depthFactor + outward * scroll * 2.4;
    const y =
      spec.fy * (viewport.height / 2) * spread + Math.sin(t * 0.9 + s.phase) * 0.09 + ptr.y * 0.12 * depthFactor + scroll * 1.6 + s.drop;
    root.current.position.set(x, y, spec.z);

    // Gentle wobble, a lean toward the pointer, and a twirl while falling
    tilt.current.rotation.set(
      spec.rot[0] + Math.sin(t * 0.7 + s.phase) * 0.07 - ptr.y * 0.15 + scroll * 0.8,
      spec.rot[1] + Math.sin(t * 0.5 + s.phase) * 0.1 + ptr.x * 0.25,
      spec.rot[2] + s.drop * 0.12 + outward * scroll * 0.6
    );

    // Hover presses the key down; a tap makes it hop and twirl
    const target = hovered.current === index ? 1 : 0;
    s.press = THREE.MathUtils.damp(s.press, target, 16, delta);
    s.spin = THREE.MathUtils.damp(s.spin, s.spinTarget, 5, delta);
    top.current.position.y = -s.press * 0.13;
    spin.current.rotation.y = s.spin;
  });

  return (
    <group ref={root} scale={spec.scale}>
      <group ref={tilt} rotation={spec.rot}>
        <group ref={spin}>
          <group ref={press} position={[0, -DEPTH / 2, 0]}>
            {/* Skirt */}
            <RoundedBox
              ref={lower}
              args={[width, 0.34, 1]}
              radius={0.1}
              smoothness={4}
              position={[0, 0.17, 0]}
              material={material}
            />
            {/* Top, narrower like a sculpted keycap; sinks into the skirt when pressed */}
            <group ref={top}>
              <RoundedBox
                ref={upper}
                args={[width - 0.14, 0.24, 0.86]}
                radius={0.1}
                smoothness={4}
                position={[0, 0.42, 0]}
                material={material}
              />
              {/* Legend */}
              <mesh position={[0, DEPTH - 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width - 0.3, 0.62]} />
                <meshBasicMaterial map={labelTexture} transparent toneMapped={false} depthWrite={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

function Keys({ compact, colors }: { compact: boolean; colors: PaletteColors }) {
  const { camera, gl } = useThree();
  const specs = compact ? COMPACT : WIDE;
  const hovered = useRef(-1);
  const handles = useRef(new Map<number, KeyHandle>());
  const pointer = useRef<PointerState>({ ndc: new THREE.Vector2(), inside: false, tap: null });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const register = useMemo(() => (index: number, handle: KeyHandle) => handles.current.set(index, handle), []);

  useEffect(() => {
    const toNdc = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      return {
        inside,
        v: new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
      };
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
      const [first] = raycaster.intersectObjects(handle.meshes, false);
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

  return (
    <>
      {specs.map((spec, i) => (
        <Keycap
          key={`${compact}-${i}`}
          spec={spec}
          index={i}
          compact={compact}
          colors={colors}
          hovered={hovered}
          register={register}
          pointer={pointer}
        />
      ))}
    </>
  );
}

interface HeroSceneProps {
  /** Pause rendering when the hero is scrolled out of view */
  active?: boolean;
  /** Phone/tablet layout: a band of keys above the copy */
  compact?: boolean;
  colors: PaletteColors;
}

/** Hero 3D: chunky mechanical keycaps that drop in, float around the name and react to hover and taps. */
const HeroScene = ({ active = true, compact = false, colors }: HeroSceneProps) => (
  <Canvas
    frameloop={active ? "always" : "never"}
    dpr={[1, 1.75]}
    camera={{ position: [0, 0, compact ? COMPACT_Z : WIDE_Z], fov: 35 }}
    gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    style={{ background: "transparent", pointerEvents: "none" }}
  >
    <ambientLight intensity={0.7} />
    <directionalLight position={[3, 6, 6]} intensity={1.5} />
    <pointLight position={[-6, 2, 4]} intensity={30} color={colors.c1} />
    <pointLight position={[6, -2, 4]} intensity={24} color={colors.c2} />

    <Keys compact={compact} colors={colors} />

    {/* Studio lighting baked locally — no remote HDR fetch */}
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={4} color="#ffffff" position={[3, 4, 5]} scale={[6, 2, 1]} />
      <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[-4, 2, 3]} scale={3} />
      <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[0, -4, 2]} scale={[8, 1, 1]} />
    </Environment>
  </Canvas>
);

export default HeroScene;
