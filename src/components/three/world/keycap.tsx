import { forwardRef, useEffect, useMemo } from "react";
import { RBox as RoundedBox } from "./geometry";
import * as THREE from "three";
import { plasticMatcap } from "./textures";

/** Height of a keycap from the bottom of its skirt to the top face (1 unit = one key's depth). */
export const KEY_DEPTH = 0.56;

export const luminance = (hex: string | THREE.Color) => {
  const c = hex instanceof THREE.Color ? hex : new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

function displayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  return family || "system-ui, sans-serif";
}

/** Canvas texture with a key's legend, drawn in the theme's display font (redrawn once it loads). */
export function useLabelTexture(label: string, width: number, color: string, accent: string | null = null) {
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

let matcap: THREE.Texture | null = null;
/** The shared plastic matcap (created on first use). */
export const sharedMatcap = () => (matcap ??= plasticMatcap());

/**
 * Glossy keycap plastic. A matcap carries the lighting, so keycaps cost no lights, no environment
 * map and look the same anywhere in the scene. Not fogged: they sit right in front of the camera.
 */
export function useKeyMaterial(color: string) {
  const material = useMemo(
    () => {
      return new THREE.MeshMatcapMaterial({ color, matcap: sharedMatcap(), fog: false });
    },
    // The colour is eased by the caller after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

interface KeycapProps {
  width?: number;
  material: THREE.Material;
  legend: THREE.Texture;
  /** Group holding the top of the cap, so callers can sink it when pressed */
  topRef?: React.Ref<THREE.Group>;
  /** Custom legend material (its colour tints the white legend texture) */
  legendMaterial?: THREE.Material;
}

/**
 * A sculpted mechanical keycap: a wide skirt and a narrower top with the legend. Its origin is
 * the middle of the cap, so it spins and tumbles around its own centre.
 */
export const Keycap = forwardRef<THREE.Group, KeycapProps>(({ width = 1, material, legend, topRef, legendMaterial }, ref) => (
  <group ref={ref}>
    <group position={[0, -KEY_DEPTH / 2, 0]}>
      <RoundedBox args={[width, 0.34, 1]} radius={0.1} smoothness={4} position={[0, 0.17, 0]} material={material} />
      <group ref={topRef}>
        <RoundedBox args={[width - 0.14, 0.24, 0.86]} radius={0.1} smoothness={4} position={[0, 0.42, 0]} material={material} />
        <mesh position={[0, KEY_DEPTH - 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={legendMaterial}>
          <planeGeometry args={[width - 0.3, 0.62]} />
          {!legendMaterial && <meshBasicMaterial map={legend} transparent toneMapped={false} depthWrite={false} />}
        </mesh>
      </group>
    </group>
  </group>
));
Keycap.displayName = "Keycap";
