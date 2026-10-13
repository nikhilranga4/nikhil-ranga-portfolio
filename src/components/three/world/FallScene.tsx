import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sharedMatcap } from "./keycap";
import { FALL_PER_VH, fallBlend, fallCameraY, streetLevel, type WorldState } from "./timeline";
import { radialTexture, skyTexture, streetTexture, windowsTexture } from "./textures";

/** Small deterministic random for the city layout. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Wrap `v` into [-range/2, range/2) */
const wrap = (v: number, range: number) => ((((v + range / 2) % range) + range) % range) - range / 2;

interface Tower {
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
}

/**
 * A wide avenue running out from under the room: a front row of towers either side, a taller row
 * behind it, and a far skyline, so the fall has sky and depth rather than two walls of windows.
 */
function cityLayout(): Tower[] {
  const rand = rng(5);
  // The tower we fell from (the room hangs off its face), seen at the top of the screen
  const towers: Tower[] = [{ x: 0, z: 15.2, w: 30, d: 30, top: -0.4 }];
  for (const side of [-1, 1]) {
    for (let z = -12; z > -170; z -= 13 + rand() * 9) {
      towers.push({ x: side * (16 + rand() * 7), z, w: 6 + rand() * 4, d: 6 + rand() * 5, top: -10 + rand() * 40 });
    }
    for (let z = -30; z > -190; z -= 18 + rand() * 12) {
      towers.push({ x: side * (34 + rand() * 14), z, w: 9 + rand() * 6, d: 9 + rand() * 6, top: 10 + rand() * 55 });
    }
  }
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    const r = 150 + rand() * 90;
    towers.push({ x: Math.cos(a) * r * 0.9, z: Math.sin(a) * r, w: 10 + rand() * 14, d: 10 + rand() * 14, top: 10 + rand() * 70 });
  }
  return towers;
}

interface FallSceneProps {
  world: MutableRefObject<WorldState>;
  neonA: string;
  /** Fewer particles for phones / integrated GPUs */
  lite: boolean;
}

/**
 * Everything outside the building for the free fall: towers lining the avenue below, the street
 * we land on, glass debris and wind streaks around the camera, clouds, and a day sky. All of it
 * uses unlit materials and instancing (a handful of draw calls); night/day swap textures and
 * colours on the same materials, so a theme change never recompiles a shader.
 */
export function FallScene({ world, neonA, lite }: FallSceneProps) {
  const camera = useThree((s) => s.camera);
  const tex = useMemo(
    () => ({
      winNight: windowsTexture("night"),
      winDay: windowsTexture("day"),
      streetNight: streetTexture("night"),
      streetDay: streetTexture("day"),
      sky: skyTexture("day"),
      skyNight: skyTexture("night"),
      puff: radialTexture("rgba(255,255,255,0.85)", "rgba(255,255,255,0)"),
    }),
    []
  );
  useEffect(() => {
    tex.winNight.repeat.set(1, 6);
    tex.winDay.repeat.set(1, 6);
    for (const t of [tex.streetNight, tex.streetDay]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 5);
    }
    return () => Object.values(tex).forEach((t) => t.dispose());
  }, [tex]);

  const mats = useMemo(
    () => ({
      towers: new THREE.MeshBasicMaterial({ map: tex.winNight }),
      roofs: new THREE.MeshBasicMaterial({ color: "#0c1416" }),
      street: new THREE.MeshBasicMaterial({ map: tex.streetNight }),
      debris: new THREE.MeshMatcapMaterial({ matcap: sharedMatcap(), color: new THREE.Color(neonA).lerp(new THREE.Color("#d8f4f1"), 0.7), transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      wind: new THREE.LineBasicMaterial({ color: "#cdeeea", transparent: true, opacity: 0, depthWrite: false }),
      cloud: new THREE.SpriteMaterial({ map: tex.puff, color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }),
      sun: new THREE.SpriteMaterial({ map: tex.puff, color: "#fff1d2", transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }),
      sky: new THREE.MeshBasicMaterial({ map: tex.sky, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    }),
    [tex, neonA]
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const roofGeo = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  useEffect(() => () => roofGeo.dispose(), [roofGeo]);
  const shardGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.22, 0.02, 3), []);
  useEffect(
    () => () => {
      box.dispose();
      shardGeo.dispose();
    },
    [box, shardGeo]
  );

  const layout = useMemo(cityLayout, []);
  const debrisCount = lite ? 22 : 46;
  const windCount = lite ? 50 : 110;
  const debris = useMemo(() => {
    const rand = rng(31);
    // Around and below the camera; they fall faster than we do, shrinking away toward the street
    return Array.from({ length: debrisCount }, () => ({
      x: (rand() - 0.5) * 14,
      z: (rand() - 0.5) * 14,
      y: rand() * 22,
      speed: 0.5 + rand() * 0.6,
      spin: new THREE.Vector3((rand() - 0.5) * 3, (rand() - 0.5) * 3, (rand() - 0.5) * 3),
      scale: 0.5 + rand() * 1.4,
    }));
  }, [debrisCount]);
  const windSeeds = useMemo(() => {
    const rand = rng(43);
    return Array.from({ length: windCount }, () => ({ x: (rand() - 0.5) * 16, z: (rand() - 0.5) * 16, y: rand() * 22, len: 0.5 + rand() * 1.3 }));
  }, [windCount]);
  const windGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(windCount * 6), 3));
    return g;
  }, [windCount]);
  useEffect(() => () => windGeo.dispose(), [windGeo]);

  const root = useRef<THREE.Group>(null);
  const towers = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const street = useRef<THREE.Mesh>(null);
  const debrisMesh = useRef<THREE.InstancedMesh>(null);
  const near = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Sprite>(null);
  const sky = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const state = useRef({ street: NaN, mode: "" as string, travel: 0 });

  // Towers stand on the street, so they're rebuilt whenever the page length moves the street
  const placeTowers = (streetY: number) => {
    const mesh = towers.current;
    if (!mesh) return;
    layout.forEach((t, i) => {
      const height = t.top - streetY;
      dummy.position.set(t.x, streetY + height / 2, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.w, height, t.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  // Each tower a slightly different shade, so neighbours read as separate buildings. Set at
  // mount (not on the first fall frame) so the shader variant is part of the up-front compile.
  useLayoutEffect(() => {
    const mesh = towers.current;
    if (!mesh) return;
    const tint = new THREE.Color();
    layout.forEach((_, i) => mesh.setColorAt(i, tint.setScalar(0.6 + ((i * 37) % 11) / 18)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Flat roofs on top (seen from above, they read as roofs rather than more windows)
    const r = roofs.current;
    if (!r) return;
    layout.forEach((t, i) => {
      dummy.position.set(t.x, t.top + 0.03, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.w, 1, t.d);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
    });
    r.instanceMatrix.needsUpdate = true;
    r.computeBoundingSphere();
  }, [layout, dummy]);

  useFrame(() => {
    const w = world.current;
    const { inFall, day } = fallBlend(w);
    if (!root.current) return;
    root.current.visible = inFall > 0.001;
    if (!root.current.visible) return;
    const s = state.current;

    const streetY = streetLevel(w.fallMax);
    // (NaN on the first frame, so the towers are always placed once)
    if (!(Math.abs(streetY - s.street) <= 0.01)) {
      s.street = streetY;
      placeTowers(streetY);
      street.current?.position.setY(streetY);
    }

    // Night ↔ day: swap maps and tints on the same materials (no recompile)
    const mode = day > 0.5 ? "day" : "night";
    if (mode !== s.mode) {
      s.mode = mode;
      mats.towers.map = mode === "day" ? tex.winDay : tex.winNight;
      mats.roofs.color.set(mode === "day" ? "#a7b3ba" : "#0c1416");
      mats.street.map = mode === "day" ? tex.streetDay : tex.streetNight;
      mats.sky.map = mode === "day" ? tex.sky : tex.skyNight;
      mats.towers.needsUpdate = mats.street.needsUpdate = mats.sky.needsUpdate = true;
    }
    mats.cloud.color.set(day > 0.5 ? "#ffffff" : "#5d8a90");
    // Night sky as soon as we're outside; the day sky takes over inside the cloud bank
    mats.sky.opacity = inFall;
    mats.sun.opacity = day * 0.9;
    if (sky.current) sky.current.position.copy(camera.position);
    if (sun.current) sun.current.position.set(camera.position.x - 60, camera.position.y + 45, camera.position.z - 170);

    // Clouds: a bank just under the room (thick in the day, a thin mist at night)
    const camY = fallCameraY(w.fall, w.fallMax);
    if (clouds.current) clouds.current.position.set(camera.position.x, 0, camera.position.z);
    mats.cloud.opacity = inFall * (day > 0.5 ? 0.6 : 0.14);

    // Near-field: debris and wind ride along with the camera
    if (near.current) near.current.position.set(camera.position.x, camY, camera.position.z);
    const travel = w.fall * FALL_PER_VH;
    s.travel = travel;
    const mesh = debrisMesh.current;
    if (mesh) {
      debris.forEach((d, i) => {
        // Debris falls faster than we do: it drops away below, toward the street
        const y = wrap(d.y - travel * d.speed, 22) - 6;
        dummy.position.set(d.x, y, d.z);
        dummy.rotation.set(d.spin.x * travel, d.spin.y * travel, d.spin.z * travel);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    const pos = windGeo.attributes.position as THREE.BufferAttribute;
    windSeeds.forEach((sd, i) => {
      const y = wrap(sd.y + travel * 1.6, 22);
      pos.setXYZ(i * 2, sd.x, y, sd.z);
      pos.setXYZ(i * 2 + 1, sd.x, y + sd.len * (0.6 + Math.min(Math.abs(w.velocity), 3)), sd.z);
    });
    pos.needsUpdate = true;
    mats.wind.opacity = inFall * Math.min(0.55, 0.12 + Math.abs(w.velocity) * 0.25) * (day > 0.5 ? 0.6 : 1);
    mats.debris.opacity = 0.55 * inFall;
  });

  const cloudPuffs = useMemo(() => {
    const rand = rng(77);
    return Array.from({ length: lite ? 8 : 14 }, () => ({ x: (rand() - 0.5) * 22, y: -5 - rand() * 12, z: -3 - rand() * 18, s: 6 + rand() * 9 }));
  }, [lite]);

  return (
    <group ref={root} visible={false}>
      <mesh ref={sky} material={mats.sky} renderOrder={-1}>
        <sphereGeometry args={[380, 24, 16]} />
      </mesh>
      <sprite ref={sun} material={mats.sun} scale={[60, 60, 1]} />
      <instancedMesh ref={towers} args={[box, mats.towers, layout.length]} />
      <instancedMesh ref={roofs} args={[roofGeo, mats.roofs, layout.length]} />
      <mesh ref={street} material={mats.street} rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, -90]}>
        <planeGeometry args={[220, 320]} />
      </mesh>
      <group ref={clouds}>
        {cloudPuffs.map((c, i) => (
          <sprite key={i} material={mats.cloud} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.55, 1]} />
        ))}
      </group>
      <group ref={near}>
        <instancedMesh ref={debrisMesh} args={[shardGeo, mats.debris, debris.length]} frustumCulled={false} />
        <lineSegments geometry={windGeo} material={mats.wind} frustumCulled={false} />
      </group>
    </group>
  );
}
