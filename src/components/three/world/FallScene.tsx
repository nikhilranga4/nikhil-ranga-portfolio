import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sharedMatcap } from "./keycap";
import { FALL_PER_VH, fallBlend, fallCameraY, streetLevel, type WorldState } from "./timeline";
import { avenueTexture, radialTexture } from "./textures";

/** Kenney City Kit (Commercial), CC0: 16 buildings merged into one compressed file */
const CITY_URL = "/models/city/city.glb";
/** Poly Haven skies (CC0), graded to JPG */
const SKY_URLS = ["/sky/sky-night.jpg", "/sky/sky-day.jpg"];
/** Kenney units → world units */
const KIT_SCALE = 11;

/** Footprints (Kenney units) of the buildings we place: [width, depth, height] */
const KIT = {
  "building-skyscraper-a": [1.36, 1.36, 2.88],
  "building-skyscraper-b": [1.36, 1.36, 4.48],
  "building-skyscraper-c": [1.28, 1.39, 4.08],
  "building-skyscraper-d": [1.28, 1.39, 5.47],
  "building-skyscraper-e": [1.29, 1.24, 4.08],
  "building-f": [0.84, 1.03, 1.69],
  "building-g": [0.97, 0.92, 1.69],
  "building-i": [1.24, 1.3, 1.68],
  "building-l": [1.37, 1.4, 2.27],
  "building-m": [1.24, 1.24, 3.15],
  "low-detail-building-a": [0.5, 0.5, 2.0],
  "low-detail-building-b": [0.5, 0.5, 2.23],
  "low-detail-building-c": [0.5, 0.5, 2.25],
  "low-detail-building-f": [0.5, 0.5, 2.0],
  "low-detail-building-h": [0.5, 0.5, 2.1],
  "low-detail-building-wide-a": [1.0, 0.5, 1.1],
} as const;
type Kind = keyof typeof KIT;

const NEAR: Kind[] = ["building-skyscraper-a", "building-skyscraper-b", "building-skyscraper-c", "building-skyscraper-d", "building-skyscraper-e", "building-l", "building-m"];
const MID: Kind[] = ["building-f", "building-g", "building-i", "building-l", "building-m", "building-skyscraper-a", "building-skyscraper-e"];
const FAR: Kind[] = ["low-detail-building-a", "low-detail-building-b", "low-detail-building-c", "low-detail-building-f", "low-detail-building-h", "low-detail-building-wide-a"];

/** The avenue runs along +x in front of the tower; its kerbs are at these z values */
const AVENUE = { north: -2.5, south: -15.5 };

interface Placement {
  kind: Kind;
  x: number;
  z: number;
  rot: number;
  scale: number;
  /** Non-uniform scale override (our tower) */
  stretch?: [number, number, number];
}

/** Small deterministic random for the city layout. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Rows of buildings either side of the avenue (with cross streets), a second row behind each,
 * and a ring of low-detail towers for the skyline.
 */
function cityLayout(): Placement[] {
  const rand = rng(11);
  const out: Placement[] = [];
  const row = (kinds: Kind[], fromX: number, toX: number, frontZ: number, side: 1 | -1, scale: number) => {
    let x = fromX;
    let count = 0;
    while (x < toX) {
      const kind = kinds[Math.floor(rand() * kinds.length)];
      const [w, d] = KIT[kind];
      const s = scale * (0.9 + rand() * 0.25);
      const halfW = (w * KIT_SCALE * s) / 2;
      x += halfW;
      out.push({ kind, x, z: frontZ + side * ((d * KIT_SCALE * s) / 2), rot: side > 0 ? Math.PI : 0, scale: s });
      x += halfW + 2 + rand() * 5;
      if (++count % 4 === 0) x += 16; // cross street
    }
  };
  row(NEAR, 14, 270, 2.5, 1, 1);
  row(NEAR, -40, 270, AVENUE.south - 3, -1, 1);
  row(MID, -60, 280, 30, 1, 1.05);
  row(MID, -70, 280, -46, -1, 1.05);
  // Skyline ring
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * 0.95 + rand() * Math.PI * 1.9;
    const r = 150 + rand() * 110;
    const kind = FAR[Math.floor(rand() * FAR.length)];
    out.push({ kind, x: 90 + Math.cos(a) * r, z: -10 + Math.sin(a) * r, rot: Math.floor(rand() * 4) * (Math.PI / 2), scale: 1.2 + rand() * 0.8 });
  }
  return out;
}

interface FallSceneProps {
  world: MutableRefObject<WorldState>;
  neonA: string;
  /** Fewer particles for phones / integrated GPUs */
  lite: boolean;
}

/**
 * The city for the free fall, built from real models (Kenney City Kit, CC0) and lit by real skies
 * (Poly Haven, CC0): instanced buildings lining the avenue (one draw call per model), the tower we
 * fell from, a sun or moon, and at night warm window and street lights. Night/day swap textures and
 * light levels on the same materials, so a theme change never recompiles a shader.
 */
export function FallScene({ world, neonA, lite }: FallSceneProps) {
  const { gl, scene, camera } = useThree();
  const gltf = useGLTF(CITY_URL);
  // Each building is its own scene in the merged file, so index meshes across all scenes
  const { nodes, materials } = useMemo(() => {
    const meshes: Record<string, THREE.Mesh> = {};
    const mats: Record<string, THREE.MeshStandardMaterial> = {};
    for (const sc of gltf.scenes) {
      sc.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // The loader de-duplicates names ("building-f_1"): key by the original name
        meshes[m.name.replace(/_\d+$/, "")] = m;
        const mat = m.material as THREE.MeshStandardMaterial;
        mats[mat.name || "colormap"] = mat;
      });
    }
    return { nodes: meshes, materials: mats };
  }, [gltf]);
  const [skyNight, skyDay] = useTexture(SKY_URLS);

  // One material for the whole city (the kit shares a single colour-map texture). Lambert, not
  // PBR: the kit is flat-shaded anyway, and it keeps a screen full of buildings cheap on
  // integrated GPUs. The colour map doubles as an emissive map so the city glows at night.
  const cityMaterial = useMemo(() => {
    const map = (materials.colormap ?? Object.values(materials)[0]).map;
    return new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: new THREE.Color(0, 0, 0) });
  }, [materials]);
  useEffect(() => () => cityMaterial.dispose(), [cityMaterial]);

  const tex = useMemo(() => ({ avenueNight: avenueTexture("night"), avenueDay: avenueTexture("day"), puff: radialTexture("rgba(255,255,255,0.85)", "rgba(255,255,255,0)") }), []);
  useEffect(() => {
    for (const t of [tex.avenueNight, tex.avenueDay]) t.repeat.set(70, 1);
    return () => {
      tex.avenueNight.dispose();
      tex.avenueDay.dispose();
      tex.puff.dispose();
    };
  }, [tex]);

  // Image-based lighting from the skies (prefiltered once). Set before the up-front shader compile.
  const envs = useMemo(() => {
    for (const t of [skyNight, skyDay]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.mapping = THREE.EquirectangularReflectionMapping;
    }
    const pm = new THREE.PMREMGenerator(gl);
    const out = { night: pm.fromEquirectangular(skyNight).texture, day: pm.fromEquirectangular(skyDay).texture };
    pm.dispose();
    return out;
  }, [gl, skyNight, skyDay]);
  useLayoutEffect(() => {
    scene.environment = envs.night;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      envs.night.dispose();
      envs.day.dispose();
    };
  }, [scene, envs]);

  const mats = useMemo(
    () => ({
      ground: new THREE.MeshLambertMaterial({ color: "#0f1518" }),
      avenue: new THREE.MeshLambertMaterial({ map: tex.avenueNight }),
      kerb: new THREE.MeshLambertMaterial({ color: "#2a3134" }),
      lights: new THREE.PointsMaterial({ map: tex.puff, size: 2.8, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      debris: new THREE.MeshMatcapMaterial({ matcap: sharedMatcap(), color: new THREE.Color(neonA).lerp(new THREE.Color("#d8f4f1"), 0.7), transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      wind: new THREE.LineBasicMaterial({ color: "#cdeeea", transparent: true, opacity: 0, depthWrite: false }),
      cloud: new THREE.SpriteMaterial({ map: tex.puff, color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }),
      sky: new THREE.MeshBasicMaterial({ map: skyNight, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    }),
    [tex, neonA, skyNight]
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const layout = useMemo(cityLayout, []);
  const byKind = useMemo(() => {
    const groups = new Map<Kind, Placement[]>();
    // The tower we fell from: a real skyscraper, stretched to reach the street
    groups.set("building-skyscraper-c", [{ kind: "building-skyscraper-c", x: 0, z: 7.7, rot: 0, scale: 1, stretch: [15 / 1.28, 1, 15 / 1.39] }]);
    for (const p of layout) groups.set(p.kind, [...(groups.get(p.kind) ?? []), p]);
    return [...groups.entries()];
  }, [layout]);

  const shardGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.22, 0.02, 3), []);
  useEffect(() => () => shardGeo.dispose(), [shardGeo]);
  const debrisCount = lite ? 20 : 40;
  const windCount = lite ? 50 : 100;
  const debris = useMemo(() => {
    const rand = rng(31);
    return Array.from({ length: debrisCount }, () => ({
      x: (rand() - 0.5) * 14,
      z: -2 - rand() * 12,
      y: rand() * 22,
      speed: 0.5 + rand() * 0.6,
      spin: new THREE.Vector3((rand() - 0.5) * 3, (rand() - 0.5) * 3, (rand() - 0.5) * 3),
      scale: 0.5 + rand() * 1.4,
    }));
  }, [debrisCount]);
  const windSeeds = useMemo(() => {
    const rand = rng(43);
    return Array.from({ length: windCount }, () => ({ x: rand() * 18 - 4, z: -2 - rand() * 14, y: rand() * 22, len: 0.5 + rand() * 1.3 }));
  }, [windCount]);
  const windGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(windCount * 6), 3));
    return g;
  }, [windCount]);
  useEffect(() => () => windGeo.dispose(), [windGeo]);

  // City lights at night: street lamps along both kerbs and windows on the avenue-facing walls
  const lightCount = lite ? 260 : 520;
  const lightsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(lightCount * 3), 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(lightCount * 3), 3));
    return g;
  }, [lightCount]);
  useEffect(() => () => lightsGeo.dispose(), [lightsGeo]);

  const root = useRef<THREE.Group>(null);
  const instRefs = useRef(new Map<Kind, THREE.InstancedMesh>());
  const debrisMesh = useRef<THREE.InstancedMesh>(null);
  const near = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Group>(null);
  const sky = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const skyLight = useRef<THREE.HemisphereLight>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const place = useMemo(() => new THREE.Matrix4(), []);
  const state = useRef({ street: NaN, mode: "" as string });

  /** Everything stands on the street, so it's re-placed when the page length moves the street. */
  const build = (streetY: number) => {
    for (const [kind, list] of byKind) {
      const mesh = instRefs.current.get(kind);
      const node = nodes[kind];
      if (!mesh || !node) continue;
      // Compressed (quantised) meshes carry a correcting transform on their node: keep it
      node.updateMatrix();
      list.forEach((p, i) => {
        dummy.position.set(p.x, streetY, p.z);
        dummy.rotation.set(0, p.rot, 0);
        if (p.stretch) dummy.scale.set(p.stretch[0], (-0.4 - streetY) / KIT[kind][2], p.stretch[2]);
        else dummy.scale.setScalar(p.scale * KIT_SCALE);
        dummy.updateMatrix();
        place.multiplyMatrices(dummy.matrix, node.matrix);
        mesh.setMatrixAt(i, place);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }

    const rand = rng(91);
    const pos = lightsGeo.attributes.position as THREE.BufferAttribute;
    const col = lightsGeo.attributes.color as THREE.BufferAttribute;
    const warm = new THREE.Color("#ffc58a");
    const teal = new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.2);
    const lamp = new THREE.Color("#ffd9a0");
    let n = 0;
    // Street lamps
    for (let x = -30; x < 260 && n < lightCount - 1; x += 9) {
      for (const z of [AVENUE.north - 0.6, AVENUE.south + 0.6]) {
        pos.setXYZ(n, x, streetY + 4.2, z);
        col.setXYZ(n, lamp.r * 1.4, lamp.g * 1.4, lamp.b * 1.4);
        n++;
      }
    }
    // Lit windows on the walls facing the avenue
    const lit = layout.filter((p) => !p.kind.startsWith("low-detail"));
    while (n < lightCount) {
      const p = lit[Math.floor(rand() * lit.length)];
      const [w, d, h] = KIT[p.kind];
      const s = p.scale * KIT_SCALE;
      const faceZ = p.z + (p.rot === 0 ? d * s * 0.5 + 0.25 : -(d * s * 0.5 + 0.25));
      const c = rand() < 0.7 ? warm : teal;
      const k = 0.5 + rand() * 0.6;
      pos.setXYZ(n, p.x + (rand() - 0.5) * w * s * 0.8, streetY + (0.08 + rand() * 0.82) * h * s, faceZ);
      col.setXYZ(n, c.r * k, c.g * k, c.b * k);
      n++;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    lightsGeo.computeBoundingSphere();
  };

  useFrame(() => {
    const w = world.current;
    const { inFall, day } = fallBlend(w);
    if (!root.current) return;
    root.current.visible = inFall > 0.001;
    if (!root.current.visible) return;
    const s = state.current;

    const streetY = streetLevel(w.fallMax);
    // (NaN on the first frame, so the city is always placed once)
    if (!(Math.abs(streetY - s.street) <= 0.01)) {
      s.street = streetY;
      build(streetY);
    }

    // Night ↔ day: swap the sky, its lighting and a few tints (no recompile)
    const isDay = day > 0.5;
    const mode = isDay ? "day" : "night";
    if (mode !== s.mode) {
      s.mode = mode;
      mats.sky.map = isDay ? skyDay : skyNight;
      mats.avenue.map = isDay ? tex.avenueDay : tex.avenueNight;
      mats.ground.color.set(isDay ? "#7d878c" : "#0f1518");
      mats.kerb.color.set(isDay ? "#b9c0c3" : "#2a3134");
      mats.sky.needsUpdate = mats.avenue.needsUpdate = true;
      scene.environment = isDay ? envs.day : envs.night;
    }
    scene.environmentIntensity = THREE.MathUtils.lerp(0.3, isDay ? 1.05 : 0.55, inFall);
    if (sun.current) {
      sun.current.intensity = inFall * (isDay ? 2.2 : 0.5);
      sun.current.color.set(isDay ? "#fff0d8" : "#9cc2ff");
    }
    // Sky-tinted fill: bright blue-white by day, cool moonlit blue at night
    if (skyLight.current) {
      skyLight.current.intensity = inFall * (isDay ? 1.5 : 0.9);
      skyLight.current.color.set(isDay ? "#e6f2ff" : "#46658a");
      skyLight.current.groundColor.set(isDay ? "#7a8288" : "#0b0f14");
    }
    cityMaterial.emissive.setRGB(isDay ? 0 : 0.2 * inFall, isDay ? 0 : 0.17 * inFall, isDay ? 0 : 0.13 * inFall);
    mats.lights.opacity = isDay ? 0 : inFall;
    mats.sky.opacity = inFall;
    if (sky.current) sky.current.position.copy(camera.position);

    // Clouds: a bank just under the room (light mode drops through it into the day)
    if (clouds.current) clouds.current.position.set(camera.position.x, 0, camera.position.z);
    mats.cloud.color.set(isDay ? "#ffffff" : "#6d8f99");
    mats.cloud.opacity = inFall * (isDay ? 0.55 : 0.1);

    // Near-field: glass debris dropping away below us, and wind streaks rushing past
    const camY = fallCameraY(w.fall, w.fallMax);
    if (near.current) near.current.position.set(camera.position.x, camY, camera.position.z);
    const travel = w.fall * FALL_PER_VH;
    const mesh = debrisMesh.current;
    if (mesh) {
      debris.forEach((d, i) => {
        const y = ((((d.y - travel * d.speed) % 22) + 22) % 22) - 14;
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
      const y = ((((sd.y + travel * 1.6) % 22) + 22) % 22) - 11;
      pos.setXYZ(i * 2, sd.x, y, sd.z);
      pos.setXYZ(i * 2 + 1, sd.x, y + sd.len * (0.6 + Math.min(Math.abs(w.velocity), 3)), sd.z);
    });
    pos.needsUpdate = true;
    mats.wind.opacity = inFall * Math.min(0.4, 0.08 + Math.abs(w.velocity) * 0.2) * (isDay ? 0.5 : 1);
    mats.debris.opacity = 0.55 * inFall;
  });

  const cloudPuffs = useMemo(() => {
    const rand = rng(77);
    return Array.from({ length: lite ? 8 : 14 }, () => ({ x: (rand() - 0.5) * 26 + 6, y: -6 - rand() * 12, z: -4 - rand() * 18, s: 7 + rand() * 9 }));
  }, [lite]);

  return (
    <group ref={root} visible={false}>
      <mesh ref={sky} material={mats.sky} renderOrder={-1}>
        <sphereGeometry args={[380, 32, 16]} />
      </mesh>
      <directionalLight ref={sun} position={[-80, 140, -120]} intensity={0} />
      <hemisphereLight ref={skyLight} args={["#e6f2ff", "#7a8288", 0]} />

      {byKind.map(([kind, list]) => (
        <instancedMesh
          key={kind}
          ref={(m) => {
            if (m) instRefs.current.set(kind, m);
            else instRefs.current.delete(kind);
          }}
          args={[nodes[kind]?.geometry, cityMaterial, list.length]}
          frustumCulled={false}
        />
      ))}
      <StreetLevel world={world} mats={mats} />
      <points geometry={lightsGeo} material={mats.lights} frustumCulled={false} />

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

/** Ground, avenue and kerbs, kept at the street's height (which depends on the page length). */
function StreetLevel({ world, mats }: { world: MutableRefObject<WorldState>; mats: { ground: THREE.Material; avenue: THREE.Material; kerb: THREE.Material } }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.y = streetLevel(world.current.fallMax);
  });
  const avenueZ = (AVENUE.north + AVENUE.south) / 2;
  const avenueW = AVENUE.north - AVENUE.south;
  return (
    <group ref={group}>
      <mesh material={mats.ground} rotation={[-Math.PI / 2, 0, 0]} position={[100, -0.02, -10]}>
        <planeGeometry args={[900, 900]} />
      </mesh>
      <mesh material={mats.avenue} rotation={[-Math.PI / 2, 0, 0]} position={[110, 0.01, avenueZ]}>
        <planeGeometry args={[420, avenueW]} />
      </mesh>
      {[AVENUE.north + 1.5, AVENUE.south - 1.5].map((z) => (
        <mesh key={z} material={mats.kerb} position={[110, 0.12, z]}>
          <boxGeometry args={[420, 0.24, 3]} />
        </mesh>
      ))}
    </group>
  );
}

useGLTF.preload(CITY_URL);
