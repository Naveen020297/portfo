"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { build, store } from "@/lib/store";

/* ───────────── materials (matte, weathered: no chrome) ───────────── */

let M: Record<"paint" | "paintDark" | "metal" | "rubber" | "glass" | "panel", THREE.Material> | null = null;
function mats() {
  if (!M) {
    M = {
      paint: new THREE.MeshStandardMaterial({ color: "#d9a23c", roughness: 0.62, metalness: 0.25 }),
      paintDark: new THREE.MeshStandardMaterial({ color: "#9c6a22", roughness: 0.7, metalness: 0.25 }),
      metal: new THREE.MeshStandardMaterial({ color: "#4a4e57", roughness: 0.55, metalness: 0.6 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#1c1d21", roughness: 0.95, metalness: 0 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#05070b", roughness: 0.08, metalness: 0, clearcoat: 1 }),
      panel: new THREE.MeshStandardMaterial({ color: "#262a31", roughness: 0.8, metalness: 0.3 }),
    };
  }
  return M;
}

let shadowTex: THREE.Texture | null = null;
function blobShadow() {
  if (!shadowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(0,0,0,0.75)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  return shadowTex;
}

/* ───────────── rig: what station controllers can drive ───────────── */

export type Pose = {
  /** arm pitch (+ = down) and yaw (+ = outward right) */
  lPitch: number;
  lYaw: number;
  rPitch: number;
  rYaw: number;
  gripL: number; // 0 open .. 1 closed
  gripR: number;
  /** world point the head looks at; null = follow the cursor */
  look: THREE.Vector3 | null;
  eyes: number; // iris openness, 1 = normal, >1 = wide
  brows: number; // -1 sad .. 1 surprised
  lean: number; // body pitch, - = lean back
  bounce: number; // 0..1 happy hop
  scale: number;
};

export type Rig = {
  pose: Pose;
  /** where the robot drives to (station-local) */
  goal: THREE.Vector3;
  /** heading to hold once parked (radians, 0 = facing camera) */
  faceYaw: number;
  root: THREE.Group;
  tipL: THREE.Object3D;
  tipR: THREE.Object3D;
  /** the head, for things that come out of the eyes (scan beams) */
  eye: THREE.Object3D;
  moving: boolean;
};

const SHOULDER = { l: new THREE.Vector3(-0.44, 0.66, 0.08), r: new THREE.Vector3(0.44, 0.66, 0.08) };
const aimTmp = new THREE.Vector3();

/** Point an arm at a world-space target (clamped to what the shoulder can reach). */
export function aim(rig: Rig, side: "l" | "r", target: THREE.Vector3) {
  const d = rig.root.worldToLocal(aimTmp.copy(target)).sub(SHOULDER[side]);
  const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, Math.max(0.05, d.z)), -1.2, 1.2);
  const pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, Math.max(0, d.z))), -2.4, 1.2);
  if (side === "l") {
    rig.pose.lYaw = -yaw;
    rig.pose.lPitch = pitch;
  } else {
    rig.pose.rYaw = yaw;
    rig.pose.rPitch = pitch;
  }
}

/** Heading (root yaw) that turns the robot toward a world point, limited to +-max. */
export function headingTo(rig: Rig, target: THREE.Vector3, max = 1.2) {
  const p = rig.root.parent!.worldToLocal(aimTmp.copy(target)).sub(rig.root.position);
  return THREE.MathUtils.clamp(Math.atan2(p.x, p.z), -max, max);
}

export type Act = (rig: Rig, f: { t: number; dt: number; b: number }) => void;

const restPose = (): Pose => ({ lPitch: 0.75, lYaw: -0.1, rPitch: 0.75, rYaw: 0.1, gripL: 0.3, gripR: 0.3, look: null, eyes: 1, brows: 0, lean: 0, bounce: 0, scale: 1 });

/* ───────────── pieces ───────────── */

const LUGS = 14;
const TREAD_R = 0.15; // end radius
const TREAD_S = 0.3; // half length of the straight run
const TREAD_LEN = 4 * TREAD_S + 2 * Math.PI * TREAD_R;

/** Place a lug at arc-length s around the track loop (z forward, y up, centre at y = TREAD_R). */
function lugAt(s: number, o: THREE.Object3D) {
  let u = ((s % TREAD_LEN) + TREAD_LEN) % TREAD_LEN;
  const top = 2 * TREAD_S;
  const arc = Math.PI * TREAD_R;
  if (u < top) {
    o.position.set(0, 2 * TREAD_R, TREAD_S - u);
    o.rotation.x = 0;
    return;
  }
  u -= top;
  if (u < arc) {
    const a = u / TREAD_R;
    o.position.set(0, TREAD_R + Math.cos(a) * TREAD_R, -TREAD_S - Math.sin(a) * TREAD_R);
    o.rotation.x = -a;
    return;
  }
  u -= arc;
  if (u < top) {
    o.position.set(0, 0, -TREAD_S + u);
    o.rotation.x = Math.PI;
    return;
  }
  u -= top;
  const a = u / TREAD_R;
  o.position.set(0, TREAD_R - Math.cos(a) * TREAD_R, TREAD_S + Math.sin(a) * TREAD_R);
  o.rotation.x = Math.PI - a;
}

function Tread({ side, travel }: { side: 1 | -1; travel: { current: number } }) {
  const m = mats();
  const lugs = useRef<(THREE.Mesh | null)[]>([]);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const s = travel.current;
    lugs.current.forEach((l, i) => l && lugAt(s + (i / LUGS) * TREAD_LEN, l));
    wheels.current.forEach((w) => w && (w.rotation.x = s / 0.11));
  });
  return (
    <group position={[side * 0.49, 0, 0]}>
      <RoundedBox args={[0.18, 2 * TREAD_R + 0.02, 2 * TREAD_S + 2 * TREAD_R]} radius={TREAD_R} smoothness={4} position={[0, TREAD_R, 0]} material={m.rubber} />
      {Array.from({ length: LUGS }, (_, i) => (
        <mesh key={i} ref={(o) => void (lugs.current[i] = o)} material={m.panel}>
          <boxGeometry args={[0.2, 0.025, 0.05]} />
        </mesh>
      ))}
      {[-TREAD_S, 0, TREAD_S].map((z, i) => (
        <group key={z} ref={(o) => void (wheels.current[i] = o)} position={[side * 0.095, TREAD_R, z]}>
          <mesh material={m.metal} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 20]} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} material={m.paintDark} position={[side * 0.012, 0, 0]} rotation={[(k * Math.PI) / 3, 0, 0]}>
              <boxGeometry args={[0.012, 0.17, 0.025]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Arm({ side, arm, fingers, tip }: { side: 1 | -1; arm: React.RefObject<THREE.Group | null>; fingers: React.RefObject<(THREE.Group | null)[]>; tip: React.RefObject<THREE.Object3D | null> }) {
  const m = mats();
  return (
    <group ref={arm} position={[side * 0.44, 0.66, 0.08]} rotation-order="YXZ">
      <mesh material={m.metal} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
      </mesh>
      <mesh material={m.paintDark} position={[side * 0.03, 0, 0.17]}>
        <boxGeometry args={[0.07, 0.09, 0.32]} />
      </mesh>
      <mesh material={m.metal} position={[side * 0.03, 0, 0.34]}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>
      <mesh material={m.paint} position={[side * 0.03, 0, 0.47]}>
        <boxGeometry args={[0.075, 0.085, 0.24]} />
      </mesh>
      <group position={[side * 0.03, 0, 0.6]}>
        {[1, -1].map((u, i) => (
          <group key={u} ref={(o) => void (fingers.current[i] = o)} position={[0, u * 0.025, 0]}>
            <mesh material={m.metal} position={[0, 0, 0.07]}>
              <boxGeometry args={[0.07, 0.022, 0.14]} />
            </mesh>
            <mesh material={m.metal} position={[0, -u * 0.018, 0.135]}>
              <boxGeometry args={[0.07, 0.04, 0.02]} />
            </mesh>
          </group>
        ))}
        <object3D ref={tip} position={[0, 0, 0.16]} />
      </group>
    </group>
  );
}

function Eye({ side, accent, iris, brow }: { side: 1 | -1; accent: THREE.Material; iris: React.RefObject<(THREE.Group | null)[]>; brow: React.RefObject<(THREE.Mesh | null)[]> }) {
  const m = mats();
  const i = side === 1 ? 1 : 0;
  return (
    <group position={[side * 0.125, 0, 0]} rotation={[0, 0, -side * 0.14]}>
      <mesh material={m.metal} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.115, 0.2, 24]} />
      </mesh>
      <mesh material={m.paint} position={[0, 0, 0.1]}>
        <torusGeometry args={[0.1, 0.018, 10, 32]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0, 0.102]}>
        <circleGeometry args={[0.092, 32]} />
      </mesh>
      <group ref={(o) => void (iris.current[i] = o)} position={[0, 0, 0.105]}>
        <mesh material={accent}>
          <ringGeometry args={[0.028, 0.05, 32]} />
        </mesh>
        <mesh position={[-0.025, 0.025, 0.001]}>
          <circleGeometry args={[0.012, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <mesh ref={(o) => void (brow.current[i] = o)} material={m.paintDark} position={[0, 0.125, 0.02]}>
        <boxGeometry args={[0.2, 0.03, 0.16]} />
      </mesh>
    </group>
  );
}

/* ───────────── the robot ───────────── */

/**
 * Tracked utility robot. Drives itself to `rig.goal` (turning to face travel, treads rolling),
 * rolls in when its station assembles, and blends toward whatever pose `act` asks for.
 */
export default function Robot({
  index,
  home,
  enter = [4, 0, 0],
  faceYaw = 0,
  accent = "#22d3ee",
  act,
  scale = 0.9,
}: {
  index: number;
  home: [number, number, number];
  /** offset (from home) the robot rolls in from */
  enter?: [number, number, number];
  faceYaw?: number;
  accent?: string;
  act?: Act;
  scale?: number;
}) {
  const m = mats();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const fingL = useRef<(THREE.Group | null)[]>([]);
  const fingR = useRef<(THREE.Group | null)[]>([]);
  const tipL = useRef<THREE.Object3D>(null);
  const tipR = useRef<THREE.Object3D>(null);
  const iris = useRef<(THREE.Group | null)[]>([]);
  const brows = useRef<(THREE.Mesh | null)[]>([]);
  const meter = useRef<(THREE.Mesh | null)[]>([]);
  const travelL = useRef(0);
  const travelR = useRef(0);

  const accentMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.5), toneMapped: false }), [accent]);
  const dim = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1f2a1f", toneMapped: false }), []);
  const lit = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#a3e635").multiplyScalar(2), toneMapped: false }), []);
  useEffect(
    () => () => {
      accentMat.dispose();
      dim.dispose();
      lit.dispose();
    },
    [accentMat, dim, lit],
  );

  const s = useMemo(() => {
    const h = new THREE.Vector3(...home);
    return {
      home: h,
      start: h.clone().add(new THREE.Vector3(...enter)),
      rig: { pose: restPose(), goal: h.clone(), faceYaw, moving: false } as unknown as Rig,
      cur: restPose(),
      blinkAt: 2,
      tmp: new THREE.Vector3(),
      tmp2: new THREE.Vector3(),
      parked: false,
      yaw: faceYaw,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock, camera }, rawDt) => {
    const r = root.current;
    if (!r || !body.current || !head.current || !neck.current || !armL.current || !armR.current) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const b = build(index);
    const rig = s.rig;
    rig.root = r;
    rig.tipL = tipL.current!;
    rig.tipR = tipR.current!;
    rig.eye = head.current;

    // Off stage: wait at the entry point so it rolls in every time you arrive.
    if (b < 0.03) {
      r.position.copy(s.start);
      rig.goal.copy(s.start);
      s.parked = false;
      r.visible = false;
      return;
    }
    r.visible = true;
    if (!s.parked) {
      rig.goal.copy(s.home);
      s.parked = true;
    }

    // Controller decides pose + goal for this frame.
    Object.assign(rig.pose, restPose());
    rig.faceYaw = faceYaw;
    act?.(rig, { t, dt, b });
    const p = rig.pose;

    // ── driving ──
    const d = s.tmp.copy(rig.goal).sub(r.position);
    d.y = 0;
    const dist = d.length();
    let fwd = 0;
    let turn = 0;
    if (dist > 0.04) {
      const want = Math.atan2(d.x, d.z);
      let diff = want - s.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      turn = THREE.MathUtils.clamp(diff * 6, -6, 6);
      if (Math.abs(diff) < 0.7) fwd = Math.min(3, dist * 3.5) * (1 - Math.abs(diff));
    } else {
      let diff = rig.faceYaw - s.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      turn = THREE.MathUtils.clamp(diff * 4, -3, 3);
    }
    s.yaw += turn * dt;
    r.rotation.y = s.yaw;
    r.position.x += Math.sin(s.yaw) * fwd * dt;
    r.position.z += Math.cos(s.yaw) * fwd * dt;
    r.position.y = THREE.MathUtils.damp(r.position.y, rig.goal.y, 6, dt);
    rig.moving = fwd > 0.05 || Math.abs(turn) > 0.3;
    // Differential drive: turning spins the treads in opposite directions.
    travelL.current += (fwd + turn * 0.45) * dt;
    travelR.current += (fwd - turn * 0.45) * dt;

    // ── blend pose ──
    const c = s.cur;
    const k = (a: number, b2: number, l = 7) => THREE.MathUtils.damp(a, b2, l, dt);
    (["lPitch", "lYaw", "rPitch", "rYaw", "gripL", "gripR", "eyes", "brows", "lean", "bounce", "scale"] as const).forEach((key) => (c[key] = k(c[key], p[key])));

    r.scale.setScalar(scale * Math.max(0.001, c.scale) * Math.min(1, b * 3));
    const hop = Math.abs(Math.sin(t * 9)) * 0.12 * c.bounce;
    const rumble = rig.moving ? Math.sin(t * 60) * 0.004 : 0;
    body.current.position.y = hop + rumble + Math.sin(t * 2) * 0.004;
    body.current.rotation.x = k(body.current.rotation.x, c.lean - fwd * 0.08, 5);

    armL.current.rotation.set(c.lPitch, -c.lYaw, 0);
    armR.current.rotation.set(c.rPitch, c.rYaw, 0);
    fingL.current.forEach((f, i) => f && (f.rotation.x = (i ? 1 : -1) * (1 - c.gripL) * 0.45));
    fingR.current.forEach((f, i) => f && (f.rotation.x = (i ? 1 : -1) * (1 - c.gripR) * 0.45));

    // ── head: look at a point or the cursor ──
    let yaw: number;
    let pitch: number;
    if (p.look) {
      neck.current.updateWorldMatrix(true, false);
      const lp = neck.current.worldToLocal(s.tmp2.copy(p.look));
      yaw = Math.atan2(lp.x, lp.z);
      pitch = -Math.atan2(lp.y - 0.32, Math.hypot(lp.x, lp.z));
    } else {
      // Cursor projected in front of the camera.
      s.tmp2.set(store.mouse.x, store.mouse.y, 0.5).unproject(camera);
      neck.current.updateWorldMatrix(true, false);
      const lp = neck.current.worldToLocal(s.tmp2);
      yaw = Math.atan2(lp.x, lp.z) * 0.7;
      pitch = -Math.atan2(lp.y - 0.32, Math.hypot(lp.x, lp.z)) * 0.6;
    }
    yaw = THREE.MathUtils.clamp(yaw + Math.sin(t * 0.7) * 0.05, -1.3, 1.3);
    pitch = THREE.MathUtils.clamp(pitch, -0.6, 0.5);
    head.current.rotation.y = k(head.current.rotation.y, yaw, 6);
    head.current.rotation.x = k(head.current.rotation.x, pitch, 6);
    head.current.rotation.z = k(head.current.rotation.z, Math.sin(t * 1.3) * 0.05 + c.brows * 0.05, 3);
    neck.current.rotation.x = k(neck.current.rotation.x, -c.lean * 0.6, 5);

    // ── eyes + brows ──
    if (t > s.blinkAt) s.blinkAt = t + 2.5 + Math.random() * 3;
    const blink = s.blinkAt - t > 0.12 ? 1 : 0.1;
    iris.current.forEach((g) => g && g.scale.set(c.eyes, c.eyes * blink, 1));
    brows.current.forEach((br, i) => {
      if (!br) return;
      br.position.y = 0.125 + c.brows * 0.02;
      br.rotation.z = (i ? -1 : 1) * c.brows * -0.25;
    });

    // ── chest charge meter: fills as the station assembles ──
    meter.current.forEach((bar, i) => bar && (bar.material = b * 5 > i + 0.5 && (i < 4 || Math.sin(t * 6) > 0) ? lit : dim));
  });

  return (
    <group ref={root} position={enter.map((v, i) => v + home[i]) as [number, number, number]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[1.6, 1.4]} />
        <meshBasicMaterial map={blobShadow()} transparent depthWrite={false} />
      </mesh>
      <Tread side={1} travel={travelR} />
      <Tread side={-1} travel={travelL} />

      <group ref={body}>
        <RoundedBox args={[0.78, 0.66, 0.66]} radius={0.05} smoothness={3} position={[0, 0.63, 0]} material={m.paint} />
        {/* front hatch + solar charge meter */}
        <mesh material={m.panel} position={[0, 0.63, 0.332]}>
          <boxGeometry args={[0.56, 0.38, 0.02]} />
        </mesh>
        <mesh material={m.paintDark} position={[0, 0.84, 0.335]}>
          <boxGeometry args={[0.6, 0.03, 0.02]} />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} ref={(o) => void (meter.current[i] = o)} position={[-0.2, 0.52 + i * 0.045, 0.344]} material={dim}>
            <boxGeometry args={[0.1, 0.03, 0.005]} />
          </mesh>
        ))}
        <mesh position={[0.18, 0.72, 0.344]} material={accentMat}>
          <circleGeometry args={[0.03, 16]} />
        </mesh>
        {[
          [-0.33, 0.9],
          [0.33, 0.9],
          [-0.33, 0.36],
          [0.33, 0.36],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} material={m.metal} position={[x, y, 0.335]}>
            <sphereGeometry args={[0.015, 8, 8]} />
          </mesh>
        ))}

        {/* neck + binocular head */}
        <mesh material={m.metal} position={[0, 0.99, -0.05]}>
          <boxGeometry args={[0.16, 0.06, 0.16]} />
        </mesh>
        <group ref={neck} position={[0, 1.0, -0.05]}>
          <mesh material={m.metal} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.16, 12]} />
          </mesh>
          <mesh material={m.metal} position={[0, 0.17, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
          </mesh>
          <mesh material={m.metal} position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.14, 12]} />
          </mesh>
          <group ref={head} position={[0, 0.32, 0]} rotation-order="YXZ">
            <mesh material={m.metal} position={[0, 0, -0.02]}>
              <boxGeometry args={[0.1, 0.06, 0.12]} />
            </mesh>
            <group position={[0, 0.03, 0.02]}>
              <Eye side={-1} accent={accentMat} iris={iris} brow={brows} />
              <Eye side={1} accent={accentMat} iris={iris} brow={brows} />
            </group>
          </group>
        </group>

        <Arm side={-1} arm={armL} fingers={fingL} tip={tipL} />
        <Arm side={1} arm={armR} fingers={fingR} tip={tipR} />
      </group>
    </group>
  );
}
