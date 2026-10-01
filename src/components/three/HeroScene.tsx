import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Float, Lightformer, RoundedBox, Sparkles, Text3D } from "@react-three/drei";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import { useTint } from "./useTint";

const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

// ── Live code on the laptop screen ─────────────────────────────────────────

type TokenKind = "kw" | "var" | "key" | "str" | "bool" | "punc";
type Line = [TokenKind, string][];

const CODE: Line[] = [
  [["kw", "const "], ["var", "developer"], ["punc", " = {"]],
  [["punc", "  "], ["key", "name"], ["punc", ": "], ["str", '"Nikhil Ranga"'], ["punc", ","]],
  [["punc", "  "], ["key", "role"], ["punc", ": "], ["str", '"Full Stack Developer"'], ["punc", ","]],
  [["punc", "  "], ["key", "stack"], ["punc", ": ["], ["str", '"React"'], ["punc", ", "], ["str", '"TypeScript"'], ["punc", ","]],
  [["punc", "          "], ["str", '"Node.js"'], ["punc", ", "], ["str", '"Python"'], ["punc", "],"]],
  [["punc", "  "], ["key", "now"], ["punc", ": "], ["str", '"SimplifyTech In"'], ["punc", ","]],
  [["punc", "  "], ["key", "available"], ["punc", ": "], ["bool", "true"], ["punc", ","]],
  [["punc", "};"]],
  [],
  [["kw", "export default "], ["var", "developer"], ["punc", ";"]],
];
const TOTAL_CHARS = CODE.reduce((n, line) => n + line.reduce((m, [, t]) => m + t.length, 0) + 1, 0);

const W = 1024;
const H = 640;
const FONT = '600 34px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';

function drawEditor(ctx: CanvasRenderingContext2D, colors: PaletteColors, shown: number, blink: boolean) {
  const palette: Record<TokenKind, string> = {
    kw: colors.c2,
    var: colors.c1,
    key: colors.c3,
    str: colors.c4,
    bool: colors.c5,
    punc: "#c9d1e0",
  };

  // Window
  ctx.fillStyle = "#0e1530";
  ctx.fillRect(0, 0, W, H);
  // Title bar with traffic lights and a tab
  ctx.fillStyle = "#111831";
  ctx.fillRect(0, 0, W, 64);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(34 + i * 30, 32, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(140, 14, 230, 50);
  ctx.fillStyle = colors.c1;
  ctx.fillRect(140, 14, 230, 4);
  ctx.font = '22px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = "#e6ebf5";
  ctx.fillText("developer.tsx", 164, 48);

  // Code with line numbers, typed out up to `shown` characters
  ctx.font = FONT;
  const lineHeight = 48;
  const top = 112;
  let remaining = shown;
  let cursor: [number, number] | null = null;
  CODE.forEach((line, row) => {
    const y = top + row * lineHeight;
    ctx.fillStyle = "#3b4663";
    ctx.fillText(String(row + 1).padStart(2, " "), 22, y);
    let x = 96;
    for (const [kind, text] of line) {
      if (remaining <= 0) break;
      const part = text.slice(0, remaining);
      ctx.fillStyle = palette[kind];
      ctx.fillText(part, x, y);
      x += ctx.measureText(part).width;
      remaining -= part.length;
    }
    if (remaining > 0) remaining -= 1; // newline
    else if (!cursor) cursor = [x, y];
  });
  if (!cursor) cursor = [96, top + (CODE.length - 1) * lineHeight];
  if (blink) {
    ctx.fillStyle = colors.c1;
    ctx.fillRect(cursor[0] + 2, cursor[1] - 30, 16, 38);
  }

  // Status bar
  ctx.fillStyle = colors.c1;
  ctx.fillRect(0, H - 40, W, 40);
  ctx.font = '20px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = "#0b1020";
  ctx.fillText("● main   TypeScript React   UTF-8", 24, H - 13);
}

/** A canvas texture of a code editor that types itself out, loops, and follows the palette. */
function useCodeTexture(colors: PaletteColors, active: boolean) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, []);
  const state = useRef({ typed: 0, shown: -1, hold: 0, blink: true });
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  const redraw = (blink = true) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawEditor(ctx, colorsRef.current, Math.max(0, state.current.shown), blink);
    texture.needsUpdate = true;
  };

  // Redraw when the palette changes and once the monospace web font is ready
  useEffect(() => {
    redraw();
    document.fonts?.load(FONT).then(() => redraw()).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Time-based typing so the speed is the same at any frame rate
  useFrame((_, delta) => {
    if (!active) return;
    const s = state.current;
    if (s.typed < TOTAL_CHARS) {
      s.typed = Math.min(TOTAL_CHARS, s.typed + delta * 38);
    } else {
      s.hold += delta;
      if (s.hold > 3.5) {
        s.hold = 0;
        s.typed = 0;
      }
    }
    const shown = Math.floor(s.typed);
    const blink = Math.floor(performance.now() / 450) % 2 === 0;
    if (shown !== s.shown || blink !== s.blink) {
      s.shown = shown;
      s.blink = blink;
      redraw(blink);
    }
  });

  return texture;
}

/** Subtle keyboard pattern for the laptop deck. */
function useKeyboardTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#12161f";
      ctx.fillRect(0, 0, 512, 200);
      const cols = 14;
      const rows = 5;
      const gap = 6;
      const kw = (512 - gap * (cols + 1)) / cols;
      const kh = (200 - gap * (rows + 1)) / rows;
      ctx.fillStyle = "#262c3a";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Space bar spans six keys on the bottom row
          if (r === rows - 1 && c > 4 && c <= 9) continue;
          const w = r === rows - 1 && c === 4 ? kw * 6 + gap * 5 : kw;
          ctx.fillRect(gap + c * (kw + gap), gap + r * (kh + gap), w, kh);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/** Soft radial glow texture used under the laptop. */
function useGlowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
}

// ── Scene pieces ───────────────────────────────────────────────────────────

function Laptop({ colors, active, compact }: { colors: PaletteColors; active: boolean; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const screen = useCodeTexture(colors, active);
  const keys = useKeyboardTexture();
  const glow = useGlowTexture();
  const glowTint = useTint<THREE.MeshBasicMaterial>(colors.c1);
  const baseYaw = compact ? -0.2 : -0.42;

  useFrame((state, delta) => {
    if (!group.current) return;
    const { pointer, clock } = state;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, baseYaw + pointer.x * 0.25, 3, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.22 - pointer.y * 0.1, 3, delta);
    group.current.position.y = -0.75 + Math.sin(clock.elapsedTime * 1.1) * 0.06;
  });

  return (
    <group ref={group} rotation={[0.22, baseYaw, 0]} position={[0, -0.75, 0]}>
      {/* Glow on the "desk" */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0.1]}>
        <planeGeometry args={[6.5, 4.2]} />
        <meshBasicMaterial
          ref={glowTint.ref}
          color={glowTint.initial}
          map={glow}
          transparent
          opacity={0.45}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Base */}
      <RoundedBox args={[3.4, 0.12, 2.3]} radius={0.05} smoothness={4}>
        <meshPhysicalMaterial color="#2a303d" metalness={0.75} roughness={0.28} clearcoat={0.6} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.062, -0.28]}>
        <planeGeometry args={[3.0, 1.15]} />
        <meshStandardMaterial map={keys} roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.062, 0.72]}>
        <planeGeometry args={[1.15, 0.6]} />
        <meshStandardMaterial color="#343b4b" roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Lid, hinged at the back edge and tilted open */}
      <group position={[0, 0.06, -1.13]} rotation={[-0.26, 0, 0]}>
        <RoundedBox args={[3.4, 2.2, 0.08]} radius={0.05} smoothness={4} position={[0, 1.1, 0]}>
          <meshPhysicalMaterial color="#1c212c" metalness={0.8} roughness={0.25} clearcoat={0.8} />
        </RoundedBox>
        <mesh position={[0, 1.13, 0.045]}>
          <planeGeometry args={[3.18, 1.99]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.1, 1.2]} intensity={6} distance={5} color={colors.c3} />
      </group>
    </group>
  );
}

function Glyph({
  text,
  color,
  position,
  size = 0.42,
  speed = 2,
}: {
  text: string;
  color: string;
  position: [number, number, number];
  size?: number;
  speed?: number;
}) {
  const tint = useTint<THREE.MeshPhysicalMaterial>(color);
  return (
    <Float speed={speed} rotationIntensity={1.1} floatIntensity={1.4}>
      <group position={position}>
        <Center>
          <Text3D
            font={FONT_URL}
            size={size}
            height={0.14}
            curveSegments={6}
            bevelEnabled
            bevelSize={0.014}
            bevelThickness={0.02}
            bevelSegments={3}
          >
            {text}
            <meshPhysicalMaterial
              ref={tint.ref}
              color={tint.initial}
              roughness={0.18}
              metalness={0.25}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </Text3D>
        </Center>
      </group>
    </Float>
  );
}

function ReactAtom({ color, position }: { color: string; position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  // One shared material for rings + core so the whole atom recolours together
  const [material] = useState(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, toneMapped: false })
  );
  const target = useMemo(() => new THREE.Color(color), [color]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-4 * delta);
    material.color.lerp(target, t);
    material.emissive.lerp(target, t);
    if (!group.current) return;
    group.current.rotation.y += delta * 0.6;
    group.current.rotation.z += delta * 0.25;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={1.2}>
      <group ref={group} position={position} scale={0.62}>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle) => (
          <group key={angle} rotation={[0, 0, angle]}>
            <mesh material={material} scale={[1, 0.38, 1]}>
              <torusGeometry args={[0.9, 0.045, 16, 96]} />
            </mesh>
          </group>
        ))}
        <mesh material={material}>
          <sphereGeometry args={[0.2, 32, 32]} />
        </mesh>
      </group>
    </Float>
  );
}

/** Eases the camera toward the pointer for gentle parallax. */
function Rig() {
  useFrame((state, delta) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.6, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.3 + pointer.y * 0.4, 2.5, delta);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

interface HeroSceneProps {
  /** Pause rendering when the hero is scrolled out of view */
  active?: boolean;
  compact?: boolean;
  /** Camera distance; larger pulls the scene back */
  distance?: number;
  colors: PaletteColors;
}

/** Hero 3D: a laptop typing live code, floating extruded code symbols and a React atom. */
const HeroScene = ({ active = true, compact = false, distance, colors }: HeroSceneProps) => {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.3, distance ?? (compact ? 7.2 : 8)], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <pointLight position={[-4, 2, 3]} intensity={25} color={colors.c2} />
      <pointLight position={[4, -1, 3]} intensity={18} color={colors.c3} />

      <Laptop colors={colors} active={active} compact={compact} />

      <Suspense fallback={null}>
        <Glyph text="</>" color={colors.c1} position={[-2.35, 1.35, -0.3]} size={0.46} />
        <Glyph text="{ }" color={colors.c2} position={[2.35, 1.5, -0.6]} speed={1.7} />
        <Glyph text="=>" color={colors.c4} position={[-2.3, -1.35, 0.8]} speed={2.4} />
        {!compact && (
          <>
            <Glyph text="( )" color={colors.c5} position={[2.5, -1.25, 0.5]} size={0.38} speed={2.2} />
            <Glyph text="#" color={colors.c3} position={[-0.9, 2.25, -1.2]} size={0.36} speed={1.5} />
          </>
        )}
      </Suspense>
      <ReactAtom color={colors.c3} position={compact ? [2.1, 1.5, -0.6] : [0.95, 2.2, -1]} />

      <Sparkles count={compact ? 30 : 60} scale={[9, 6, 4]} size={2.6} speed={0.35} color={colors.c1} />
      <Sparkles count={compact ? 20 : 40} scale={[9, 6, 4]} size={2.2} speed={0.3} color={colors.c3} />

      {/* Studio lighting baked locally — no remote HDR fetch */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[3, 4, 4]} scale={[5, 2, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#dbeafe" position={[-4, 2, 3]} scale={3} />
        <Lightformer form="rect" intensity={2} color="#e0e7ff" position={[4, -2, -3]} scale={[3, 3, 1]} />
      </Environment>

      <Rig />
    </Canvas>
  );
};

export default HeroScene;
