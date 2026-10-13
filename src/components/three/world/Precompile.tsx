import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";

/**
 * Compiles every shader in the scene up front, hidden objects included (the intro keyboard and
 * the floating keys start hidden, so the renderer would otherwise compile them on the frame they
 * appear and the animation would stall), then draws them once to upload their geometry. Uses the async path where the GPU driver supports it,
 * so the boot screen keeps animating meanwhile. Reports once a frame has been drawn afterwards.
 */
export function Precompile({ onCompiled, onReady }: { onCompiled?: () => void; onReady?: () => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const ready = useRef(onReady);
  ready.current = onReady;
  const compiledRef = useRef(onCompiled);
  compiledRef.current = onCompiled;

  useEffect(() => {
    let cancelled = false;
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    // compileAsync gathers the materials synchronously, so the objects can be hidden again now
    const compiled = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
    hidden.forEach((o) => (o.visible = false));
    compiled
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        // One throwaway render with everything shown, so geometry and textures are on the GPU
        // too (the boot screen still covers the canvas)
        hidden.forEach((o) => (o.visible = true));
        gl.render(scene, camera);
        hidden.forEach((o) => (o.visible = false));
        compiledRef.current?.();
        invalidate();
        requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && ready.current?.()));
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, invalidate]);

  return null;
}
