import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshDistortMaterial,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";
import { useTint } from "./useTint";

/** Eases the camera toward the pointer for a parallax feel. */
function Rig() {
  useFrame((state, delta) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.2, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.8, 3, delta);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Blob({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const tint = useTint<THREE.MeshPhysicalMaterial>(color);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.15;
  });
  return (
    <mesh ref={ref} scale={1.55}>
      <sphereGeometry args={[1, 128, 128]} />
      <MeshDistortMaterial
        ref={tint.ref as never}
        color={tint.initial}
        distort={0.42}
        speed={1.8}
        roughness={0.08}
        metalness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.05}
        iridescence={1}
        iridescenceIOR={1.4}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}

function OrbitRing({ ring, bead }: { ring: string; bead: string }) {
  const ref = useRef<THREE.Group>(null);
  const ringTint = useTint<THREE.MeshStandardMaterial>(ring, { emissive: true });
  const beadTint = useTint<THREE.MeshStandardMaterial>(bead, { emissive: true });
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.25;
  });
  return (
    <group rotation={[1.2, 0.3, 0]}>
      <group ref={ref}>
        <mesh>
          <torusGeometry args={[2.55, 0.035, 16, 160]} />
          <meshStandardMaterial ref={ringTint.ref} color={ringTint.initial} emissive={ringTint.initial} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        <mesh position={[2.55, 0, 0]}>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshStandardMaterial ref={beadTint.ref} color={beadTint.initial} emissive={beadTint.initial} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Shapes({ colors }: { colors: PaletteColors }) {
  const knot = useTint<THREE.MeshPhysicalMaterial>(colors.c2);
  const ico = useTint<THREE.MeshPhysicalMaterial>(colors.c3);
  const box = useTint<THREE.MeshPhysicalMaterial>(colors.c5);
  const octa = useTint<THREE.MeshPhysicalMaterial>(colors.c4);
  return (
    <>
      <Float speed={2.2} rotationIntensity={1.6} floatIntensity={1.8}>
        <mesh position={[1.95, 1.55, -0.6]} scale={0.4}>
          <torusKnotGeometry args={[1, 0.34, 180, 24]} />
          <meshPhysicalMaterial ref={knot.ref} color={knot.initial} roughness={0.15} metalness={0.6} clearcoat={1} />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={2} floatIntensity={2.2}>
        <mesh position={[-2.4, -1.25, 0.4]} scale={0.55}>
          <icosahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial ref={ico.ref} color={ico.initial} roughness={0.1} metalness={0.2} clearcoat={1} flatShading />
        </mesh>
      </Float>
      <Float speed={2.6} rotationIntensity={2.4} floatIntensity={1.4}>
        <RoundedBox args={[1, 1, 1]} radius={0.18} smoothness={4} position={[-2.1, 1.7, -1]} scale={0.5}>
          <meshPhysicalMaterial ref={box.ref} color={box.initial} roughness={0.2} metalness={0.3} clearcoat={1} />
        </RoundedBox>
      </Float>
      <Float speed={3} rotationIntensity={1} floatIntensity={2.4}>
        <mesh position={[2, -1.7, 0.8]} scale={0.32}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial ref={octa.ref} color={octa.initial} roughness={0.15} metalness={0.4} clearcoat={1} flatShading />
        </mesh>
      </Float>
    </>
  );
}

interface HeroSceneProps {
  /** Pause rendering when the hero is scrolled out of view */
  active?: boolean;
  compact?: boolean;
  /** Camera distance; larger pulls the scene back */
  distance?: number;
  colors: PaletteColors;
}

const HeroScene = ({ active = true, compact = false, distance, colors }: HeroSceneProps) => {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, distance ?? (compact ? 8.5 : 7)], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={30} color={colors.c2} />
      <pointLight position={[4, 2, 2]} intensity={25} color={colors.c3} />

      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
        <Blob color={colors.c1} />
      </Float>
      <OrbitRing ring={colors.c3} bead={colors.c4} />
      <Shapes colors={colors} />
      <Sparkles count={compact ? 40 : 80} scale={[9, 6, 4]} size={3} speed={0.4} color={colors.c1} />
      <Sparkles count={compact ? 25 : 50} scale={[9, 6, 4]} size={2.5} speed={0.3} color={colors.c3} />

      {/* Studio lighting baked locally — no remote HDR fetch */}
      <Environment resolution={256}>
        <Lightformer form="ring" intensity={3} color="#ffd6f0" position={[-4, 2, 3]} scale={3} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[3, 4, 4]} scale={[5, 2, 1]} />
        <Lightformer form="rect" intensity={3} color="#d6f6ff" position={[4, -2, -3]} scale={[3, 3, 1]} />
        <Lightformer form="circle" intensity={2} color="#e6dcff" position={[0, -5, 2]} scale={4} />
      </Environment>

      <Rig />
    </Canvas>
  );
};

export default HeroScene;
