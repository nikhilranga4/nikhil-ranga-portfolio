import { forwardRef, type ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const cache = new Map<string, THREE.BufferGeometry>();

/**
 * Rounded box geometry, shared between every mesh with the same size. three's RoundedBoxGeometry
 * is a subdivided box pushed round at the corners: far cheaper to build than drei's extruded
 * version, which mattered with ~70 of them (keycaps, door panels, furniture) built at start-up.
 */
export function roundedBox(width: number, height: number, depth: number, radius: number, segments = 3) {
  const key = `${width}|${height}|${depth}|${radius}|${segments}`;
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
    cache.set(key, geometry);
  }
  return geometry;
}

type MeshProps = Omit<ThreeElements["mesh"], "args">;

interface RBoxProps extends MeshProps {
  args: [number, number, number];
  radius?: number;
  /** Corner segments */
  smoothness?: number;
  children?: ReactNode;
}

/** Drop-in for drei's <RoundedBox> using the shared, cheap geometry above. */
export const RBox = forwardRef<THREE.Mesh, RBoxProps>(({ args: [w, h, d], radius = 0.05, smoothness = 3, children, ...props }, ref) => (
  <mesh ref={ref} geometry={roundedBox(w, h, d, radius, Math.min(smoothness, 3))} {...props}>
    {children}
  </mesh>
));
RBox.displayName = "RBox";
