"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { LINEUP } from "@/lib/content";

/** Per-view state. The rig in Showcase.tsx writes it every frame; the objects only read it. */
export type Shot = {
  asm: number; // 0 taken apart .. 1 assembled
  aspect: number; // width / height of the view
  still: boolean; // reduced motion: no idle movement
};
export const ShotCtx = createContext<Shot>({ asm: 1, aspect: 1, still: true });

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Progress of one part: 0 until `asm` reaches `from`, 1 once it reaches `to`, eased in between. */
const part = (asm: number, from: number, to: number) => {
  const t = clamp01((asm - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/* ───────────── materials ───────────── */

let M: {
  ceramic: THREE.Material;
  alu: THREE.Material;
  graphite: THREE.Material;
  glass: THREE.Material;
  pane: THREE.Material;
  display: THREE.Material;
  ui: THREE.Material;
  uiDark: THREE.Material;
  ink: THREE.Material;
} | null = null;

/** Shared studio materials. Screens are unlit so they read as switched on. */
function mats() {
  if (!M) {
    const flat = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
    M = {
      ceramic: new THREE.MeshPhysicalMaterial({ color: "#f4f4f6", roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      alu: new THREE.MeshStandardMaterial({ color: "#d9dbe0", metalness: 1, roughness: 0.34 }),
      graphite: new THREE.MeshStandardMaterial({ color: "#34363b", metalness: 0.5, roughness: 0.5 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#0d0e11", roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }),
      pane: new THREE.MeshStandardMaterial({ color: "#9fb6cf", metalness: 0.35, roughness: 0.22 }),
      display: flat("#ffffff"),
      ui: flat("#e9ebef"),
      uiDark: flat("#c6c9d0"),
      ink: flat("#1d1d1f"),
    };
  }
  return M;
}

/** The object's one accent: lit for solid parts, unlit (full and tinted) for on-screen blocks. */
function useAccent(color: string) {
  const a = useMemo(
    () => ({
      solid: new THREE.MeshStandardMaterial({ color, roughness: 0.45 }),
      flat: new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      soft: new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.62), toneMapped: false }),
    }),
    [color],
  );
  useEffect(() => () => Object.values(a).forEach((m) => m.dispose()), [a]);
  return a;
}

/* ───────────── primitives ───────────── */

function rrect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = w / 2;
  const y = h / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x, y - r);
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  s.lineTo(-x + r, y);
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + r);
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * A rounded rectangle in the XY plane facing +Z, centred on its origin.
 * Without a depth it is a flat card; with one it is a slab, optionally with softened edges.
 */
function Slab({ size, r, bevel = 0, ...props }: { size: [number, number, number?]; r: number; bevel?: number } & Omit<ThreeElements["mesh"], "geometry">) {
  const [w, h, d = 0] = size;
  const geo = useMemo(() => {
    if (!d) return new THREE.ShapeGeometry(rrect(w, h, r), 8);
    const depth = d - bevel * 2;
    const g = new THREE.ExtrudeGeometry(rrect(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 8,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [w, h, d, r, bevel]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} {...props} />;
}

let blobTex: THREE.Texture | null = null;
function blob() {
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.5, "rgba(255,255,255,0.4)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  return blobTex;
}

/** Soft contact shadow: a blurred dark ellipse on the floor. Far cheaper than a real shadow pass. */
function Shadow({ y, size, opacity = 0.2 }: { y: number; size: [number, number]; opacity?: number }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000", map: blob(), transparent: true, depthWrite: false, opacity, toneMapped: false }), [opacity]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[size[0], size[1], 1]} material={mat}>
      <planeGeometry />
    </mesh>
  );
}

const tint = (object: (typeof LINEUP)[number]["object"]) => LINEUP.find((p) => p.object === object)!.color;

/* ───────────── phone: the app's screens lift off the glass in layers ───────────── */
function Phone() {
  const m = mats();
  const a = useAccent(tint("phone"));
  const shot = useContext(ShotCtx);
  const body = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    if (body.current) body.current.position.y = shot.still ? 0 : Math.sin(clock.elapsedTime * 0.9) * 0.04;
    layers.current.forEach((g, i) => {
      if (g) g.position.z = (1 - part(shot.asm, 0.2 + i * 0.08, 0.7 + i * 0.1)) * (0.35 + i * 0.22);
    });
  });
  const layer = (i: number) => (g: THREE.Group | null) => void (layers.current[i] = g);

  return (
    <>
      <Shadow y={-1.75} size={[2.2, 1.1]} opacity={0.16} />
      <group ref={body} rotation={[-0.12, 0, 0]}>
        <Slab size={[1.36, 2.8, 0.15]} r={0.24} bevel={0.03} material={m.alu} />
        <group ref={layer(0)}>
          <Slab size={[1.28, 2.72]} r={0.2} position={[0, 0, 0.077]} material={m.glass} />
          <Slab size={[1.2, 2.64]} r={0.17} position={[0, 0, 0.08]} material={m.display} />
        </group>
        {/* list rows */}
        <group ref={layer(1)}>
          {[0.1, -0.32, -0.74].map((y) => (
            <group key={y} position={[0, y, 0.084]}>
              <Slab size={[1.04, 0.34]} r={0.08} material={m.ui} />
              <Slab size={[0.2, 0.2]} r={0.05} position={[-0.36, 0, 0.003]} material={a.soft} />
              <Slab size={[0.5, 0.05]} r={0.025} position={[0.08, 0.05, 0.003]} material={m.uiDark} />
              <Slab size={[0.34, 0.05]} r={0.025} position={[0, -0.05, 0.003]} material={m.uiDark} />
            </group>
          ))}
        </group>
        {/* header card */}
        <group ref={layer(2)} position={[0, 0.74, 0]}>
          <Slab size={[1.04, 0.62]} r={0.1} position={[0, 0, 0.086]} material={a.flat} />
          <Slab size={[0.5, 0.07]} r={0.035} position={[-0.2, 0.1, 0.089]} material={m.display} />
          <Slab size={[0.3, 0.05]} r={0.025} position={[-0.3, -0.04, 0.089]} material={a.soft} />
        </group>
        {/* camera pill and tab bar */}
        <group ref={layer(3)}>
          <Slab size={[0.34, 0.09]} r={0.045} position={[0, 1.2, 0.086]} material={m.ink} />
          <Slab size={[1.04, 0.2]} r={0.1} position={[0, -1.14, 0.086]} material={m.ui} />
          {[-0.36, -0.12, 0.12, 0.36].map((x, i) => (
            <mesh key={x} position={[x, -1.14, 0.089]} material={i === 0 ? a.flat : m.uiDark}>
              <circleGeometry args={[0.04, 20]} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

/* ───────────── laptop: the lid opens, then the dashboard builds itself ───────────── */
const BARS = [0.3, 0.5, 0.4, 0.7, 0.55, 0.85];

function Laptop() {
  const m = mats();
  const a = useAccent(tint("laptop"));
  const shot = useContext(ShotCtx);
  const lid = useRef<THREE.Group>(null);
  const cards = useRef<(THREE.Group | null)[]>([]);
  const bars = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, -0.2, part(shot.asm, 0.05, 0.7));
    cards.current.forEach((g, i) => {
      if (!g) return;
      const k = part(shot.asm, 0.55 + i * 0.05, 0.85 + i * 0.05);
      g.visible = k > 0.001; // while the lid is shut they would poke through the base
      g.position.z = 0.04 + (1 - k) * 0.4;
    });
    bars.current.forEach((g, i) => {
      if (g) g.scale.y = Math.max(0.001, part(shot.asm, 0.72 + i * 0.03, 0.9 + i * 0.02));
    });
  });
  const card = (i: number) => (g: THREE.Group | null) => void (cards.current[i] = g);

  return (
    <group position={[0, -0.2, 0]}>
      <Shadow y={-0.86} size={[4.2, 2.8]} />
      {/* base: lies flat, its local +Y points to the hinge and +Z points up */}
      <group position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Slab size={[3, 2, 0.1]} r={0.14} bevel={0.02} material={m.alu} />
        <Slab size={[2.6, 0.95]} r={0.05} position={[0, 0.32, 0.052]} material={m.graphite} />
        <Slab size={[0.95, 0.5]} r={0.05} position={[0, -0.56, 0.052]} material={m.ceramic} />
      </group>
      {/* lid: hinged on the base's back edge, the screen faces +Z when open */}
      <group ref={lid} position={[0, -0.712, -1]}>
        <group position={[0, 1, 0]}>
          <Slab size={[3, 2, 0.07]} r={0.14} bevel={0.02} material={m.alu} />
          <Slab size={[2.88, 1.88]} r={0.1} position={[0, 0, 0.036]} material={m.glass} />
          <Slab size={[2.76, 1.76]} r={0.07} position={[0, 0, 0.038]} material={m.display} />
          {/* sidebar */}
          <group ref={card(0)}>
            <Slab size={[0.5, 1.56]} r={0.06} position={[-1.03, 0, 0]} material={m.ui} />
            {[0.6, 0.42, 0.24].map((y, i) => (
              <Slab key={y} size={[0.32, 0.07]} r={0.035} position={[-1.03, y, 0.003]} material={i === 0 ? a.flat : m.uiDark} />
            ))}
          </group>
          {/* stat cards */}
          {[-0.38, 0.32, 1.02].map((x, i) => (
            <group key={x} ref={card(1 + i)}>
              <Slab size={[0.62, 0.36]} r={0.06} position={[x, 0.6, 0]} material={i === 0 ? a.flat : m.ui} />
              <Slab size={[0.3, 0.06]} r={0.03} position={[x - 0.1, 0.6, 0.003]} material={i === 0 ? m.display : m.uiDark} />
            </group>
          ))}
          {/* chart */}
          <group ref={card(4)}>
            <Slab size={[2.02, 1.06]} r={0.06} position={[0.32, -0.25, 0]} material={m.ui} />
            {BARS.map((h, i) => (
              <group key={i} ref={(g) => void (bars.current[i] = g)} position={[-0.43 + i * 0.3, -0.68, 0.003]}>
                <Slab size={[0.18, h]} r={0.05} position={[0, h / 2, 0]} material={i % 2 ? a.soft : a.flat} />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ───────────── server: blades slide into the rack one after another ───────────── */
function Server() {
  const m = mats();
  const a = useAccent(tint("server"));
  const shot = useContext(ShotCtx);
  const blades = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    blades.current.forEach((g, i) => {
      if (g) g.position.z = (1 - part(shot.asm, 0.1 + i * 0.13, 0.5 + i * 0.12)) * 1.9;
    });
  });

  return (
    <>
      <Shadow y={-1.37} size={[3.6, 2.8]} />
      {/* rack */}
      {[-1.06, 1.06].map((x) => (
        <RoundedBox key={x} args={[0.1, 2.72, 1.7]} radius={0.03} position={[x, 0, 0]} material={m.alu} />
      ))}
      {[-1.31, 1.31].map((y) => (
        <RoundedBox key={y} args={[2.22, 0.1, 1.7]} radius={0.03} position={[0, y, 0]} material={m.alu} />
      ))}
      <mesh position={[0, 0, -0.82]} material={m.graphite}>
        <boxGeometry args={[2.04, 2.54, 0.04]} />
      </mesh>
      {/* blades */}
      {[-1, -0.5, 0, 0.5, 1].map((y, i) => (
        <group key={y} ref={(g) => void (blades.current[i] = g)}>
          <group position={[0, y, 0]}>
            <mesh material={m.graphite}>
              <boxGeometry args={[1.96, 0.42, 1.56]} />
            </mesh>
            <Slab size={[1.98, 0.42, 0.06]} r={0.05} bevel={0.015} position={[0, 0, 0.81]} material={m.ceramic} />
            <mesh position={[-0.8, 0, 0.842]} material={a.flat}>
              <circleGeometry args={[0.035, 20]} />
            </mesh>
            <mesh position={[-0.68, 0, 0.842]} material={m.uiDark}>
              <circleGeometry args={[0.035, 20]} />
            </mesh>
            <Slab size={[0.32, 0.05]} r={0.025} position={[-0.38, 0, 0.842]} material={m.uiDark} />
            {Array.from({ length: 7 }, (_, j) => (
              <Slab key={j} size={[0.05, 0.22]} r={0.025} position={[0.2 + j * 0.1, 0, 0.842]} material={m.ink} />
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

/* ───────────── infra: a load balancer feeding three databases ───────────── */
const DBS: [number, number][] = [
  [-1.25, 0.1],
  [0, 0.55],
  [1.25, 0.1],
];
const DISK_Y = [-1.08, -0.78, -0.48];
const HUB_Y = 1.05;

function Infra() {
  const m = mats();
  const a = useAccent(tint("infra"));
  const shot = useContext(ShotCtx);
  const hub = useRef<THREE.Group>(null);
  const disks = useRef<(THREE.Group | null)[]>([]);
  const links = useRef<(THREE.Mesh | null)[]>([]);
  const dots = useRef<(THREE.Mesh | null)[]>([]);

  // One cable per database, from the underside of the hub to the top of the stack.
  const cables = useMemo(
    () =>
      DBS.map(([x, z]) => {
        const from = new THREE.Vector3(0, HUB_Y - 0.1, 0);
        const to = new THREE.Vector3(x, DISK_Y[2] + 0.12, z);
        const dir = to.clone().sub(from);
        return { from, to, mid: from.clone().lerp(to, 0.5), len: dir.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()) };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const h = hub.current;
    if (h) {
      const k = part(shot.asm, 0.35, 0.8);
      h.position.y = HUB_Y + (1 - k) * 0.9;
      h.scale.setScalar(0.5 + k * 0.5);
    }
    disks.current.forEach((g, n) => {
      if (!g) return;
      const db = Math.floor(n / 3);
      const j = n % 3;
      const from = 0.05 + db * 0.08 + j * 0.1;
      const k = part(shot.asm, from, from + 0.4);
      g.visible = k > 0.001;
      g.position.y = DISK_Y[j] + (1 - k) * (0.8 + j * 0.25);
      g.scale.setScalar(0.5 + k * 0.5);
    });
    const wired = part(shot.asm, 0.8, 1);
    links.current.forEach((l, i) => {
      if (!l) return;
      l.visible = wired > 0.01;
      l.scale.y = cables[i].len * wired;
    });
    // Requests travel down the cables once everything is connected.
    dots.current.forEach((d, i) => {
      if (!d) return;
      d.visible = wired >= 1 && !shot.still;
      if (!d.visible) return;
      const k = (clock.elapsedTime * 0.45 + i / 3) % 1;
      d.position.lerpVectors(cables[i].from, cables[i].to, k);
      d.scale.setScalar(Math.sin(k * Math.PI) + 0.05);
    });
  });

  return (
    <>
      <Shadow y={-1.21} size={[4.2, 1.9]} opacity={0.16} />
      <group ref={hub} position={[0, HUB_Y, 0]}>
        <mesh material={m.alu}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 48]} />
        </mesh>
        <mesh material={a.solid}>
          <cylinderGeometry args={[0.606, 0.606, 0.06, 48]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} material={m.ceramic}>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 40]} />
        </mesh>
      </group>
      {DBS.map(([x, z], db) =>
        DISK_Y.map((y, j) => (
          <group key={`${db}-${j}`} ref={(g) => void (disks.current[db * 3 + j] = g)} position={[x, y, z]}>
            <mesh material={m.ceramic}>
              <cylinderGeometry args={[0.42, 0.42, 0.24, 40]} />
            </mesh>
            {j === 2 && (
              <mesh material={a.solid}>
                <cylinderGeometry args={[0.425, 0.425, 0.05, 40]} />
              </mesh>
            )}
          </group>
        )),
      )}
      {cables.map((c, i) => (
        <group key={i}>
          <mesh ref={(l) => void (links.current[i] = l)} position={c.mid} quaternion={c.quat} material={m.graphite}>
            <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
          </mesh>
          <mesh ref={(d) => void (dots.current[i] = d)} material={a.flat}>
            <sphereGeometry args={[0.055, 12, 12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ───────────── hero: a business's paperwork, machines, buildings and vehicles are drawn into a
 * laptop and come out as its application ───────────── */

// What is written on each sheet of paper.
const SHEETS = [
  { title: "Invoice", rows: ["Gear set × 12", "Steel bolts × 240", "Delivery", "Total  4,860"] },
  { title: "Purchase order", rows: ["Bearings × 60", "Drive belts × 8", "Due Friday"] },
  { title: "Delivery note", rows: ["Truck 07", "Depot → Site B", "Signed ______"] },
  { title: "Timesheet", rows: ["Mon  8h", "Tue  7h", "Wed  9h", "Thu  8h"] },
  { title: "Inventory", rows: ["Bolts  2,400", "Gears  96", "Belts  31"] },
];

function sheetTexture({ title, rows }: (typeof SHEETS)[number]) {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 528;
  const g = c.getContext("2d")!;
  const font = "ui-sans-serif, system-ui, -apple-system, sans-serif";
  // Cream with an outline, so a sheet still reads against a white page.
  g.fillStyle = "#f7f4ea";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#bdb9ab";
  g.lineWidth = 8;
  g.strokeRect(0, 0, c.width, c.height);
  g.fillStyle = "#1d1d1f";
  g.font = `700 44px ${font}`;
  g.fillText(title, 34, 84);
  g.fillStyle = "#bdb9ab";
  g.fillRect(34, 110, 316, 4);
  g.fillStyle = "#3a3a3f";
  g.font = `500 32px ${font}`;
  rows.forEach((r, i) => g.fillText(r, 34, 176 + i * 62));
  // Empty ruled lines down to the foot of the page.
  g.fillStyle = "#dcd8ca";
  for (let y = 166 + rows.length * 62; y < 490; y += 62) g.fillRect(34, y, 316, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const TOOTH = 0.09;

/** Outline of a gear: `r` is the radius at the root of the teeth. */
function gearShape(teeth: number, r: number) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const profile: [number, number][] = [
      [r, a],
      [r, a + step * 0.22],
      [r + TOOTH, a + step * 0.32],
      [r + TOOTH, a + step * 0.68],
      [r, a + step * 0.78],
    ];
    profile.forEach(([rad, ang], k) => (i + k ? s.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad) : s.moveTo(rad, 0)));
  }
  s.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, r * 0.32, 0, Math.PI * 2, true);
  s.holes.push(bore);
  return s;
}

/** A gear standing upright, turning about its axle. Meshed gears turn at speeds inverse to their tooth counts. */
function Gear({ teeth, r, speed, ...props }: { teeth: number; r: number; speed: number } & Omit<ThreeElements["mesh"], "geometry">) {
  const shot = useContext(ShotCtx);
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(gearShape(teeth, r), { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 20 });
    g.translate(0, 0, -0.055);
    return g;
  }, [teeth, r]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    if (ref.current && !shot.still) ref.current.rotation.z += Math.min(dt, 0.05) * speed;
  });
  return <mesh ref={ref} geometry={geo} {...props} />;
}

/** An office block: a white body with a band of glass per floor. Stands on its origin. */
function Block({ size: [w, h, d], floors }: { size: [number, number, number]; floors: number }) {
  const m = mats();
  const pitch = h / (floors + 0.4);
  return (
    <>
      <RoundedBox args={[w, h, d]} radius={0.03} position={[0, h / 2, 0]} material={m.ceramic} />
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={i} position={[0, (i + 0.7) * pitch, 0]} material={m.pane}>
          <boxGeometry args={[w + 0.012, pitch * 0.42, d + 0.012]} />
        </mesh>
      ))}
    </>
  );
}

function Factory() {
  const m = mats();
  const tooth = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 0.26);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false });
    g.translate(0, 0, -0.45);
    return g;
  }, []);
  useEffect(() => () => tooth.dispose(), [tooth]);
  return (
    <>
      <RoundedBox args={[1.5, 0.7, 0.9]} radius={0.03} position={[0, 0.35, 0]} material={m.ceramic} />
      {[-0.75, -0.25, 0.25].map((x) => (
        <mesh key={x} geometry={tooth} position={[x, 0.7, 0]} material={m.alu} />
      ))}
      <mesh position={[0.52, 0.8, -0.2]} material={m.alu}>
        <cylinderGeometry args={[0.08, 0.1, 1.6, 24]} />
      </mesh>
      <mesh position={[-0.42, 0.18, 0.452]} material={m.graphite}>
        <boxGeometry args={[0.32, 0.36, 0.012]} />
      </mesh>
      <mesh position={[0.3, 0.42, 0.452]} material={m.pane}>
        <boxGeometry args={[0.7, 0.16, 0.012]} />
      </mesh>
    </>
  );
}

function Wheels({ xs, z, r }: { xs: number[]; z: number; r: number }) {
  const m = mats();
  return (
    <>
      {xs.flatMap((x) =>
        [z, -z].map((side) => (
          <mesh key={`${x}${side}`} position={[x, r, side]} rotation={[Math.PI / 2, 0, 0]} material={m.graphite}>
            <cylinderGeometry args={[r, r, 0.07, 24]} />
          </mesh>
        )),
      )}
    </>
  );
}

/** Both vehicles stand on their origin and face +X. */
function Car({ paint }: { paint: THREE.Material }) {
  const m = mats();
  return (
    <>
      <RoundedBox args={[1, 0.2, 0.44]} radius={0.07} position={[0, 0.2, 0]} material={paint} />
      <RoundedBox args={[0.5, 0.2, 0.38]} radius={0.07} position={[-0.06, 0.37, 0]} material={m.glass} />
      <Wheels xs={[-0.3, 0.3]} z={0.2} r={0.11} />
    </>
  );
}

function Truck({ paint }: { paint: THREE.Material }) {
  const m = mats();
  return (
    <>
      <mesh position={[0.02, 0.16, 0]} material={m.graphite}>
        <boxGeometry args={[1.36, 0.06, 0.4]} />
      </mesh>
      <RoundedBox args={[0.92, 0.54, 0.52]} radius={0.04} position={[-0.2, 0.46, 0]} material={m.ceramic} />
      <RoundedBox args={[0.36, 0.4, 0.5]} radius={0.06} position={[0.5, 0.39, 0]} material={paint} />
      <mesh position={[0.682, 0.46, 0]} material={m.glass}>
        <boxGeometry args={[0.012, 0.16, 0.4]} />
      </mesh>
      <Wheels xs={[-0.42, 0.46]} z={0.23} r={0.12} />
    </>
  );
}

const FLOOR = -1.06; // the laptop's own floor, so the scene and the laptop stand on the same ground
const SCREEN = [0, 0.07, -1.1]; // the middle of the open screen, in the laptop's own space
const FLY = 0.3; // share of the scroll one thing takes to get there

/**
 * One thing in the scene. It rests at `home`; once the scroll reaches `at` it swirls in toward
 * `sink` (the laptop's screen, wherever that is by then), shrinking to nothing as it arrives.
 */
function Flyer({ home, at, sink, turn = 0, tilt = 0, bob = 0, children }: { home: [number, number, number]; at: number; sink: THREE.Vector3; turn?: number; tilt?: number; bob?: number; children: ReactNode }) {
  const shot = useContext(ShotCtx);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const k = part(shot.asm, at, at + FLY);
    g.visible = k < 0.999;
    if (!g.visible) return;
    // A wide view has room to spare: the scene spreads out sideways to use it.
    const spread = THREE.MathUtils.clamp(shot.aspect / 1.25, 1, 1.4);
    const dx = (home[0] * spread - sink.x) * (1 - k);
    const dz = (home[2] - sink.z) * (1 - k);
    const a = k * 1.2;
    const float = shot.still ? 0 : Math.sin(clock.elapsedTime * 0.8 + at * 40) * bob * (1 - k);
    g.position.set(sink.x + dx * Math.cos(a) - dz * Math.sin(a), THREE.MathUtils.lerp(home[1], sink.y, k) + Math.sin(k * Math.PI) * 0.6 + float, sink.z + dx * Math.sin(a) + dz * Math.cos(a));
    g.rotation.set(tilt * (1 - k), turn + k * 2.2, 0);
    g.scale.setScalar(Math.max(0.001, 1 - part(k, 0.08, 0.95)));
  });
  return (
    <group ref={ref} position={home} rotation={[tilt, turn, 0]}>
      {children}
    </group>
  );
}

function Hero() {
  const m = mats();
  const blue = useAccent("#0b63d6");
  const amber = useAccent(tint("infra"));
  const green = useAccent(tint("server"));
  const shot = useContext(ShotCtx);
  // The laptop keeps its own clock: open by the time things arrive, building its app as they land.
  const inner = useMemo<Shot>(() => ({ asm: shot.still ? 1 : 0, aspect: 1, still: shot.still }), [shot]);
  const sheets = useMemo(() => SHEETS.map((s) => new THREE.MeshBasicMaterial({ map: sheetTexture(s), side: THREE.DoubleSide, toneMapped: false })), []);
  const shade = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000", map: blob(), transparent: true, depthWrite: false, toneMapped: false }), []);
  useEffect(
    () => () => {
      sheets.forEach((s) => {
        s.map?.dispose();
        s.dispose();
      });
      shade.dispose();
    },
    [sheets, shade],
  );
  const world = useRef<THREE.Group>(null);
  const laptop = useRef<THREE.Group>(null);
  const sink = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const a = shot.asm;
    inner.asm = a < 0.42 ? clamp01((a - 0.04) / 0.38) * 0.55 : 0.55 + clamp01((a - 0.42) / 0.54) * 0.45;
    const l = laptop.current;
    if (l) {
      // Starts shut and small on the ground in front; grows into the middle, staying on the floor.
      const grow = part(a, 0.08, 0.66);
      const s = THREE.MathUtils.lerp(0.42, 1.3, grow);
      l.scale.setScalar(s);
      // It comes back from the front early, while still small, so it never outgrows the view.
      l.position.set(0, FLOOR * (1 - s), THREE.MathUtils.lerp(1.6, 0, part(a, 0.06, 0.4)));
      sink.set(SCREEN[0], SCREEN[1], SCREEN[2]).multiplyScalar(s).add(l.position);
    }
    // The scene is taller than the laptop: it sits lower in the view, then rises as it closes in.
    if (world.current) world.current.position.y = THREE.MathUtils.lerp(-0.55, -0.2, part(a, 0.1, 0.5));
    shade.opacity = 0.12 * (1 - part(a, 0.1, 0.55));
  });

  return (
    <>
      <group ref={world}>
        <mesh position={[0, FLOOR + 0.004, -0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[6.4, 3.4, 1]} material={shade}>
          <planeGeometry />
        </mesh>

        {/* buildings at the back */}
        <Flyer sink={sink} home={[-1.4, FLOOR, -0.9]} at={0.32}>
          <Block size={[0.8, 2.1, 0.8]} floors={7} />
        </Flyer>
        <Flyer sink={sink} home={[-0.45, FLOOR, -1.15]} at={0.36}>
          <Block size={[0.9, 1.3, 0.8]} floors={4} />
        </Flyer>
        <Flyer sink={sink} home={[1.0, FLOOR, -0.9]} at={0.4}>
          <Factory />
        </Flyer>

        {/* vehicles in front */}
        <Flyer sink={sink} home={[-1.3, FLOOR, 0.5]} at={0.24} turn={0.2}>
          <Car paint={blue.solid} />
        </Flyer>
        <Flyer sink={sink} home={[1.35, FLOOR, 0.6]} at={0.28} turn={-0.15}>
          <Truck paint={green.solid} />
        </Flyer>

        {/* machinery */}
        <Flyer sink={sink} home={[1.3, 1.0, -0.3]} at={0.2}>
          <Gear teeth={14} r={0.5} speed={0.5} material={m.alu} />
          <Gear teeth={9} r={0.32} speed={(-0.5 * 14) / 9} position={[0.68, 0.6, 0]} rotation={[0, 0, 0.12]} material={amber.solid} />
        </Flyer>
        <Flyer sink={sink} home={[-2.2, 0.3, 0.2]} at={0.16} turn={0.3}>
          <Gear teeth={10} r={0.36} speed={-0.4} material={m.graphite} />
        </Flyer>

        {/* paperwork, adrift over everything */}
        {(
          [
            { home: [-0.6, 1.5, 0.3], turn: 0.25, tilt: -0.2 },
            { home: [0.25, 2.0, 0], turn: -0.3, tilt: -0.1 },
            { home: [-1.8, 1.85, 0.1], turn: 0.45, tilt: -0.25 },
            { home: [0.15, 0.55, 0.5], turn: -0.2, tilt: -0.3 },
            { home: [2.1, -0.15, 0.7], turn: -0.5, tilt: -0.2 },
          ] as const
        ).map((p, i) => (
          <Flyer key={i} sink={sink} home={[...p.home]} at={0.03 + i * 0.025} turn={p.turn} tilt={p.tilt} bob={0.05}>
            <mesh material={sheets[i]}>
              <planeGeometry args={[0.58, 0.8]} />
            </mesh>
          </Flyer>
        ))}

        <group ref={laptop}>
          <ShotCtx.Provider value={inner}>
            <Laptop />
          </ShotCtx.Provider>
        </group>
      </group>
    </>
  );
}

/**
 * Everything a view can show. `extent` is the box (width, height) the rig scales to fit the view;
 * `yaw` turns the object toward the text beside it on a desktop card. A `pin` object's box is pinned
 * while the page scrolls past, and that scroll is what assembles it.
 */
export const OBJECTS = {
  phone: { C: Phone, extent: [2.2, 3.7], yaw: 0.45, pin: false },
  laptop: { C: Laptop, extent: [4.1, 2.9], yaw: -0.5, pin: false },
  server: { C: Server, extent: [3.7, 3.7], yaw: 0.55, pin: false },
  infra: { C: Infra, extent: [4, 3.1], yaw: -0.25, pin: false },
  hero: { C: Hero, extent: [5, 4.1], yaw: -0.3, pin: true },
} as const;

export type Kind = keyof typeof OBJECTS;
