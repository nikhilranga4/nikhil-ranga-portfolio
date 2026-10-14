import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFont, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { TextGeometry } from "three-stdlib";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARRIVAL_MS, CAB_MODELS, CAR_MODELS, LETTER_DROP_MS, LETTER_GAP_MS, NAME_LOAD, arrivalPose, convoy } from "@/lib/convoy";
import type { PaletteColors } from "@/lib/palettes";
import { ROUTE_FROM, cameraD, getRoute, pageToRoad, routeAt, type Route, type RoutePoint } from "./route";
import { CARD_PLANE, ROAD, ROAD_HALF, ROAD_X0, STREET_Y, clamp01, fallBlend, hoverHeight, landedAt, roadScale, type WorldState } from "./timeline";
import { oversizeTexture, radialTexture, roadTexture, softRectTexture, zebraTexture } from "./textures";

/** Kenney City Kit (Commercial), CC0: 16 buildings merged into one compressed file */
const CITY_URL = "/models/city/city.glb";
/** Kenney Car Kit, CC0: 15 vehicles merged into one compressed file */
const CARS_URL = "/models/cars/cars.glb";
/** Poly Haven skies (CC0), graded to JPG */
const SKY_URLS = ["/sky/sky-night.jpg", "/sky/sky-day.jpg"];
/** Helvetiker Bold (MgOpen Moderna), just the name's letters, for the 3D name on the last truck */
const FONT_URL = "/fonts/name-3d.typeface.json";
/** The name's letters: one word per line on the bed ("NIKHIL" above "RANGA"), loaded in reading order */
const NAME_LETTERS = NAME_LOAD.split(" ").flatMap((word, row) => word.split("").map((ch, col) => ({ ch, row, col })));
const NAME_LINES = NAME_LOAD.split(" ").length;
/** Letters lie flat on the bed, face up (0 = flat), so they read straight from the camera above */
const LETTER_LEAN = 0;

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
} as const;
type Kind = keyof typeof KIT;
/** Low enough that their roofs stay well under the hovering camera */
const FRONT_ROW: Kind[] = ["building-f", "building-g", "building-i", "building-l", "building-m", "building-skyscraper-a"];
const BACK_ROW: Kind[] = ["building-skyscraper-b", "building-skyscraper-c", "building-skyscraper-e", "building-l", "building-m", "building-i"];

const PAVE = 4;
/** Each row of buildings runs on this far past its leg's corners (overlaps are dropped) */
const ROW_RUN = 30;
/** Back rows sit this much further from the road than the front rows, on the left / right */
const BACK_OFFSET = { [-1]: 15, [1]: 17 } as const;
/** The tower we fell from (a real skyscraper, stretched to reach the street) */
const TOWER = { x: 0, z: 8, w: 15, d: 15 };

/** Ambient traffic wraps around the camera over this length of road */
const TRAFFIC_SPAN = 140;
/** Most instances of one vehicle model on screen at once */
const CAP = 10;
const VEHICLES = [...new Set<string>([...CAB_MODELS, ...CAR_MODELS])];

interface Placement {
  kind: Kind;
  x: number;
  z: number;
  rot: number;
  scale: number;
  stretch?: [number, number, number];
}

/** Flat things on the road (pavements, junctions, crossings): a box or plane on the ground */
interface Patch {
  x: number;
  z: number;
  rot: number;
  sx: number;
  sz: number;
}

interface Lamp {
  x: number;
  z: number;
  rot: number;
  head: THREE.Vector3;
}

interface CityLayout {
  buildings: Placement[];
  /** Straight stretches of the avenue, as one textured strip each */
  strips: { x0: number; z0: number; x1: number; z1: number; nx: number; nz: number }[];
  junctions: Patch[];
  zebras: Patch[];
  pavements: Patch[];
  lamps: Lamp[];
  /** Ground: centre and size */
  ground: { x: number; z: number; sx: number; sz: number };
}

/**
 * `?convoy-debug`: exposes where each card's pivot projects on screen, to check that the trucks
 * stay locked to the cards (`window.__convoyDebug()` → page-space vs projected positions), and the
 * city laid out along the route (`window.__cityDebug()`).
 */
const debugPivots: { index: number; x: number; z: number; top: number; cx: number }[] | null =
  typeof location !== "undefined" && new URLSearchParams(location.search).has("convoy-debug") ? [] : null;

/** Small deterministic random (layout), or seeded per visit (traffic). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Axis-aligned box on the ground (every leg runs along x or z, so footprints are exact) */
type Box = [minX: number, minZ: number, maxX: number, maxZ: number];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * The city along the route: the avenue leg by leg with an L-junction at every corner, pavements,
 * lamps, and buildings lining both sides of every leg and wrapping round the corners. Buildings are
 * placed in rows along each leg; any that would land on a road or on another building are dropped,
 * so the outside of each bend and the block inside it fill in on their own.
 */
function cityLayout(route: Route): CityLayout {
  const rand = rng(11);
  const RH = ROAD_HALF;
  const { legs } = route;
  // Ground point `along` the leg from its start, `lateral` to its right
  const at = (leg: Route["legs"][number], along: number, lateral: number) => ({
    x: leg.x + leg.tx * along + leg.nx * lateral,
    z: leg.z + leg.tz * along + leg.nz * lateral,
  });
  const box = (cx: number, cz: number, alongSize: number, acrossSize: number, leg: Route["legs"][number]): Box => {
    const hx = (Math.abs(leg.tx) * alongSize + Math.abs(leg.nx) * acrossSize) / 2;
    const hz = (Math.abs(leg.tz) * alongSize + Math.abs(leg.nz) * acrossSize) / 2;
    return [cx - hx, cz - hz, cx + hx, cz + hz];
  };

  // ── Road, junctions, crossings, pavements ──
  const strips: CityLayout["strips"] = [];
  const junctions: Patch[] = [];
  const zebras: Patch[] = [];
  const pavements: Patch[] = [];
  const blocked: Box[] = [];
  legs.forEach((leg) => {
    const len = leg.to - leg.from;
    const a0 = leg.turnIn ? RH : 0;
    const a1 = leg.turnOut ? len - RH : len;
    const p0 = at(leg, a0, 0);
    const p1 = at(leg, a1, 0);
    strips.push({ x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z, nx: leg.nx, nz: leg.nz });
    // Nothing gets built on the road or its pavements (junctions included)
    const b0 = leg.turnIn ? -RH - PAVE : 0;
    const b1 = leg.turnOut ? len + RH + PAVE : len;
    const mid = at(leg, (b0 + b1) / 2, 0);
    blocked.push(box(mid.x, mid.z, b1 - b0 + 0.6, 2 * (RH + PAVE) + 0.6, leg));
    if (leg.turnOut) {
      const c = at(leg, len, 0);
      junctions.push({ x: c.x, z: c.z, rot: 0, sx: 2 * RH, sz: 2 * RH });
    }
    // A crossing over each arm of a junction
    if (leg.turnIn) {
      const z = at(leg, RH + 2.6, 0);
      zebras.push({ x: z.x, z: z.z, rot: -leg.heading, sx: 4, sz: 2 * RH });
    }
    if (leg.turnOut) {
      const z = at(leg, len - RH - 2.6, 0);
      zebras.push({ x: z.x, z: z.z, rot: -leg.heading, sx: 4, sz: 2 * RH });
    }
    // Pavements: the inside of a bend stops at the junction, the outside runs round it
    for (const side of [-1, 1]) {
      const s0 = leg.turnIn ? (side === leg.turnIn ? RH : -RH - PAVE) : 0;
      const s1 = leg.turnOut ? (side === leg.turnOut ? len - RH : len + RH + PAVE) : len;
      const c = at(leg, (s0 + s1) / 2, side * (RH + PAVE / 2));
      pavements.push({ x: c.x, z: c.z, rot: -leg.heading, sx: s1 - s0, sz: PAVE });
    }
  });

  // ── Lamps along the straight stretches, staggered from side to side ──
  const lamps: Lamp[] = [];
  legs.forEach((leg) => {
    const len = leg.to - leg.from;
    const lo = leg.turnIn ? RH + 3 : -Infinity;
    const hi = leg.turnOut ? len - RH - 3 : Infinity;
    for (let a = 6; a < len; a += 24) {
      for (const [side, along] of [
        [-1, a],
        [1, a + 12],
      ] as const) {
        if (along < lo || along > hi || along > len) continue;
        const base = at(leg, along, side * (RH + 0.8));
        const head = at(leg, along, side * (RH + 0.8 - 2.5));
        // The arm (local +z) reaches out over the road
        lamps.push({ x: base.x, z: base.z, rot: (side < 0 ? 0 : Math.PI) - leg.heading, head: new THREE.Vector3(head.x, STREET_Y + 6.9, head.z) });
      }
    }
  });

  // ── Buildings: front rows first (they win the corners), then the back rows ──
  const buildings: Placement[] = [];
  const taken: Box[] = [[TOWER.x - TOWER.w / 2, TOWER.z - TOWER.d / 2, TOWER.x + TOWER.w / 2, TOWER.z + TOWER.d / 2]];
  const row = (leg: Route["legs"][number], kinds: Kind[], side: 1 | -1, offset: number, scale: number) => {
    const len = leg.to - leg.from;
    let a = -ROW_RUN;
    while (a < len + ROW_RUN) {
      const kind = kinds[Math.floor(rand() * kinds.length)];
      const [w, d] = KIT[kind];
      const s = scale * (0.9 + rand() * 0.25);
      const half = (w * s) / 2;
      const along = a + half;
      const c = at(leg, along, side * (RH + PAVE + offset + (d * s) / 2));
      const foot = box(c.x, c.z, w * s, d * s, leg);
      const grown: Box = [foot[0] - 0.4, foot[1] - 0.4, foot[2] + 0.4, foot[3] + 0.4];
      if (blocked.some((b) => overlaps(foot, b)) || taken.some((b) => overlaps(grown, b))) {
        a += 3;
        continue;
      }
      taken.push(foot);
      // Facing the road
      buildings.push({ kind, x: c.x, z: c.z, rot: (side > 0 ? Math.PI : 0) - leg.heading, scale: s });
      a = along + half + 1.5 + rand() * 3;
    }
  };
  for (const leg of legs) for (const side of [-1, 1] as const) row(leg, FRONT_ROW, side, 0, 6);
  for (const leg of legs) for (const side of [-1, 1] as const) row(leg, BACK_ROW, side, BACK_OFFSET[side], 6.5);

  // ── Ground under all of it ──
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const leg of legs) {
    const e = at(leg, leg.to - leg.from, 0);
    minX = Math.min(minX, leg.x, e.x);
    maxX = Math.max(maxX, leg.x, e.x);
    minZ = Math.min(minZ, leg.z, e.z);
    maxZ = Math.max(maxZ, leg.z, e.z);
  }
  const ground = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, sx: maxX - minX + 800, sz: maxZ - minZ + 800 };

  return { buildings, strips, junctions, zebras, pavements, lamps, ground };
}

/** The avenue's straight stretches as one mesh, the lane texture tiling every 12 units */
function stripGeometry(strips: CityLayout["strips"]) {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const y = STREET_Y + 0.01;
  strips.forEach((st, i) => {
    const len = Math.hypot(st.x1 - st.x0, st.z1 - st.z0);
    const lx = -st.nx * ROAD_HALF;
    const lz = -st.nz * ROAD_HALF;
    // Start-left, end-left, end-right, start-right
    pos.push(st.x0 + lx, y, st.z0 + lz, st.x1 + lx, y, st.z1 + lz, st.x1 - lx, y, st.z1 - lz, st.x0 - lx, y, st.z0 - lz);
    uv.push(0, 1, len / 12, 1, len / 12, 0, 0, 0);
    const o = i * 4;
    // Wound to face up
    index.push(o, o + 2, o + 1, o, o + 3, o + 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

interface VehicleShape {
  geometry: THREE.BufferGeometry;
  length: number;
  width: number;
  height: number;
}

/**
 * One vehicle (body and wheels) as a single plain geometry: the compressed attributes are expanded
 * and each part's transform baked in, so every vehicle is one instanced draw.
 */
function vehicleShape(root: THREE.Object3D): VehicleShape | null {
  root.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.geometry;
    const g = new THREE.BufferGeometry();
    for (const name of ["position", "normal", "uv"] as const) {
      const a = src.getAttribute(name);
      if (!a) continue;
      const size = a.itemSize;
      const arr = new Float32Array(a.count * size);
      for (let i = 0; i < a.count; i++) {
        arr[i * size] = a.getX(i);
        if (size > 1) arr[i * size + 1] = a.getY(i);
        if (size > 2) arr[i * size + 2] = a.getZ(i);
      }
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    if (src.index) g.setIndex(Array.from(src.index.array as ArrayLike<number>));
    g.applyMatrix4(mesh.matrixWorld);
    parts.push(g);
  });
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts) ?? parts[0];
  parts.forEach((p) => p !== geometry && p.dispose());
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return { geometry, length: box.max.z - box.min.z, width: box.max.x - box.min.x, height: box.max.y };
}

interface RoadSceneProps {
  world: MutableRefObject<WorldState>;
  /** Theme colours, for the 3D name's gradient */
  colors: PaletteColors;
  /** Lighter traffic for phones / integrated GPUs */
  lite: boolean;
}

/**
 * Where the fall ends: a six-lane avenue seen from straight above, lined with real buildings
 * (Kenney City Kit) and busy with real traffic (Kenney Car Kit), turning right or left between
 * every two sections (see route.ts). Every page section rides on a wide-load truck in the convoy
 * up the middle of it; the cards themselves are page HTML and this draws everything around them,
 * mapped so each truck stays exactly under its card (the camera turns with the road, so the cards
 * stay upright while the city swings round under them). Night and day swap textures and light
 * levels on the same materials (no shader recompiles).
 */
export function RoadScene({ world, lite, colors }: RoadSceneProps) {
  const { gl, scene, camera } = useThree();
  const cityKit = useGLTF(CITY_URL);
  const cars = useGLTF(CARS_URL);
  const font = useFont(FONT_URL);
  const [skyNight, skyDay] = useTexture(SKY_URLS);

  // ── Models ──
  const { buildings, cityMap } = useMemo(() => {
    const meshes: Record<string, THREE.Mesh> = {};
    let map: THREE.Texture | null = null;
    for (const sc of cityKit.scenes) {
      sc.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // The loader de-duplicates names ("building-f_1"): key by the original name
        meshes[m.name.replace(/_\d+$/, "")] = m;
        map ??= (m.material as THREE.MeshStandardMaterial).map;
      });
    }
    return { buildings: meshes, cityMap: map };
  }, [cityKit]);

  const { shapes, carMap } = useMemo(() => {
    const out: Record<string, VehicleShape> = {};
    let map: THREE.Texture | null = null;
    for (const sc of cars.scenes) {
      const shape = vehicleShape(sc);
      if (shape) out[sc.name] = shape;
      sc.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) map ??= (m.material as THREE.MeshStandardMaterial).map;
      });
    }
    return { shapes: out, carMap: map };
  }, [cars]);
  useEffect(() => () => Object.values(shapes).forEach((s) => s.geometry.dispose()), [shapes]);

  // ── The name in 3D: one extruded, bevelled geometry per distinct letter ──
  const letterGeos = useMemo(() => {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const { ch } of NAME_LETTERS) {
      if (out.has(ch)) continue;
      const g = new TextGeometry(ch, { font, size: 1, height: 0.34, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035 }) as unknown as THREE.BufferGeometry;
      g.center();
      g.computeBoundingBox();
      out.set(ch, g);
    }
    return out;
  }, [font]);
  useEffect(() => () => letterGeos.forEach((g) => g.dispose()), [letterGeos]);
  // Where each letter sits across its line (in font units, centred), spaced by the font's own
  // advance widths so the words read like set type; and the widest line, to fit the bed
  const nameLayout = useMemo(() => {
    const data = (font as unknown as { data: { resolution: number; glyphs: Record<string, { ha: number }> } }).data;
    const advance = (ch: string) => (data.glyphs[ch]?.ha ?? data.resolution * 0.7) / data.resolution;
    // Extra space between letters (font units), so each one stands apart on the bed
    const TRACKING = 0.15;
    const words = NAME_LOAD.split(" ");
    const span = (word: string) => word.split("").reduce((a, ch) => a + advance(ch), 0) + TRACKING * (word.length - 1);
    const offsets = words.map((word) => {
      let x = -span(word) / 2;
      return word.split("").map((ch) => {
        const wd = advance(ch);
        const center = x + wd / 2;
        x += wd + TRACKING;
        return center;
      });
    });
    const widest = Math.max(...words.map(span));
    return { offsets, widest };
  }, [font]);
  // Gradient across the name, like the old wordmark: brand 1 → 3 → 2
  const letterMats = useMemo(() => {
    const a = new THREE.Color(colors.c1);
    const b = new THREE.Color(colors.c3);
    const c = new THREE.Color(colors.c2);
    return NAME_LETTERS.map((_, i) => {
      const t = i / (NAME_LETTERS.length - 1);
      const color = t < 0.5 ? a.clone().lerp(b, t * 2) : b.clone().lerp(c, t * 2 - 1);
      return new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.3, emissive: color.clone(), emissiveIntensity: 0 });
    });
  }, [colors]);
  useEffect(() => () => letterMats.forEach((m) => m.dispose()), [letterMats]);

  // ── Textures, environment ──
  const tex = useMemo(
    () => ({
      roadNight: roadTexture("night"),
      roadDay: roadTexture("day"),
      zebra: zebraTexture(),
      soft: softRectTexture(),
      sign: oversizeTexture(),
      glow: radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"),
    }),
    []
  );
  useEffect(() => {
    return () => Object.values(tex).forEach((t) => t.dispose());
  }, [tex]);

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

  // ── Materials (Lambert/basic only: a screen full of road stays cheap) ──
  const mats = useMemo(
    () => ({
      city: new THREE.MeshLambertMaterial({ map: cityMap, emissiveMap: cityMap, emissive: new THREE.Color(0, 0, 0) }),
      vehicle: new THREE.MeshLambertMaterial({ map: carMap, emissiveMap: carMap, emissive: new THREE.Color(0, 0, 0) }),
      ground: new THREE.MeshLambertMaterial({ color: "#11181b" }),
      road: new THREE.MeshLambertMaterial({ map: tex.roadNight }),
      cross: new THREE.MeshLambertMaterial({ color: "#151b1e" }),
      zebra: new THREE.MeshLambertMaterial({ map: tex.zebra, transparent: true, depthWrite: false }),
      pave: new THREE.MeshLambertMaterial({ color: "#2b3236" }),
      lamp: new THREE.MeshLambertMaterial({ color: "#3a4246" }),
      trailer: new THREE.MeshLambertMaterial({ color: "#2c3235" }),
      sign: new THREE.MeshLambertMaterial({ map: tex.sign }),
      beacon: new THREE.MeshBasicMaterial({ color: "#ffb21a", toneMapped: false }),
      tail: new THREE.MeshBasicMaterial({ color: "#ff3b30", toneMapped: false }),
      tyre: new THREE.MeshLambertMaterial({ color: "#141719" }),
      blob: new THREE.MeshBasicMaterial({ color: "#000000", alphaMap: tex.soft, transparent: true, opacity: 0.5, depthWrite: false }),
      cardShadow: new THREE.MeshBasicMaterial({ color: "#000000", alphaMap: tex.soft, transparent: true, opacity: 0.45, depthWrite: false }),
      pool: new THREE.MeshBasicMaterial({ map: tex.glow, color: "#ffcf8a", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      glows: new THREE.PointsMaterial({ map: tex.glow, size: 1.6, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      sky: new THREE.MeshBasicMaterial({ map: skyNight, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    }),
    [cityMap, carMap, tex, skyNight]
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // ── Static geometry ──
  const geo = useMemo(() => {
    const flat = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const pole = new THREE.BoxGeometry(0.24, 7, 0.24).translate(0, 3.5, 0);
    const arm = new THREE.BoxGeometry(0.2, 0.2, 2.6).translate(0, 7, 1.3);
    const lamp = mergeGeometries([pole, arm]) ?? pole;
    if (lamp !== pole) pole.dispose();
    arm.dispose();
    return { flat: flat(), box: new THREE.BoxGeometry(1, 1, 1), lamp };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  // The road turns at every section, so the city is laid out from the measured page (and again
  // if the sections move, which in practice settles long before the road comes into view)
  const [route, setRoute] = useState(() => getRoute(world.current));
  const city = useMemo(() => cityLayout(route), [route]);
  const roadGeo = useMemo(() => stripGeometry(city.strips), [city]);
  useEffect(() => () => roadGeo.dispose(), [roadGeo]);
  const byKind = useMemo(() => {
    const groups = new Map<Kind, Placement[]>();
    groups.set("building-skyscraper-c", [{ kind: "building-skyscraper-c", x: TOWER.x, z: TOWER.z, rot: 0, scale: 1, stretch: [TOWER.w / 1.28, (-0.4 - STREET_Y) / KIT["building-skyscraper-c"][2], TOWER.d / 1.39] }]);
    for (const p of city.buildings) groups.set(p.kind, [...(groups.get(p.kind) ?? []), p]);
    return [...groups.entries()];
  }, [city]);
  const { lamps } = city;

  // Seeded per visit: which cars, in which lanes, how fast
  const traffic = useMemo(() => {
    const rand = rng(convoy.trafficSeed);
    const lanes = [
      { lane: 0, dir: 1 },
      { lane: 1, dir: 1 },
      { lane: 4, dir: -1 },
      { lane: 5, dir: -1 },
    ];
    const perLane = lite ? 2 : 3;
    return lanes.flatMap(({ lane, dir }) =>
      Array.from({ length: perLane }, (_, i) => ({
        model: CAR_MODELS[Math.floor(rand() * CAR_MODELS.length)],
        lateral: (lane - 2.5) * ROAD.lane + (rand() - 0.5) * 0.5,
        dir,
        base: ((i + rand() * 0.6) / perLane) * TRAFFIC_SPAN,
        // Same way as the convoy: slower, so it overtakes them; oncoming: racing past
        speed: dir > 0 ? 0.45 + rand() * 0.25 : 0.9 + rand() * 0.5,
        tint: new THREE.Color().setHSL(rand(), 0.35, 0.82),
      }))
    );
  }, [lite]);

  const glowCap = lamps.length + 4 * (traffic.length + 2 * 12) + 6 * 12;
  const glowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(glowCap * 3), 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(glowCap * 3), 3));
    return g;
  }, [glowCap]);
  useEffect(() => () => glowGeo.dispose(), [glowGeo]);

  // ── Refs ──
  const root = useRef<THREE.Group>(null);
  const sky = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const skyLight = useRef<THREE.HemisphereLight>(null);
  const buildingRefs = useRef(new Map<Kind, THREE.InstancedMesh>());
  const vehicleRefs = useRef(new Map<string, THREE.InstancedMesh>());
  const lampMesh = useRef<THREE.InstancedMesh>(null);
  const poolMesh = useRef<THREE.InstancedMesh>(null);
  const paveMesh = useRef<THREE.InstancedMesh>(null);
  const zebraMesh = useRef<THREE.InstancedMesh>(null);
  const crossMesh = useRef<THREE.InstancedMesh>(null);
  const blobMesh = useRef<THREE.InstancedMesh>(null);
  const shadowMesh = useRef<THREE.InstancedMesh>(null);
  const trailerMesh = useRef<THREE.InstancedMesh>(null);
  const signMesh = useRef<THREE.InstancedMesh>(null);
  const beaconMesh = useRef<THREE.InstancedMesh>(null);
  const tailMesh = useRef<THREE.InstancedMesh>(null);
  const glowPoints = useRef<THREE.Points>(null);
  const wheelMesh = useRef<THREE.InstancedMesh>(null);
  const letterRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pendingRoute = useRef<Route | null>(null);

  const tmp = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      place: new THREE.Matrix4(),
      white: new THREE.Color(1, 1, 1),
      tint: new THREE.Color(),
      pivot: { x: 0, z: 0, heading: 0 } as RoutePoint,
      cam: { x: 0, z: 0, heading: 0 } as RoutePoint,
      car: { x: 0, z: 0, heading: 0 } as RoutePoint,
      basis: new THREE.Matrix4(),
      ax: new THREE.Vector3(),
      ay: new THREE.Vector3(),
      az: new THREE.Vector3(),
      counts: new Map<string, number>(),
      mode: "",
    }),
    []
  );
  const SLOTS = 12;

  // Everything static is placed once; instance colours exist before the up-front shader compile
  useLayoutEffect(() => {
    const { dummy, place } = tmp;
    for (const [kind, list] of byKind) {
      const mesh = buildingRefs.current.get(kind);
      const node = buildings[kind];
      if (!mesh || !node) continue;
      // Compressed (quantised) meshes carry a correcting transform on their node: keep it
      node.updateMatrix();
      list.forEach((p, i) => {
        dummy.position.set(p.x, STREET_Y, p.z);
        dummy.rotation.set(0, p.rot, 0);
        if (p.stretch) dummy.scale.set(...p.stretch);
        else dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        place.multiplyMatrices(dummy.matrix, node.matrix);
        mesh.setMatrixAt(i, place);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }

    const setAll = (mesh: THREE.InstancedMesh | null, items: { x: number; y: number; z: number; rot?: number; sx: number; sy?: number; sz: number }[]) => {
      if (!mesh) return;
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.rot ?? 0, 0);
        dummy.scale.set(it.sx, it.sy ?? 1, it.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    setAll(lampMesh.current, lamps.map((l) => ({ x: l.x, y: STREET_Y, z: l.z, rot: l.rot, sx: 1, sz: 1 })));
    setAll(poolMesh.current, lamps.map((l) => ({ x: l.head.x, y: STREET_Y + 0.04, z: l.head.z, sx: 11, sz: 11 })));
    setAll(paveMesh.current, city.pavements.map((p) => ({ ...p, y: STREET_Y + 0.12, sy: 0.24 })));
    setAll(zebraMesh.current, city.zebras.map((p) => ({ ...p, y: STREET_Y + 0.03 })));
    setAll(crossMesh.current, city.junctions.map((p) => ({ ...p, y: STREET_Y + 0.01 })));

    for (const mesh of vehicleRefs.current.values()) {
      for (let i = 0; i < CAP; i++) mesh.setColorAt(i, tmp.white);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Lamp heads: fixed at the start of the glow buffer
    const pos = glowGeo.attributes.position as THREE.BufferAttribute;
    const col = glowGeo.attributes.color as THREE.BufferAttribute;
    lamps.forEach((l, i) => {
      pos.setXYZ(i, l.head.x, l.head.y, l.head.z);
      col.setXYZ(i, 1.3, 1.05, 0.7);
    });
    pos.needsUpdate = col.needsUpdate = true;
  }, [tmp, byKind, buildings, lamps, city, glowGeo]);

  useEffect(() => {
    if (!debugPivots) return;
    const v = new THREE.Vector3();
    (window as unknown as { __convoyDebug: () => unknown }).__convoyDebug = () =>
      debugPivots.map((p) => {
        v.set(p.x, STREET_Y + CARD_PLANE, p.z).project(camera);
        return { index: p.index, pageX: p.cx, pageTop: p.top - world.current.scroll, screenX: ((v.x + 1) / 2) * world.current.vw, screenY: ((1 - v.y) / 2) * world.current.vh };
      });
    // And the city as laid out along the route (legs, junctions, buildings), for a map of it
    (window as unknown as { __cityDebug: () => unknown }).__cityDebug = () => ({ route, city, kit: KIT });
  }, [camera, world, route, city]);

  useFrame(() => {
    const w = world.current;
    const next = getRoute(w);
    if (next.layoutKey !== route.layoutKey && next !== pendingRoute.current) {
      pendingRoute.current = next;
      setRoute(next);
    }
    const { inFall, day } = fallBlend(w);
    const group = root.current;
    if (!group) return;
    group.visible = inFall > 0.001;
    if (!group.visible) return;

    // ── Night ↔ day: swap the sky, its lighting and a few tints (no recompile) ──
    const isDay = day > 0.5;
    const mode = isDay ? "day" : "night";
    if (mode !== tmp.mode) {
      tmp.mode = mode;
      mats.sky.map = isDay ? skyDay : skyNight;
      mats.road.map = isDay ? tex.roadDay : tex.roadNight;
      mats.ground.color.set(isDay ? "#7f8a7c" : "#11181b");
      mats.cross.color.set(isDay ? "#5d6468" : "#151b1e");
      mats.pave.color.set(isDay ? "#b7bcbd" : "#2b3236");
      mats.lamp.color.set(isDay ? "#5c6468" : "#3a4246");
      mats.sky.needsUpdate = mats.road.needsUpdate = true;
      scene.environment = isDay ? envs.day : envs.night;
    }
    scene.environmentIntensity = THREE.MathUtils.lerp(0.3, isDay ? 1.05 : 0.55, inFall);
    if (sun.current) {
      sun.current.intensity = inFall * (isDay ? 2.3 : 0.45);
      sun.current.color.set(isDay ? "#fff0d8" : "#9cc2ff");
    }
    if (skyLight.current) {
      skyLight.current.intensity = inFall * (isDay ? 1.5 : 0.95);
      skyLight.current.color.set(isDay ? "#e6f2ff" : "#46658a");
      skyLight.current.groundColor.set(isDay ? "#7a8288" : "#0b0f14");
    }
    const night = isDay ? 0 : inFall;
    mats.city.emissive.setRGB(0.2 * night, 0.17 * night, 0.13 * night);
    mats.vehicle.emissive.setRGB(0.1 * night, 0.1 * night, 0.12 * night);
    for (const m of letterMats) m.emissiveIntensity = 0.28 * night;
    mats.pool.opacity = 0.32 * night;
    mats.glows.opacity = night;
    mats.blob.opacity = isDay ? 0.42 : 0.6;
    mats.cardShadow.opacity = isDay ? 0.34 : 0.55;
    mats.sky.opacity = inFall;
    if (sky.current) sky.current.position.copy(camera.position);

    // ── Moving things ──
    const { dummy, counts, pivot } = tmp;
    counts.clear();
    const pos = glowGeo.attributes.position as THREE.BufferAttribute;
    const col = glowGeo.attributes.color as THREE.BufferAttribute;
    let glow = lamps.length;
    const addGlow = (x: number, y: number, z: number, r: number, g: number, b: number) => {
      if (glow >= glowCap) return;
      pos.setXYZ(glow, x, y, z);
      col.setXYZ(glow, r, g, b);
      glow++;
    };
    let blobs = 0;
    const blob = blobMesh.current;

    /** One vehicle on the road, its forward direction `theta` around y (0 = +z) */
    const putVehicle = (model: string, x: number, z: number, theta: number, scale: number, tint: THREE.Color) => {
      const mesh = vehicleRefs.current.get(model);
      const shape = shapes[model];
      const i = counts.get(model) ?? 0;
      if (!mesh || !shape || i >= CAP) return;
      counts.set(model, i + 1);
      dummy.position.set(x, STREET_Y, z);
      dummy.rotation.set(0, theta, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint);
      const fx = Math.sin(theta);
      const fz = Math.cos(theta);
      const len = (shape.length * scale) / 2;
      const half = shape.width * scale * 0.32;
      if (blob && blobs < blob.count) {
        dummy.position.set(x, STREET_Y + 0.02, z);
        dummy.scale.set(shape.width * scale * 1.45, 1, shape.length * scale * 1.3);
        dummy.updateMatrix();
        blob.setMatrixAt(blobs++, dummy.matrix);
      }
      if (night > 0) {
        const y = STREET_Y + 0.75 * scale;
        for (const s of [-1, 1]) {
          addGlow(x + fx * len + fz * half * s, y, z + fz * len - fx * half * s, 1.4, 1.25, 0.95);
          addGlow(x - fx * len + fz * half * s, y, z - fz * len - fx * half * s, 1.2, 0.12, 0.08);
        }
      }
    };

    const k = roadScale(w.vw);
    const camD = cameraD(w);
    const cam = routeAt(next, camD, 0, tmp.cam);
    // How far the convoy has driven (world units); negative while still falling
    const driven = camD - ROAD_X0 + k * (w.scroll - landedAt(w));
    for (const car of traffic) {
      const d = car.base + car.dir * car.speed * driven;
      const rel = ((((d - camD + TRAFFIC_SPAN / 2) % TRAFFIC_SPAN) + TRAFFIC_SPAN) % TRAFFIC_SPAN) - TRAFFIC_SPAN / 2;
      // Along its lane, round the corners too
      const p = routeAt(next, Math.max(ROUTE_FROM, camD + rel), car.lateral, tmp.car);
      putVehicle(car.model, p.x, p.z, (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading, 1.25, car.tint);
    }

    // The convoy: a truck under every card
    const H = hoverHeight(w.vw, w.vh);
    // Shadows lie on the road, below the card plane: scale them up so they line up with the cards
    const lift = H / (H - CARD_PLANE);
    const debug = debugPivots ? (debugPivots.length = 0, debugPivots) : null;
    let shadows = 0;
    let trailers = 0;
    let beacons = 0;
    let tails = 0;
    let wheels = 0;
    let nameShown = false;
    const wheelM = wheelMesh.current;
    const shadowM = shadowMesh.current;
    const trailerM = trailerMesh.current;
    const signM = signMesh.current;
    const beaconM = beaconMesh.current;
    const tailM = tailMesh.current;
    const putBox = (mesh: THREE.InstancedMesh | null, i: number, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number) => {
      if (!mesh || i >= mesh.count) return;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -yaw, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    };
    for (const [index, slot] of convoy.slots) {
      // Trucks only show up once they start driving in (and not when well off screen)
      if (!slot.width || slot.start < 0) continue;
      const screenTop = slot.top - w.scroll;
      if (screenTop > w.vh * 2 || screenTop + slot.height < -w.vh) continue;
      const plan = slot.plan;
      const u = slot.start < 0 ? 0 : slot.start === 0 ? 1 : clamp01((w.now - slot.start) / ARRIVAL_MS);
      const pose = arrivalPose(plan, u, w.vw, w.vh, slot.height);
      pageToRoad(w, slot.left + slot.width / 2 + pose.dx, slot.top + pose.dy, pivot);
      // Forward (up the screen) and right, on the road: the road's heading under the camera, plus
      // the truck's own swing as it pulls in
      const yaw = pivot.heading + pose.yaw;
      const fx = Math.cos(yaw);
      const fz = Math.sin(yaw);
      const rx = -fz;
      const rz = fx;
      const cardLen = slot.height * k;
      const cardW = slot.width * k;

      if (debug) debug.push({ index, x: pivot.x, z: pivot.z, top: slot.top + pose.dy, cx: slot.left + slot.width / 2 + pose.dx });

      // Cab: most of it ahead of the card, the back tucked under it
      const shape = shapes[plan.cab];
      if (shape) {
        const S = THREE.MathUtils.clamp((slot.gap * k * 0.5) / (0.62 * shape.length), 1.1, 2.7);
        const L = shape.length * S;
        // Under a card the back of the cab tucks beneath it; the name truck's bed is open, so its
        // cab drives fully ahead of it, hitched on with a short gap
        const NAME_HITCH = 0.7;
        const ahead = slot.kind === "name" ? L / 2 + NAME_HITCH : 0.12 * L;
        const cabX = pivot.x + fx * ahead;
        const cabZ = pivot.z + fz * ahead;
        if (slot.kind === "name") putBox(trailerM, trailers++, pivot.x + fx * NAME_HITCH * 0.5, STREET_Y + 1.1, pivot.z + fz * NAME_HITCH * 0.5, yaw, NAME_HITCH + 0.4, 0.3, 0.55);
        putVehicle(plan.cab, cabX, cabZ, Math.PI / 2 - yaw, S, tmp.tint.set(plan.tint));
        // Escort car riding alongside
        const escort = plan.escort ? shapes[plan.escort] : null;
        if (plan.escort && escort) {
          const off = plan.side * ((shape.width * S) / 2 + (escort.width * 1.25) / 2 + 0.8);
          putVehicle(plan.escort, cabX + fx * 0.3 * L + rx * off, cabZ + fz * 0.3 * L + rz * off, Math.PI / 2 - yaw, 1.25, tmp.white);
        }
        // Trailer end sticking out behind the card, with its sign and tail lights
        const tw = shape.width * S * 1.05;
        const backX = pivot.x - fx * (cardLen + 0.75);
        const backZ = pivot.z - fz * (cardLen + 0.75);
        putBox(trailerM, trailers, backX, STREET_Y + 1.9, backZ, yaw, 1.5, 2.4, tw);
        if (signM && trailers < signM.count) {
          dummy.position.set(backX - fx * 0.1, STREET_Y + 3.12, backZ - fz * 0.1);
          dummy.rotation.set(0, -Math.PI / 2 - yaw, 0);
          dummy.scale.set(tw * 0.92, 1, tw * 0.23);
          dummy.updateMatrix();
          signM.setMatrixAt(trailers, dummy.matrix);
        }
        trailers++;
        for (const s of [-1, 1]) {
          const tx = backX - fx * 0.78 + rx * s * tw * 0.4;
          const tz = backZ - fz * 0.78 + rz * s * tw * 0.4;
          putBox(tailM, tails++, tx, STREET_Y + 1.6, tz, yaw, 0.12, 0.3, 0.5);
          addGlow(tx, STREET_Y + 1.6, tz, 1.4, 0.15, 0.1);
        }
      }

      // Amber beacons just outside the card's corners
      for (const [along, side] of [
        [0.35, -1],
        [0.35, 1],
        [-cardLen - 0.35, -1],
        [-cardLen - 0.35, 1],
      ] as const) {
        const bx = pivot.x + fx * along + rx * side * (cardW / 2 + 0.35);
        const bz = pivot.z + fz * along + rz * side * (cardW / 2 + 0.35);
        putBox(beaconM, beacons++, bx, STREET_Y + CARD_PLANE, bz, yaw, 0.34, 0.34, 0.34);
        if (night > 0) addGlow(bx, STREET_Y + CARD_PLANE + 0.1, bz, 1.5, 0.85, 0.15);
      }

      const cx = pivot.x - fx * (cardLen / 2);
      const cz = pivot.z - fz * (cardLen / 2);
      if (slot.kind === "card") {
        // The card's shadow on the road, falling down-right of it (on screen)
        const tx = Math.cos(cam.heading);
        const tz = Math.sin(cam.heading);
        const sx = cam.x + (cx - cam.x) * lift - 0.9 * tx - 0.9 * tz;
        const sz = cam.z + (cz - cam.z) * lift - 0.9 * tz + 0.9 * tx;
        putBox(shadowM, shadows++, sx, STREET_Y + 0.025, sz, yaw, cardLen * lift * 1.06, 1, cardW * lift * 1.06);
        continue;
      }

      // ── The name truck: an open flatbed, and the letters loaded onto it one after another ──
      const bedTop = STREET_Y + 1.55;
      putBox(trailerM, trailers++, cx, bedTop - 0.2, cz, yaw, cardLen + 0.5, 0.4, cardW * 1.06);
      for (const side of [-1, 1]) {
        putBox(trailerM, trailers++, cx + rx * side * cardW * 0.53, bedTop + 0.12, cz + rz * side * cardW * 0.53, yaw, cardLen + 0.5, 0.25, 0.14);
        // Axles: two under the front of the bed, three at the back
        for (const along of [0.9, 2.2, cardLen - 3.4, cardLen - 2.2, cardLen - 1.0]) {
          const wx = pivot.x - fx * along + rx * side * cardW * 0.5;
          const wz = pivot.z - fz * along + rz * side * cardW * 0.5;
          putBox(wheelM, wheels++, wx, STREET_Y + 0.5, wz, yaw, 1.0, 1.0, 0.5);
        }
      }
      nameShown = true;
      // Letters sized so the longer word fills most of the bed's width; one line per word, with a
      // clear margin at the front and back of the bed
      const pad = cardLen * 0.1;
      const line = (cardLen - pad * 2) / NAME_LINES;
      const size = Math.min((cardW * 0.8) / nameLayout.widest, line * 1.0);
      const parked = slot.start === 0 ? Infinity : w.now - slot.start - ARRIVAL_MS;
      const { basis, ax, ay, az } = tmp;
      NAME_LETTERS.forEach(({ ch }, i) => {
        const mesh = letterRefs.current[i];
        const geo = letterGeos.get(ch);
        if (!mesh || !geo) return;
        // Dropped in one after another once the truck has stopped, with a little bounce
        const u = parked === Infinity ? 1 : clamp01((parked - i * LETTER_GAP_MS) / LETTER_DROP_MS);
        mesh.visible = u > 0;
        if (!mesh.visible) return;
        const fallH = 9 * (1 - bounce(u));
        const { row, col } = NAME_LETTERS[i];
        const along = pad + (row + 0.5) * line;
        const across = nameLayout.offsets[row][col] * size;
        const lx = pivot.x - fx * along + rx * across;
        const lz = pivot.z - fz * along + rz * across;
        // Letter axes: right → across the truck, up → forward (up the screen), face → up
        ax.set(rx, 0, rz);
        ay.set(fx * Math.cos(LETTER_LEAN), Math.sin(LETTER_LEAN), fz * Math.cos(LETTER_LEAN));
        az.crossVectors(ax, ay);
        basis.makeBasis(ax, ay, az);
        mesh.quaternion.setFromRotationMatrix(basis);
        const box = geo.boundingBox!;
        const h = (box.max.y - box.min.y) * size;
        const d = (box.max.z - box.min.z) * size;
        mesh.position.set(lx, bedTop + (h / 2) * Math.sin(LETTER_LEAN) + (d / 2) * Math.cos(LETTER_LEAN) + fallH, lz);
        mesh.scale.setScalar(size * (0.85 + 0.15 * u));
      });
    }
    if (!nameShown) letterRefs.current.forEach((m) => m && (m.visible = false));

    // Hide unused instances (count stays fixed so the draw is the same shader every frame)
    const park = (mesh: THREE.InstancedMesh | null, from: number) => {
      if (!mesh) return;
      dummy.position.set(0, -1000, 0);
      dummy.scale.setScalar(0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      for (let i = from; i < mesh.count; i++) mesh.setMatrixAt(i, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
    };
    for (const [model, mesh] of vehicleRefs.current) {
      park(mesh, counts.get(model) ?? 0);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    park(blob, blobs);
    park(shadowM, shadows);
    park(trailerM, trailers);
    park(signM, trailers);
    park(beaconM, beacons);
    park(tailM, tails);
    park(wheelM, wheels);
    glowGeo.setDrawRange(0, night > 0 ? glow : 0);
    pos.needsUpdate = col.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={sky} material={mats.sky} renderOrder={-1}>
        <sphereGeometry args={[380, 32, 16]} />
      </mesh>
      <directionalLight ref={sun} position={[-60, 140, -80]} intensity={0} />
      <hemisphereLight ref={skyLight} args={["#e6f2ff", "#7a8288", 0]} />

      {byKind.map(([kind, list]) => (
        <instancedMesh
          key={kind}
          ref={(m) => {
            if (m) buildingRefs.current.set(kind, m);
            else buildingRefs.current.delete(kind);
          }}
          args={[buildings[kind]?.geometry, mats.city, list.length]}
        />
      ))}

      {/* Ground, the avenue and its junctions, crossings, pavements, lamps */}
      <mesh geometry={geo.flat} material={mats.ground} position={[city.ground.x, STREET_Y - 0.02, city.ground.z]} scale={[city.ground.sx, 1, city.ground.sz]} />
      <mesh geometry={roadGeo} material={mats.road} />
      <instancedMesh ref={crossMesh} args={[geo.flat, mats.cross, city.junctions.length]} />
      <instancedMesh ref={zebraMesh} args={[geo.flat, mats.zebra, city.zebras.length]} />
      <instancedMesh ref={paveMesh} args={[geo.box, mats.pave, city.pavements.length]} />
      <instancedMesh ref={lampMesh} args={[geo.lamp, mats.lamp, lamps.length]} />
      <instancedMesh ref={poolMesh} args={[geo.flat, mats.pool, lamps.length]} />

      {/* Traffic and the convoy */}
      <instancedMesh ref={blobMesh} args={[geo.flat, mats.blob, traffic.length + 2 * SLOTS]} frustumCulled={false} />
      <instancedMesh ref={shadowMesh} args={[geo.flat, mats.cardShadow, SLOTS]} frustumCulled={false} />
      {VEHICLES.map((model) =>
        shapes[model] ? (
          <instancedMesh
            key={model}
            ref={(m) => {
              if (m) vehicleRefs.current.set(model, m);
              else vehicleRefs.current.delete(model);
            }}
            args={[shapes[model].geometry, mats.vehicle, CAP]}
            frustumCulled={false}
          />
        ) : null
      )}
      <instancedMesh ref={trailerMesh} args={[geo.box, mats.trailer, SLOTS + 6]} frustumCulled={false} />
      <instancedMesh ref={wheelMesh} args={[geo.box, mats.tyre, 12]} frustumCulled={false} />
      {NAME_LETTERS.map(({ ch }, i) => (
        <mesh
          key={i}
          ref={(m) => {
            letterRefs.current[i] = m;
          }}
          geometry={letterGeos.get(ch)}
          material={letterMats[i]}
          visible={false}
        />
      ))}
      <instancedMesh ref={signMesh} args={[geo.flat, mats.sign, SLOTS]} frustumCulled={false} />
      <instancedMesh ref={tailMesh} args={[geo.box, mats.tail, SLOTS * 2]} frustumCulled={false} />
      <instancedMesh ref={beaconMesh} args={[geo.box, mats.beacon, SLOTS * 4]} frustumCulled={false} />
      <points ref={glowPoints} geometry={glowGeo} material={mats.glows} frustumCulled={false} />
    </group>
  );
}

/** Lands, rebounds a little, settles */
function bounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

useGLTF.preload(CITY_URL);
useFont.preload(FONT_URL);
useGLTF.preload(CARS_URL);
