import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Tintable = THREE.Material & { color: THREE.Color; emissive?: THREE.Color };

/**
 * Smoothly animates a material's colour (and optionally emissive) toward `hex` whenever it
 * changes, e.g. when the site palette switches. Pass `initial` as the material's `color` prop
 * so React never snaps it after mount.
 */
export function useTint<T extends Tintable>(hex: string, { emissive = false, speed = 4 } = {}) {
  const ref = useRef<T>(null);
  const [initial] = useState(hex);
  const target = useMemo(() => new THREE.Color(hex), [hex]);

  useFrame((_, delta) => {
    const material = ref.current;
    if (!material) return;
    const t = 1 - Math.exp(-speed * delta);
    material.color.lerp(target, t);
    if (emissive && material.emissive) material.emissive.lerp(target, t);
  });

  return { ref, initial };
}
