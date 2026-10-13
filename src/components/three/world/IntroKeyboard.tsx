import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { RBox as RoundedBox } from "./geometry";
import * as THREE from "three";
import { Keycap, KEY_DEPTH, sharedMatcap, useKeyMaterial, useLabelTexture } from "./keycap";
import { INTRO, KEY_TIMES, NAME_KEYS, NAME_ROWS, PRESS_TIME, clamp01, smooth, type WorldState } from "./timeline";
import { radialTexture } from "./textures";

/** Where the keyboard floats in the corridor, in front of the door. */
export const KEYBOARD_POS = new THREE.Vector3(0, 0.95, 4.4);
const KEY_SCALE = 0.4;
const PITCH = 0.46;
const UNLIT = new THREE.Color("#2a3438");
const WHITE = new THREE.Color("#ffffff");

interface KeySpec {
  label: string;
  index: number;
  x: number;
  z: number;
  width: number;
  enter?: boolean;
}

function layout(): KeySpec[] {
  const specs: KeySpec[] = [];
  let index = 0;
  NAME_ROWS.forEach((row, r) => {
    const enterW = 1.55;
    const rowW = row.length * PITCH + (r === 1 ? enterW * KEY_SCALE + 0.06 : 0);
    let x = -rowW / 2 + PITCH / 2;
    for (const char of row) {
      specs.push({ label: char, index: index++, x, z: (r - 0.5) * PITCH, width: 1 });
      x += PITCH;
    }
    if (r === 1) specs.push({ label: "↵", index: NAME_KEYS, x: x - PITCH / 2 + 0.03 + (enterW * KEY_SCALE) / 2, z: (r - 0.5) * PITCH, width: enterW, enter: true });
  });
  return specs;
}

interface KeyProps {
  spec: KeySpec;
  world: MutableRefObject<WorldState>;
  lit: THREE.Color;
}

function NameKey({ spec, world, lit }: KeyProps) {
  const material = useKeyMaterial(UNLIT.getStyle());
  const legend = useLabelTexture(spec.enter ? "enter ↵" : spec.label, spec.width, "#ffffff");
  const legendMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ map: legend, transparent: true, toneMapped: false, depthWrite: false, color: "#7d8a8c" }),
    [legend]
  );
  useEffect(() => () => legendMaterial.dispose(), [legendMaterial]);

  const root = useRef<THREE.Group>(null);
  const cap = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const sim = useRef({ drop: 4, vel: 0, launched: false, lv: new THREE.Vector3(), spin: new THREE.Vector3(), glow: 0, base: new THREE.Vector3() });
  const dark = useMemo(() => new THREE.Color("#06201f"), []);

  useFrame((_, rawDelta) => {
    const t = world.current.intro;
    const dt = Math.min(rawDelta, 1 / 20);
    const s = sim.current;
    if (!root.current || !cap.current || !top.current) return;

    // Drop onto the deck with a bouncy spring, one after another
    const born = spec.enter ? INTRO.enterIn : 0.25 + spec.index * 0.07;
    if (t >= born) {
      for (let left = dt; left > 0; left -= 1 / 120) {
        const h = Math.min(left, 1 / 120);
        s.vel += (-90 * s.drop - 11 * s.vel) * h;
        s.drop += s.vel * h;
      }
    }
    const visible = t >= born - 0.05 && t < INTRO.launch + 1.6;
    root.current.visible = visible;

    // Typed: lights up in the brand colour and dips
    const pressAt = spec.enter ? INTRO.enterPress : KEY_TIMES[spec.index];
    const typed = t >= pressAt;
    const pressing = typed && t - pressAt < PRESS_TIME;
    const press = pressing ? Math.sin(((t - pressAt) / PRESS_TIME) * Math.PI) : 0;
    top.current.position.y = -press * 0.13;
    s.glow = THREE.MathUtils.damp(s.glow, typed ? 1 : 0, 10, dt);
    const m = material as THREE.MeshMatcapMaterial;
    m.color.copy(UNLIT).lerp(lit, s.glow);
    // Flash brighter on the press, then settle into the key's colour
    const flash = typed ? Math.max(0, 1 - (t - pressAt) / 0.5) : 0;
    if (flash > 0) m.color.lerp(WHITE, flash * 0.55);
    if (spec.enter && !typed && t >= INTRO.enterIn) {
      // Enter pulses, asking to be pressed
      m.color.copy(UNLIT).lerp(lit, 0.45 + 0.4 * Math.sin(t * 9));
    }
    (legendMaterial.color as THREE.Color).set(typed ? dark : "#7d8a8c");

    // Launch: every key shoots up and tumbles away
    if (t >= INTRO.launch && !s.launched) {
      s.launched = true;
      const r = Math.sin(spec.index * 91.7) * 0.5 + 0.5;
      s.lv.set((spec.x / 1.4) * 2 + (r - 0.5) * 1.5, 3 + r * 2, -0.8 - r);
      s.spin.set((r - 0.5) * 10, (r - 0.3) * 8, (0.5 - r) * 9);
    }
    const base = s.base.set(spec.x, 0.08 + (KEY_DEPTH * KEY_SCALE) / 2 + s.drop * 0.6, spec.z);
    if (s.launched) {
      const lt = Math.max(0, t - INTRO.launch - spec.index * 0.02);
      base.addScaledVector(s.lv, lt);
      base.y += 4.5 * lt * lt;
      cap.current.rotation.set(s.spin.x * lt, s.spin.y * lt, s.spin.z * lt);
    } else {
      cap.current.rotation.set(0, 0, s.drop * 0.15);
    }
    root.current.position.copy(base);
    const pop = spec.enter ? smooth((t - INTRO.enterIn) / 0.25) : 1;
    root.current.scale.setScalar(KEY_SCALE * (0.4 + 0.6 * pop));
  });

  return (
    <group ref={root} position={[spec.x, 0.2, spec.z]} scale={KEY_SCALE}>
      <Keycap ref={cap} width={spec.width} material={material} legend={legend} legendMaterial={legendMaterial} topRef={top} />
    </group>
  );
}

interface IntroKeyboardProps {
  world: MutableRefObject<WorldState>;
  ramp: [string, string, string];
}

/** A glossy keyboard that rises out of the dark, types the name, hits Enter and launches its keys. */
export function IntroKeyboard({ world, ramp }: IntroKeyboardProps) {
  const specs = useMemo(layout, []);
  const colors = useMemo(() => {
    const [a, b, c] = ramp.map((h) => new THREE.Color(h));
    return specs.map((s) => {
      const u = s.enter ? 0 : s.index / (NAME_KEYS - 1);
      return u < 0.5 ? a.clone().lerp(b, u * 2) : b.clone().lerp(c, (u - 0.5) * 2);
    });
  }, [specs, ramp]);

  const glow = useMemo(() => radialTexture("rgba(255,255,255,0.8)", "rgba(255,255,255,0)"), []);
  useEffect(() => () => glow.dispose(), [glow]);

  const group = useRef<THREE.Group>(null);
  const deck = useRef<THREE.Group>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const t = world.current.intro;
    if (!group.current || !deck.current) return;
    const shown = t >= 0 && t < INTRO.launch + 1.6 && !world.current.reduceMotion;
    group.current.visible = shown;
    if (!shown) return;
    // Rise in, then sink away once the keys have launched
    const rise = 1 - Math.pow(1 - clamp01((t - INTRO.keyboardIn) / 0.9), 3);
    const sink = smooth((t - INTRO.launch - 0.15) / 0.8);
    group.current.position.set(KEYBOARD_POS.x, KEYBOARD_POS.y - (1 - rise) * 0.8 - sink * 1.2, KEYBOARD_POS.z);
    deck.current.scale.setScalar(1 - sink * 0.4);
    const typed = KEY_TIMES.filter((k) => t >= k).length / NAME_KEYS;
    if (halo.current) halo.current.opacity = rise * (0.15 + typed * 0.3) * (1 - sink);
  });

  return (
    <>
      <group ref={group} position={KEYBOARD_POS.toArray()} rotation={[0.18, 0, 0]}>
        <group ref={deck}>
          <RoundedBox args={[3.15, 0.16, 1.25]} radius={0.08} smoothness={4}>
            <meshMatcapMaterial color="#1c2427" matcap={sharedMatcap()} />
          </RoundedBox>
          {/* Soft glow underneath, like the deck is hovering on light */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} scale={[5, 2.6, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial ref={halo} map={glow} color={ramp[0]} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
        {specs.map((spec, i) => (
          <NameKey key={spec.index} spec={spec} world={world} lit={colors[i]} />
        ))}
      </group>
    </>
  );
}
