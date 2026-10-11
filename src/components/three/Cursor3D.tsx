import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cursorState } from "@/lib/cursor-state";
import type { PaletteColors } from "@/lib/palettes";
import { useTint } from "./useTint";

const TRAIL = 12;
const RING_PX = 22; // ring radius in CSS pixels

/**
 * A glossy 3D ring + crystal core that chases the mouse, stretches with speed, grows over
 * interactive elements and leaves a fading comet trail.
 */
const Cursor3D = ({ colors }: { colors: PaletteColors }) => {
  const { viewport, size } = useThree();
  const root = useRef<THREE.Group>(null);
  const stretch = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<(THREE.Mesh | null)[]>([]);

  const ring = useTint<THREE.MeshPhysicalMaterial>(colors.c1, { emissive: true });
  const coreMat = useTint<THREE.MeshPhysicalMaterial>(colors.c3);
  const hoverColor = useMemo(() => new THREE.Color(colors.c2), [colors.c2]);
  const baseColor = useMemo(() => new THREE.Color(colors.c1), [colors.c1]);
  const trailColors = useMemo(
    () =>
      Array.from({ length: TRAIL }, (_, i) =>
        new THREE.Color(colors.c1).lerp(new THREE.Color(colors.c3), i / (TRAIL - 1))
      ),
    [colors.c1, colors.c3]
  );

  const state = useRef({
    pos: new THREE.Vector3(0, 0, 0),
    prev: new THREE.Vector3(0, 0, 0),
    trail: Array.from({ length: TRAIL }, () => new THREE.Vector3()),
    scale: 0,
    initialised: false,
  });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = state.current;
    const unit = viewport.width / size.width; // world units per CSS pixel
    const target = new THREE.Vector3(
      (cursorState.x - size.width / 2) * unit,
      (size.height / 2 - cursorState.y) * unit,
      0
    );

    if (!s.initialised && cursorState.active) {
      s.pos.copy(target);
      s.prev.copy(target);
      s.trail.forEach((p) => p.copy(target));
      s.initialised = true;
    }

    // Chase the pointer
    s.prev.copy(s.pos);
    s.pos.lerp(target, 1 - Math.exp(-22 * delta));
    const velocity = s.pos.clone().sub(s.prev).divideScalar(Math.max(delta, 1e-4) * unit * 1000);
    const speed = Math.min(velocity.length(), 3);

    const wanted = !cursorState.active ? 0 : cursorState.pressed ? 0.7 : cursorState.hovering ? 1.9 : 1;
    s.scale = THREE.MathUtils.damp(s.scale, wanted, 10, delta);

    if (root.current) {
      root.current.position.copy(s.pos);
      root.current.scale.setScalar(Math.max(s.scale, 0.0001) * RING_PX * unit);
    }
    if (stretch.current) {
      stretch.current.rotation.z = Math.atan2(velocity.y, velocity.x);
      stretch.current.scale.x = THREE.MathUtils.damp(stretch.current.scale.x, 1 + speed * 0.35, 12, delta);
      stretch.current.scale.y = THREE.MathUtils.damp(stretch.current.scale.y, 1 - speed * 0.15, 12, delta);
    }
    if (spin.current) {
      spin.current.rotation.x += delta * (cursorState.hovering ? 3 : 1.2);
      spin.current.rotation.y += delta * (cursorState.hovering ? 4 : 1.6);
    }
    if (core.current) {
      core.current.rotation.x -= delta * 2;
      core.current.rotation.z += delta * 1.4;
    }
    if (ring.ref.current) {
      ring.ref.current.emissive.lerp(cursorState.hovering ? hoverColor : baseColor, 1 - Math.exp(-8 * delta));
    }

    // Comet trail — each bead follows the one ahead of it
    s.trail.forEach((p, i) => {
      p.lerp(i === 0 ? s.pos : s.trail[i - 1], 1 - Math.exp(-(34 - i * 1.6) * delta));
      const mesh = trailRefs.current[i];
      if (!mesh) return;
      mesh.position.copy(p);
      const bead = (1 - i / TRAIL) * 7 * unit * Math.min(s.scale, 1) * (0.4 + speed * 0.6);
      mesh.scale.setScalar(Math.max(bead, 0.0001));
    });
  });

  return (
    <>
      <group ref={root}>
        <group ref={stretch}>
          <group ref={spin}>
            <mesh>
              <torusGeometry args={[1, 0.16, 24, 64]} />
              <meshPhysicalMaterial
                ref={ring.ref}
                color={ring.initial}
                emissive={ring.initial}
                emissiveIntensity={0.45}
                metalness={0.85}
                roughness={0.12}
                clearcoat={1}
                toneMapped={false}
              />
            </mesh>
          </group>
          <mesh ref={core} scale={0.42}>
            <icosahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              ref={coreMat.ref}
              color={coreMat.initial}
              metalness={0.3}
              roughness={0.05}
              clearcoat={1}
              iridescence={1}
              flatShading
            />
          </mesh>
        </group>
      </group>

      {trailColors.map((color, i) => (
        <mesh key={i} ref={(el) => (trailRefs.current[i] = el)}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.55 * (1 - i / TRAIL)} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
};

export default Cursor3D;
