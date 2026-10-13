import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { RBox as RoundedBox } from "./geometry";
import * as THREE from "three";
import { INTRO, SCROLL, easeInOut, flicker, span, type WorldState } from "./timeline";
import { concreteTexture, radialTexture } from "./textures";

/** The doorway: opening size, and where the wall sits (its front face is z = 0). */
export const DOOR = { w: 1.3, h: 2.45, wall: 0.3 };

/** Straight-segment curve through 2D points, so neon tubes keep crisp corners. */
class Polyline extends THREE.Curve<THREE.Vector3> {
  private pts: THREE.Vector3[];
  private lengths: number[];
  constructor(points: THREE.Vector2[], z = 0) {
    super();
    this.pts = points.map((p) => new THREE.Vector3(p.x, p.y, z));
    this.lengths = [0];
    for (let i = 1; i < this.pts.length; i++) this.lengths.push(this.lengths[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const total = this.lengths[this.lengths.length - 1];
    const d = t * total;
    let i = 1;
    while (i < this.lengths.length - 1 && this.lengths[i] < d) i++;
    const seg = this.lengths[i] - this.lengths[i - 1] || 1;
    return target.copy(this.pts[i - 1]).lerp(this.pts[i], (d - this.lengths[i - 1]) / seg);
  }
}

function tube(path: THREE.Path, radius: number, z = 0, divisions = 16) {
  const curve = new Polyline(path.getPoints(divisions), z);
  return new THREE.TubeGeometry(curve, 240, radius, 10, false);
}

function useGeometries() {
  return useMemo(() => {
    // Neon around the door frame: up one side, across the top with rounded corners, down the other
    const fx = DOOR.w / 2 + 0.07;
    const top = DOOR.h + 0.07;
    const r = 0.16;
    const frame = new THREE.Path();
    frame.moveTo(-fx, 0.02);
    frame.lineTo(-fx, top - r);
    frame.quadraticCurveTo(-fx, top, -fx + r, top);
    frame.lineTo(fx - r, top);
    frame.quadraticCurveTo(fx, top, fx, top - r);
    frame.lineTo(fx, 0.02);

    // "NR" in neon script
    const h = 0.22;
    const n = new THREE.Path();
    n.moveTo(-0.205, -h / 2);
    n.lineTo(-0.205, h / 2);
    n.lineTo(-0.035, -h / 2);
    n.lineTo(-0.035, h / 2);
    const bx = 0.12;
    const rBowl = new THREE.Path();
    rBowl.moveTo(0.04, -h / 2);
    rBowl.lineTo(0.04, h / 2);
    rBowl.lineTo(bx, h / 2);
    rBowl.absarc(bx, h / 4, h / 4, Math.PI / 2, -Math.PI / 2, true);
    rBowl.lineTo(0.04, 0);
    const rLeg = new THREE.Path();
    rLeg.moveTo(bx - 0.01, 0);
    rLeg.lineTo(0.215, -h / 2);

    // Each tube has a fat, faint twin drawn additively: a cheap stand-in for bloom
    return {
      frame: tube(frame, 0.024, 0, 12),
      frameGlow: tube(frame, 0.085, 0, 12),
      n: tube(n, 0.011),
      nGlow: tube(n, 0.04),
      rBowl: tube(rBowl, 0.011, 0, 24),
      rBowlGlow: tube(rBowl, 0.04, 0, 24),
      rLeg: tube(rLeg, 0.011),
      rLegGlow: tube(rLeg, 0.04),
    };
  }, []);
}

interface CorridorProps {
  world: MutableRefObject<WorldState>;
  neonA: string;
  neonB: string;
}

const OFF = new THREE.Color("#141c1e");
const WHITE = new THREE.Color("#e6f7f4");
const KEY_LIGHT_INTRO = new THREE.Vector3(0, 2.6, 5.6);
const KEY_LIGHT_DOOR = new THREE.Vector3(0, 1.5, 0.9);

export function Corridor({ world, neonA, neonB }: CorridorProps) {
  const geo = useGeometries();
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const concrete = useMemo(() => {
    const map = concreteTexture();
    map.repeat.set(3, 2.4);
    return map;
  }, []);
  const glow = useMemo(() => radialTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)"), []);
  useEffect(
    () => () => {
      concrete.dispose();
      glow.dispose();
    },
    [concrete, glow]
  );

  // Neon: dark glass until powered, then a hot core (tinted toward white) with an additive halo
  const neon = useMemo(() => {
    const halo = (color: string) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
    const haze = (color: string) =>
      new THREE.MeshBasicMaterial({ map: glow, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    return {
      a: new THREE.MeshBasicMaterial({ color: OFF.clone(), toneMapped: false }),
      b: new THREE.MeshBasicMaterial({ color: OFF.clone(), toneMapped: false }),
      strip: new THREE.MeshBasicMaterial({ color: OFF.clone(), toneMapped: false }),
      keypad: new THREE.MeshBasicMaterial({ color: OFF.clone(), toneMapped: false }),
      glowA: halo(neonA),
      glowB: halo(neonB),
      floorGlow: haze(neonB),
      stripGlow: haze(neonB),
      doorHaze: haze(neonA),
      signHaze: haze(neonB),
    };
  }, [glow, neonA, neonB]);
  useEffect(() => () => Object.values(neon).forEach((m) => m.dispose()), [neon]);
  const hdrA = useMemo(() => new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.35), [neonA]);
  const hdrB = useMemo(() => new THREE.Color(neonB).lerp(new THREE.Color("#ffffff"), 0.3), [neonB]);
  const unlocked = useMemo(() => new THREE.Color(neonA), [neonA]);
  const teal = useMemo(() => new THREE.Color(neonA), [neonA]);
  const locked = useMemo(() => new THREE.Color(neonB), [neonB]);

  const hinge = useRef<THREE.Group>(null);
  const frontLight = useRef<THREE.PointLight>(null);
  const floorLight = useRef<THREE.PointLight>(null);
  const wash = useRef<THREE.SpotLight>(null);
  const washTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 2.4, 0);
    return o;
  }, []);

  useFrame(() => {
    const w = world.current;
    const t = w.intro - INTRO.powerOn;
    const frame = w.reduceMotion || w.intro === Infinity ? 1 : flicker(t, 0);
    const sign = w.reduceMotion || w.intro === Infinity ? 1 : flicker(t - 0.12, 1);
    const strips = w.reduceMotion || w.intro === Infinity ? 1 : flicker(t - 0.05, 2);
    neon.a.color.copy(OFF).lerp(hdrA, frame);
    neon.b.color.copy(OFF).lerp(hdrB, strips);
    neon.strip.color.copy(OFF).lerp(hdrB, strips);
    neon.floorGlow.opacity = strips * 0.75;
    neon.glowA.opacity = frame * 0.22;
    neon.glowB.opacity = sign * 0.25;
    neon.stripGlow.opacity = strips * 0.6;
    neon.doorHaze.opacity = frame * 0.28;
    neon.signHaze.opacity = sign * 0.35;

    const open = easeInOut(span(w.progress, SCROLL.doorOpen));
    const unlocking = span(w.progress, [0.01, 0.05]);
    neon.keypad.color.copy(locked).lerp(unlocked, unlocking).multiplyScalar(Math.max(frame, 0.08));
    if (hinge.current) hinge.current.rotation.y = open * 1.85;

    // One key light: a soft white over the keyboard during the intro, then teal at the door
    if (frontLight.current) {
      const atDoor = w.reduceMotion || w.intro === Infinity ? 1 : span(w.intro, INTRO.pullBack);
      frontLight.current.position.lerpVectors(KEY_LIGHT_INTRO, KEY_LIGHT_DOOR, atDoor);
      frontLight.current.color.copy(WHITE).lerp(teal, Math.max(frame, atDoor));
      frontLight.current.intensity = THREE.MathUtils.lerp(w.intro < 0 ? 0 : 4, frame * 5, atDoor);
    }
    if (floorLight.current) floorLight.current.intensity = strips * 3;
    if (wash.current) wash.current.intensity = 4 + sign * 30;
  });

  const wallMat = <meshLambertMaterial map={concrete} color="#a9bdbd" />;
  const sideW = 8 - (DOOR.w / 2 + 0.12);
  const sideX = DOOR.w / 2 + 0.12 + sideW / 2;

  return (
    <group>
      {/* Wall with the doorway cut out */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * sideX, 3, -DOOR.wall / 2]}>
          <boxGeometry args={[sideW, 6, DOOR.wall]} />
          {wallMat}
        </mesh>
      ))}
      <mesh position={[0, DOOR.h + 0.12 + (6 - DOOR.h - 0.12) / 2, -DOOR.wall / 2]}>
        <boxGeometry args={[DOOR.w + 0.24, 6 - DOOR.h - 0.12, DOOR.wall]} />
        {wallMat}
      </mesh>
      {/* Pillars framing the bay */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.75, 3, 0.2]}>
          <boxGeometry args={[0.9, 6, 0.4]} />
          <meshLambertMaterial map={concrete} color="#566a6a" />
        </mesh>
      ))}

      {/* Door frame housing and its neon */}
      <group>
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.14, DOOR.h + 0.14, 0.2]} radius={0.03} smoothness={3} position={[s * (DOOR.w / 2 + 0.07), (DOOR.h + 0.14) / 2, 0.03]}>
            <meshStandardMaterial color="#0d1213" roughness={0.45} metalness={0.7} />
          </RoundedBox>
        ))}
        <RoundedBox args={[DOOR.w + 0.28, 0.14, 0.2]} radius={0.03} smoothness={3} position={[0, DOOR.h + 0.07, 0.03]}>
          <meshStandardMaterial color="#0d1213" roughness={0.45} metalness={0.7} />
        </RoundedBox>
        <mesh geometry={geo.frame} material={neon.a} position={[0, 0, 0.14]} />
        <mesh geometry={geo.frameGlow} material={neon.glowA} position={[0, 0, 0.14]} />
        {/* Soft teal haze on the wall around the frame */}
        <mesh material={neon.doorHaze} position={[0, DOOR.h / 2 + 0.1, 0.01]} scale={[3.6, 4.2, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        {/* Coral light strips above the door and across the threshold */}
        <mesh material={neon.strip} position={[0, DOOR.h - 0.05, -0.01]}>
          <boxGeometry args={[DOOR.w - 0.22, 0.035, 0.03]} />
        </mesh>
        <mesh material={neon.stripGlow} position={[0, DOOR.h - 0.05, 0.02]} scale={[1.6, 0.35, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <mesh material={neon.strip} position={[0, 0.025, 0.06]}>
          <boxGeometry args={[DOOR.w - 0.2, 0.03, 0.05]} />
        </mesh>
        <mesh material={neon.floorGlow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.55]} scale={[2.2, 1.4, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </group>

      {/* The door: swings into the room on its left-hand hinge */}
      <group ref={hinge} position={[-DOOR.w / 2 + 0.02, 0, -0.07]}>
        <group position={[DOOR.w / 2 - 0.02, DOOR.h / 2 + 0.005, 0]}>
          <RoundedBox args={[DOOR.w - 0.04, DOOR.h - 0.03, 0.07]} radius={0.02} smoothness={3}>
            <meshStandardMaterial color="#161c1e" roughness={0.38} metalness={0.78} />
          </RoundedBox>
          {/* Raised panels */}
          {(
            [
              [-0.25, 0.62, 0.5, 0.86],
              [0.27, 0.62, 0.38, 0.86],
              [0, 0.0, 1.06, 0.2],
              [-0.25, -0.62, 0.5, 0.86],
              [0.27, -0.62, 0.38, 0.86],
            ] as const
          ).map(([x, y, w, h], i) => (
            <RoundedBox key={i} args={[w, h, 0.03]} radius={0.025} smoothness={3} position={[x, y, 0.045]}>
              <meshStandardMaterial color="#20282b" roughness={0.42} metalness={0.7} />
            </RoundedBox>
          ))}
          {/* Keypad: locked (coral) until the scroll unlocks it (teal) */}
          <RoundedBox args={[0.12, 0.26, 0.03]} radius={0.015} smoothness={3} position={[0.5, 0.2, 0.06]}>
            <meshStandardMaterial color="#0b0f10" roughness={0.3} metalness={0.6} />
          </RoundedBox>
          <mesh material={neon.keypad} position={[0.5, 0.25, 0.077]}>
            <planeGeometry args={[0.07, 0.07]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={neon.a} position={[0.47 + i * 0.03, 0.15, 0.077]}>
              <planeGeometry args={[0.014, 0.014]} />
            </mesh>
          ))}
          {/* Handle */}
          <mesh position={[0.5, -0.18, 0.08]}>
            <capsuleGeometry args={[0.016, 0.2, 4, 10]} />
            <meshStandardMaterial color="#9aa6a8" roughness={0.25} metalness={1} />
          </mesh>
        </group>
      </group>

      {/* NR sign */}
      <group position={[0, DOOR.h + 0.58, 0.04]}>
        <RoundedBox args={[0.68, 0.38, 0.05]} radius={0.03} smoothness={3}>
          <meshStandardMaterial color="#0b1011" roughness={0.5} metalness={0.5} />
        </RoundedBox>
        <mesh material={neon.signHaze} position={[0, 0, 0.03]} scale={[1.5, 0.9, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <mesh geometry={geo.n} material={neon.b} position={[0, 0, 0.045]} />
        <mesh geometry={geo.rBowl} material={neon.a} position={[0, 0, 0.045]} />
        <mesh geometry={geo.rLeg} material={neon.a} position={[0, 0, 0.045]} />
        <mesh geometry={geo.nGlow} material={neon.glowB} position={[0, 0, 0.045]} />
        <mesh geometry={geo.rBowlGlow} material={neon.glowA} position={[0, 0, 0.045]} />
        <mesh geometry={geo.rLegGlow} material={neon.glowA} position={[0, 0, 0.045]} />
      </group>

      {/* Lights that come on with the neon */}
      <pointLight ref={frontLight} position={[0, 1.5, 0.9]} color={neonA} intensity={0} distance={8} decay={1.5} />
      <pointLight ref={floorLight} position={[0, 0.15, 0.45]} color={neonB} intensity={0} distance={3.5} decay={2} />
      <spotLight ref={wash} position={[0, 5.6, 2.2]} target={washTarget} color="#a8e9e3" angle={0.62} penumbra={1} distance={11} decay={1.2} intensity={4} />
      <primitive object={washTarget} />
    </group>
  );
}
