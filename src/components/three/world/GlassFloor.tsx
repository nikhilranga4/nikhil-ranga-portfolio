import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { playSfx } from "@/lib/music";
import { glassCrack, glassShatter, whoosh } from "@/lib/music/sfx";
import { DOOR } from "./Corridor";
import { sharedMatcap } from "./keycap";
import { ROOM } from "./Room";
import { SCROLL, smooth, span, type WorldState } from "./timeline";
import { crackTexture, radialTexture } from "./textures";

/** Where the floor gives way: in front of the desk, under the camera's tilted gaze */
export const IMPACT = new THREE.Vector3(0.3, 0, -4.5);
const FRONT = -DOOR.wall;
const DEPTH = FRONT - ROOM.back;
const MID_Z = (FRONT + ROOM.back) / 2;
/** Seconds of "fall time" the shatter beat scrubs through */
const SHATTER_SECONDS = 1.9;
const GRAVITY = -6;

/** Small deterministic random so the break looks the same every visit (and when scrubbed back). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Shard {
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  rot: number;
  scale: number;
}

function makeShards(count: number): Shard[] {
  const rand = rng(97);
  const cols = Math.ceil(Math.sqrt(count * (ROOM.halfW * 2) / DEPTH));
  const rows = Math.ceil(count / cols);
  const shards: Shard[] = [];
  for (let i = 0; i < count; i++) {
    // Stratified over the floor so the pieces tile it before the break
    const cx = ((i % cols) + 0.2 + rand() * 0.6) / cols;
    const cz = (Math.floor(i / cols) + 0.2 + rand() * 0.6) / rows;
    const p = new THREE.Vector3(-ROOM.halfW + cx * ROOM.halfW * 2, 0, FRONT - cz * DEPTH);
    const away = new THREE.Vector3(p.x - IMPACT.x, 0, p.z - IMPACT.z);
    const dist = away.length() || 1;
    away.divideScalar(dist);
    // Pieces near the impact burst harder and higher
    const kick = 2.6 / (1 + dist * 0.7);
    const v = new THREE.Vector3(away.x * (0.4 + kick + rand() * 0.8), 0.3 + kick * 1.2 + rand() * 0.8, away.z * (0.4 + kick + rand() * 0.8));
    const spin = new THREE.Vector3((rand() - 0.5) * 9, (rand() - 0.5) * 6, (rand() - 0.5) * 9);
    shards.push({ p, v, spin, rot: rand() * Math.PI * 2, scale: 0.7 + rand() * 0.9 });
  }
  return shards;
}

interface GlassFloorProps {
  world: MutableRefObject<WorldState>;
  neonA: string;
  count: number;
}

/**
 * The room's glass floor. On scroll it cracks from an impact point, then shatters into shards
 * that fall away. Everything is a pure function of scroll progress, so scrolling back up puts
 * the floor back together. The crack and shatter sounds fire once per forward crossing.
 */
export function GlassFloor({ world, neonA, count }: GlassFloorProps) {
  const textures = useMemo(() => ({ crack: crackTexture(), flash: radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)") }), []);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  const mats = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({ color: "#0a1a1d", roughness: 0.12, metalness: 0.65 }),
      crack: new THREE.MeshBasicMaterial({ map: textures.crack, color: new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.55), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      flash: new THREE.MeshBasicMaterial({ map: textures.flash, color: new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      shard: new THREE.MeshMatcapMaterial({ matcap: sharedMatcap(), color: new THREE.Color(neonA).lerp(new THREE.Color("#d8f4f1"), 0.7), transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
      edge: new THREE.MeshBasicMaterial({ color: new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.3), toneMapped: false }),
    }),
    [textures, neonA]
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // Thin triangular prisms: a 3-sided cylinder, squashed
  const shardGeometry = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.025, 3), []);
  useEffect(() => () => shardGeometry.dispose(), [shardGeometry]);
  const shards = useMemo(() => makeShards(count), [count]);

  const glass = useRef<THREE.Mesh>(null);
  const crack = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const pieces = useRef<THREE.InstancedMesh>(null);
  const armed = useRef({ crack: true, shatter: true, last: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pieces start exactly where the intact floor is (hidden until the break)
  useLayoutEffect(() => {
    const mesh = pieces.current;
    if (!mesh) return;
    shards.forEach((s, i) => {
      dummy.position.copy(s.p);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [shards, dummy]);

  useFrame(() => {
    const w = world.current;
    const p = w.progress;
    const crackP = smooth(span(p, SCROLL.crack));
    const shatterP = span(p, SCROLL.shatter);
    const broken = shatterP > 0;

    // Sounds: once per forward crossing, re-armed when scrolled back above the line
    const a = armed.current;
    if (!w.reduceMotion) {
      if (a.crack && p >= SCROLL.crack[0] + 0.004 && a.last < p) {
        a.crack = false;
        playSfx(glassCrack);
      }
      if (a.shatter && p >= SCROLL.shatter[0] && a.last < p) {
        a.shatter = false;
        playSfx(glassShatter);
        playSfx((ctx, out, t) => whoosh(ctx, out, t, 1.3), 0.25);
      }
      if (p < SCROLL.crack[0] - 0.01) a.crack = true;
      if (p < SCROLL.shatter[0] - 0.01) a.shatter = true;
    }
    a.last = p;

    if (glass.current) glass.current.visible = !broken;
    if (crack.current) {
      crack.current.visible = crackP > 0 && !broken;
      crack.current.scale.setScalar(0.18 + 0.82 * crackP);
      mats.crack.opacity = 0.35 + 0.65 * crackP;
    }
    if (flash.current) {
      const f = Math.sin(Math.min(1, shatterP / 0.18) * Math.PI);
      flash.current.visible = f > 0.01;
      mats.flash.opacity = f * 0.8;
    }

    const mesh = pieces.current;
    if (!mesh) return;
    mesh.visible = broken;
    if (!broken) return;
    const t = shatterP * SHATTER_SECONDS;
    shards.forEach((s, i) => {
      dummy.position.set(s.p.x + s.v.x * t, s.p.y + s.v.y * t + 0.5 * GRAVITY * t * t, s.p.z + s.v.z * t);
      dummy.rotation.set(s.spin.x * t, s.rot + s.spin.y * t, s.spin.z * t);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={glass} material={mats.glass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, MID_Z]}>
        <planeGeometry args={[ROOM.halfW * 2, DEPTH]} />
      </mesh>
      {/* LED strips where the glass meets the walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.edge} position={[s * (ROOM.halfW - 0.03), 0.012, MID_Z]}>
          <boxGeometry args={[0.02, 0.012, DEPTH]} />
        </mesh>
      ))}
      <mesh ref={crack} material={mats.crack} rotation={[-Math.PI / 2, 0, 0]} position={[IMPACT.x, 0.006, IMPACT.z]} visible={false}>
        <planeGeometry args={[6.6, 6.6]} />
      </mesh>
      <mesh ref={flash} material={mats.flash} rotation={[-Math.PI / 2, 0, 0]} position={[IMPACT.x, 0.2, IMPACT.z]} scale={7} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <instancedMesh ref={pieces} args={[shardGeometry, mats.shard, shards.length]} visible={false} frustumCulled={false} />
    </group>
  );
}
