import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { RBox as RoundedBox } from "./geometry";
import * as THREE from "three";
import { DOOR } from "./Corridor";
import { cityTexture, codeTexture, radialTexture } from "./textures";

/** Interior bounds: the room runs from the back of the corridor wall to the window wall. */
export const ROOM = { halfW: 3.4, back: -8, height: 3.2 };
const FRONT = -DOOR.wall;
const LENGTH = FRONT - ROOM.back;
const MID_Z = (FRONT + ROOM.back) / 2;

/** Small deterministic random for prop placement. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const LEAF = new THREE.SphereGeometry(0.5, 10, 8);
const dummy = new THREE.Object3D();

/** A potted plant: every leaf is one instance of a squashed sphere (a single draw call). */
function Plant({ position, scale = 1, color = "#1f4a3a" }: { position: [number, number, number]; scale?: number; color?: string }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const count = 8;
  useLayoutEffect(() => {
    const rand = rng(Math.round(position[0] * 100 + position[2] * 10 + 99));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand() * 0.5;
      const tilt = 0.5 + rand() * 0.6;
      const len = 0.22 + rand() * 0.16;
      dummy.position.set(Math.sin(a) * 0.05, 0.18 + len * 0.45, Math.cos(a) * 0.05);
      dummy.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
      dummy.scale.set(0.5 * len, len, 0.16 * len);
      dummy.updateMatrix();
      leaves.current?.setMatrixAt(i, dummy.matrix);
    }
    if (leaves.current) leaves.current.instanceMatrix.needsUpdate = true;
  }, [position]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.18, 16]} />
        <meshLambertMaterial color="#2b3236" />
      </mesh>
      <instancedMesh ref={leaves} args={[LEAF, undefined, count]}>
        <meshLambertMaterial color={color} />
      </instancedMesh>
    </group>
  );
}

const BOOK = new THREE.BoxGeometry(1, 1, 1);

function Shelves({ side, ledColor }: { side: 1 | -1; ledColor: THREE.Material }) {
  const books = useMemo(() => {
    const rand = rng(side > 0 ? 11 : 23);
    const out: { y: number; z: number; w: number; h: number; c: string }[] = [];
    for (const y of [0.92, 1.52, 2.12]) {
      let z = -1.6;
      while (z > -5.3) {
        if (rand() < 0.3) {
          z -= 0.35 + rand() * 0.4;
          continue;
        }
        const count = 2 + Math.floor(rand() * 5);
        for (let i = 0; i < count; i++) {
          const w = 0.04 + rand() * 0.04;
          const h = 0.2 + rand() * 0.12;
          out.push({ y, z: z - w / 2, w, h, c: ["#2a3438", "#3a2f2a", "#1e2b2f", "#40484a", "#5a3a30"][Math.floor(rand() * 5)] });
          z -= w + 0.005;
        }
        z -= 0.15 + rand() * 0.3;
      }
    }
    return out;
  }, [side]);
  const x = side * (ROOM.halfW - 0.2);
  const instanced = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = instanced.current;
    if (!mesh) return;
    const color = new THREE.Color();
    books.forEach((b, i) => {
      dummy.position.set(x + side * 0.02, b.y + 0.018 + b.h / 2, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.24, b.h, b.w);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(b.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [books, x, side]);
  return (
    <group>
      {[0.9, 1.5, 2.1].map((y) => (
        <group key={y}>
          <mesh position={[x, y, -3.55]}>
            <boxGeometry args={[0.36, 0.035, 3.9]} />
            <meshLambertMaterial color="#1b2224" />
          </mesh>
          <mesh material={ledColor} position={[x - side * 0.16, y - 0.025, -3.55]}>
            <boxGeometry args={[0.015, 0.012, 3.85]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={instanced} args={[BOOK, undefined, books.length]}>
        <meshLambertMaterial />
      </instancedMesh>
      <Plant position={[x, 2.14, -1.9]} scale={0.8} />
      <Plant position={[x, 1.54, -4.9]} scale={0.7} color="#285a44" />
    </group>
  );
}

interface RoomProps {
  neonA: string;
  neonB: string;
}

export function Room({ neonA, neonB }: RoomProps) {
  const textures = useMemo(
    () => ({ city: cityTexture(), codeA: codeTexture(5), codeB: codeTexture(17), glow: radialTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)") }),
    []
  );
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  const mats = useMemo(
    () => ({
      led: new THREE.MeshBasicMaterial({ color: new THREE.Color(neonA).lerp(new THREE.Color("#ffffff"), 0.3), toneMapped: false }),
      bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(neonB).lerp(new THREE.Color("#ffffff"), 0.6), toneMapped: false }),
      city: new THREE.MeshBasicMaterial({ map: textures.city, toneMapped: false }),
      screenA: new THREE.MeshBasicMaterial({ map: textures.codeA, toneMapped: false }),
      screenB: new THREE.MeshBasicMaterial({ map: textures.codeB, toneMapped: false }),
      // Soft additive halos stand in for bloom around the screens and the bulb
      screenGlow: new THREE.MeshBasicMaterial({ map: textures.glow, color: "#8fe9df", transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      bulbGlow: new THREE.MeshBasicMaterial({ map: textures.glow, color: neonB, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      wall: new THREE.MeshLambertMaterial({ color: "#0f191a" }),
      dark: new THREE.MeshStandardMaterial({ color: "#0a0d0e", roughness: 0.4, metalness: 0.5 }),
      wood: new THREE.MeshLambertMaterial({ color: "#2b231e" }),
      fabric: new THREE.MeshLambertMaterial({ color: "#1b1f21" }),
      metal: new THREE.MeshStandardMaterial({ color: "#5b6466", roughness: 0.3, metalness: 1 }),
    }),
    [textures, neonA, neonB]
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const deskZ = -6.5;

  return (
    <group>
      {/* Shell */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.wall} position={[s * ROOM.halfW, ROOM.height / 2, MID_Z]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[LENGTH, ROOM.height]} />
        </mesh>
      ))}
      <mesh material={mats.wall} position={[0, ROOM.height, MID_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.halfW * 2, LENGTH]} />
      </mesh>
      {/* Back wall around the window */}
      <mesh material={mats.wall} position={[0, ROOM.height / 2, ROOM.back]}>
        <planeGeometry args={[ROOM.halfW * 2, ROOM.height]} />
      </mesh>
      <mesh material={mats.city} position={[0, 1.85, ROOM.back + 0.02]}>
        <planeGeometry args={[4.8, 2.1]} />
      </mesh>
      {/* Window frame and mullions */}
      {[-2.4, -0.8, 0.8, 2.4].map((x) => (
        <mesh key={x} material={mats.dark} position={[x, 1.85, ROOM.back + 0.05]}>
          <boxGeometry args={[0.07, 2.18, 0.06]} />
        </mesh>
      ))}
      {[0.8, 2.9].map((y) => (
        <mesh key={y} material={mats.dark} position={[0, y, ROOM.back + 0.05]}>
          <boxGeometry args={[4.87, 0.07, 0.06]} />
        </mesh>
      ))}
      {/* Ceiling LED coves */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.led} position={[s * (ROOM.halfW - 0.05), ROOM.height - 0.04, MID_Z]}>
          <boxGeometry args={[0.02, 0.02, LENGTH]} />
        </mesh>
      ))}

      <Shelves side={-1} ledColor={mats.led} />
      <Shelves side={1} ledColor={mats.led} />

      {/* Desk */}
      <group position={[0, 0, deskZ]}>
        <RoundedBox args={[2.7, 0.06, 0.85]} radius={0.02} smoothness={3} position={[0, 0.76, 0]} material={mats.wood} />
        <mesh material={mats.dark} position={[-1.0, 0.365, 0]}>
          <boxGeometry args={[0.5, 0.73, 0.78]} />
        </mesh>
        <mesh material={mats.dark} position={[1.28, 0.365, 0]}>
          <boxGeometry args={[0.05, 0.73, 0.78]} />
        </mesh>

        {/* Two monitors full of code */}
        {(
          [
            [-0.53, 0.13, mats.screenA],
            [0.53, -0.13, mats.screenB],
          ] as const
        ).map(([x, ry, screen], i) => (
          <group key={i} position={[x, 1.24, -0.18]} rotation={[0, ry, 0]}>
            <RoundedBox args={[1.02, 0.62, 0.04]} radius={0.015} smoothness={3} material={mats.dark} />
            <mesh material={screen} position={[0, 0.01, 0.021]}>
              <planeGeometry args={[0.96, 0.56]} />
            </mesh>
            <mesh material={mats.screenGlow} position={[0, 0.01, 0.05]} scale={[1.9, 1.3, 1]}>
              <planeGeometry args={[1, 1]} />
            </mesh>
            <mesh material={mats.dark} position={[0, -0.38, -0.04]}>
              <boxGeometry args={[0.05, 0.2, 0.03]} />
            </mesh>
          </group>
        ))}
        <mesh material={mats.dark} position={[0, 0.8, -0.2]}>
          <boxGeometry args={[0.5, 0.02, 0.16]} />
        </mesh>

        {/* Keyboard with an underglow, mouse and mug */}
        <RoundedBox args={[0.66, 0.03, 0.21]} radius={0.01} smoothness={2} position={[0, 0.805, 0.17]} material={mats.dark} />
        <mesh material={mats.led} position={[0, 0.79, 0.28]}>
          <boxGeometry args={[0.6, 0.006, 0.006]} />
        </mesh>
        <RoundedBox args={[0.06, 0.025, 0.1]} radius={0.012} smoothness={2} position={[0.48, 0.8, 0.18]} material={mats.dark} />
        <mesh position={[0.75, 0.84, 0.05]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
          <meshLambertMaterial color="#d9d4cc" />
        </mesh>

        {/* Desk lamp */}
        <group position={[1.24, 0.79, -0.22]}>
          <mesh material={mats.metal} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.04, 20]} />
          </mesh>
          <mesh material={mats.metal} position={[-0.05, 0.27, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
          </mesh>
          <mesh material={mats.metal} position={[-0.14, 0.56, 0.06]} rotation={[0.3, 0, 1.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          </mesh>
          <mesh material={mats.dark} position={[-0.28, 0.6, 0.12]} rotation={[0, 0, 2.4]}>
            <coneGeometry args={[0.1, 0.16, 20, 1, true]} />
          </mesh>
          <mesh material={mats.bulb} position={[-0.31, 0.56, 0.12]}>
            <sphereGeometry args={[0.03, 12, 10]} />
          </mesh>
          <mesh material={mats.bulbGlow} position={[-0.31, 0.5, 0.2]} scale={0.7}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <pointLight position={[-0.32, 0.5, 0.2]} color={neonB} intensity={7} distance={5} decay={1.6} />
        </group>

        <Plant position={[-0.95, 0.79, -0.15]} scale={0.7} color="#2c6a4c" />
      </group>

      {/* Office chair, turned toward the door */}
      <group position={[0.75, 0, deskZ + 1.05]} rotation={[0, 0.5, 0]}>
        <RoundedBox args={[0.56, 0.09, 0.54]} radius={0.04} smoothness={3} position={[0, 0.52, 0]} material={mats.fabric} />
        <RoundedBox args={[0.5, 0.78, 0.08]} radius={0.04} smoothness={3} position={[0, 0.98, 0.27]} rotation={[-0.12, 0, 0]} material={mats.fabric} />
        <mesh material={mats.metal} position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.45, 10]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={mats.dark} position={[Math.sin((i / 5) * Math.PI * 2) * 0.17, 0.05, Math.cos((i / 5) * Math.PI * 2) * 0.17]} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
            <boxGeometry args={[0.04, 0.03, 0.34]} />
          </mesh>
        ))}
      </group>

      <Plant position={[-2.9, 0, -7.4]} scale={2.1} />
      <Plant position={[2.85, 0, -7.3]} scale={1.8} color="#285a44" />

      {/* One fill light for the room (plus the lamp): the screens, LEDs and city are unlit
          emissive surfaces with additive halos, so they glow without costing lights. */}
      <pointLight position={[0, 2.5, -4.8]} color="#7fd6d8" intensity={9} distance={9} decay={1.3} />
    </group>
  );
}
