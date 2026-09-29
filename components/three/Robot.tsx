"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { build, store } from "@/lib/store";
import { useTheme } from "@/lib/theme";

/* ───────────── materials: gloss-white composite shell over graphite mechanics ───────────── */

let M: Record<"shell" | "graphite" | "joint" | "visor" | "rubber", THREE.Material> | null = null;
function mats() {
  if (!M) {
    M = {
      shell: new THREE.MeshPhysicalMaterial({ color: "#d9dde4", roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.28, envMapIntensity: 0.75 }),
      graphite: new THREE.MeshPhysicalMaterial({ color: "#262a32", roughness: 0.38, metalness: 0.75, clearcoat: 0.3 }),
      joint: new THREE.MeshStandardMaterial({ color: "#14161b", roughness: 0.3, metalness: 0.9 }),
      visor: new THREE.MeshPhysicalMaterial({ color: "#04060a", roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#1a1c21", roughness: 0.9, metalness: 0 }),
    };
  }
  return M;
}

/** Soft radial falloff, shared by the contact shadow, thruster wash and floor light pool. */
let radialTex: THREE.Texture | null = null;
function radial() {
  if (!radialTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.45, "rgba(255,255,255,0.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    radialTex = new THREE.CanvasTexture(c);
  }
  return radialTex;
}

/** Vertical fade (opaque at the top), for the thruster light cone. */
let fadeTex: THREE.Texture | null = null;
function fade() {
  if (!fadeTex) {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createLinearGradient(0, 0, 0, 64);
    r.addColorStop(0, "#fff");
    r.addColorStop(1, "#000");
    g.fillStyle = r;
    g.fillRect(0, 0, 4, 64);
    fadeTex = new THREE.CanvasTexture(c);
  }
  return fadeTex;
}

/* ───────────── silhouettes (lathe profiles: radius, height) ───────────── */

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
const TORSO = [V2(0, 0.44), V2(0.15, 0.44), V2(0.21, 0.48), V2(0.27, 0.57), V2(0.31, 0.68), V2(0.33, 0.79), V2(0.325, 0.88), V2(0.29, 0.96), V2(0.21, 1.01), V2(0, 1.025)];
/** Graphite abdomen sleeve, just proud of the torso shell below the seam line (two-tone body). */
const ABDOMEN = [V2(0, 0.44), V2(0.162, 0.44), V2(0.222, 0.48), V2(0.282, 0.57), V2(0.3, 0.605), V2(0, 0.605)];
const POD = [V2(0, 0.15), V2(0.19, 0.15), V2(0.28, 0.18), V2(0.34, 0.235), V2(0.345, 0.27), V2(0.3, 0.33), V2(0.2, 0.365), V2(0, 0.375)];
const TORSO_SCALE: [number, number, number] = [1.18, 1, 0.88];

/** Pill-shaped LED eye. */
const PILL = (() => {
  const w = 0.064;
  const h = 0.03;
  const r = h / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2);
  sh.lineTo(w / 2 - r, -h / 2);
  sh.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  sh.lineTo(-w / 2 + r, h / 2);
  sh.absarc(-w / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return sh;
})();

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
  eyes: number; // eye size, 1 = normal, >1 = wide
  brows: number; // expression: -1 stern/sad .. 1 surprised/happy (shapes the visor eyes)
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
  /** the visor, for things that come out of the eyes (scan beams) */
  eye: THREE.Object3D;
  moving: boolean;
};

const SHOULDER = { l: new THREE.Vector3(-0.43, 0.86, 0.0), r: new THREE.Vector3(0.43, 0.86, 0.0) };
const NECK_Y = 1.02;
const HEAD_Y = 0.2; // head pivot above the neck base
const HOVER = 0.07; // resting float height of the drive pod
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

const restPose = (): Pose => ({ lPitch: 0.9, lYaw: -0.12, rPitch: 0.9, rYaw: 0.12, gripL: 0.3, gripR: 0.3, look: null, eyes: 1, brows: 0, lean: 0, bounce: 0, scale: 1 });

/* ───────────── pieces ───────────── */

function Arm({
  side,
  arm,
  fingers,
  tip,
  seam,
}: {
  side: 1 | -1;
  arm: React.RefObject<THREE.Group | null>;
  fingers: React.RefObject<(THREE.Group | null)[]>;
  tip: React.RefObject<THREE.Object3D | null>;
  seam: THREE.Material;
}) {
  const m = mats();
  const S = side === 1 ? SHOULDER.r : SHOULDER.l;
  return (
    <group ref={arm} position={[S.x, S.y, S.z]} rotation-order="YXZ">
      {/* shoulder: ball joint under a shell pauldron */}
      <mesh material={m.joint}>
        <sphereGeometry args={[0.078, 20, 16]} />
      </mesh>
      <mesh material={m.shell} position={[side * 0.025, 0.035, 0]} scale={[1, 0.8, 1.15]}>
        <sphereGeometry args={[0.105, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      {/* upper arm */}
      <mesh material={m.shell} position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.052, 0.18, 6, 16]} />
      </mesh>
      <mesh material={m.graphite} position={[0, -0.03, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.036, 0.16, 4, 12]} />
      </mesh>
      {/* elbow */}
      <mesh material={m.joint} position={[0, 0, 0.34]}>
        <sphereGeometry args={[0.054, 16, 12]} />
      </mesh>
      <mesh material={seam} position={[0, 0, 0.34]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.056, 0.006, 6, 28]} />
      </mesh>
      {/* forearm with a light strip along the top */}
      <mesh material={m.shell} position={[0, 0, 0.47]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.047, 0.14, 6, 16]} />
      </mesh>
      <mesh material={seam} position={[0, 0.047, 0.47]}>
        <boxGeometry args={[0.012, 0.006, 0.12]} />
      </mesh>
      {/* wrist + gripper */}
      <mesh material={m.graphite} position={[0, 0, 0.575]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.034, 0.04, 0.04, 16]} />
      </mesh>
      <group position={[0, 0, 0.6]}>
        <RoundedBox args={[0.085, 0.065, 0.05]} radius={0.012} smoothness={3} material={m.graphite} position={[0, 0, 0.01]} />
        {[1, -1].map((u, i) => (
          <group key={u} ref={(o) => void (fingers.current[i] = o)} position={[0, u * 0.024, 0.03]}>
            <mesh material={m.joint} position={[0, 0, 0.045]}>
              <boxGeometry args={[0.05, 0.016, 0.09]} />
            </mesh>
            <mesh material={m.joint} position={[0, -u * 0.012, 0.1]} rotation={[u * 0.45, 0, 0]}>
              <boxGeometry args={[0.046, 0.014, 0.045]} />
            </mesh>
            <mesh material={m.rubber} position={[0, -u * 0.024, 0.118]} rotation={[u * 0.45, 0, 0]}>
              <boxGeometry args={[0.04, 0.006, 0.03]} />
            </mesh>
          </group>
        ))}
        <object3D ref={tip} position={[0, 0, 0.16]} />
      </group>
    </group>
  );
}

/* ───────────── the robot ───────────── */

/**
 * Hover-drive service android. Glides to `rig.goal` (turning to face travel, banking into turns),
 * flies in when its station assembles, and blends toward whatever pose `act` asks for.
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
  /** offset (from home) the robot flies in from */
  enter?: [number, number, number];
  faceYaw?: number;
  accent?: string;
  act?: Act;
  scale?: number;
}) {
  const m = mats();
  const light = useTheme() === "light";
  const root = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const visor = useRef<THREE.Object3D>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const fingL = useRef<(THREE.Group | null)[]>([]);
  const fingR = useRef<(THREE.Group | null)[]>([]);
  const tipL = useRef<THREE.Object3D>(null);
  const tipR = useRef<THREE.Object3D>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const core = useRef<THREE.Mesh>(null);
  const meter = useRef<(THREE.Mesh | null)[]>([]);
  const shadow = useRef<THREE.Mesh>(null);

  const g = useMemo(() => {
    const base = new THREE.Color(accent);
    const glow = (o: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false, ...o });
    return {
      base,
      eye: glow(),
      seam: glow(),
      dim: new THREE.MeshBasicMaterial({ color: "#1b1f27", toneMapped: false }),
      wash: glow({ map: radial(), transparent: true, depthWrite: false }),
      cone: glow({ alphaMap: fade(), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      pool: glow({ map: radial(), transparent: true, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({ color: "#000", map: radial(), transparent: true, depthWrite: false, opacity: 0.55 }),
    };
  }, [accent]);
  useEffect(() => () => Object.values(g).forEach((v) => v instanceof THREE.Material && v.dispose()), [g]);

  // Light on dark adds up; on a pale sky the glow has to be painted.
  useEffect(() => {
    const mode = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    g.wash.blending = g.cone.blending = g.pool.blending = mode;
    g.shadow.opacity = light ? 0.35 : 0.55;
  }, [light, g]);

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
      bank: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock, camera }, rawDt) => {
    const r = root.current;
    if (!r || !frame.current || !body.current || !head.current || !neck.current || !armL.current || !armR.current) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const b = build(index);
    const rig = s.rig;
    rig.root = r;
    rig.tipL = tipL.current!;
    rig.tipR = tipR.current!;
    rig.eye = visor.current ?? head.current;

    // Off stage: wait at the entry point so it flies in every time you arrive.
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

    // ── blend pose ──
    const c = s.cur;
    const k = (a: number, b2: number, l = 7) => THREE.MathUtils.damp(a, b2, l, dt);
    (["lPitch", "lYaw", "rPitch", "rYaw", "gripL", "gripR", "eyes", "brows", "lean", "bounce", "scale"] as const).forEach((key) => (c[key] = k(c[key], p[key])));

    r.scale.setScalar(scale * Math.max(0.001, c.scale) * Math.min(1, b * 3));

    // ── hover dynamics: float, bank into turns, pitch into travel ──
    const hop = Math.abs(Math.sin(t * 7)) * 0.1 * c.bounce;
    const lift = HOVER + Math.sin(t * 2.1) * 0.018 + Math.sin(t * 3.7) * 0.006 + hop;
    frame.current.position.y = lift;
    s.bank = k(s.bank, THREE.MathUtils.clamp(-turn * 0.035, -0.18, 0.18), 5);
    frame.current.rotation.z = s.bank;
    frame.current.rotation.x = k(frame.current.rotation.x, fwd * 0.07, 4);
    body.current.rotation.x = k(body.current.rotation.x, c.lean, 5);
    body.current.rotation.y = k(body.current.rotation.y, Math.sin(t * 0.6) * 0.03, 3);
    if (shadow.current) shadow.current.scale.setScalar(1.1 - lift * 1.5);

    armL.current.rotation.set(c.lPitch, -c.lYaw, 0);
    armR.current.rotation.set(c.rPitch, c.rYaw, 0);
    fingL.current.forEach((f, i) => f && (f.rotation.x = (i ? 1 : -1) * (1 - c.gripL) * 0.5));
    fingR.current.forEach((f, i) => f && (f.rotation.x = (i ? 1 : -1) * (1 - c.gripR) * 0.5));

    // ── head: look at a point or the cursor ──
    let yaw: number;
    let pitch: number;
    if (p.look) {
      neck.current.updateWorldMatrix(true, false);
      const lp = neck.current.worldToLocal(s.tmp2.copy(p.look));
      yaw = Math.atan2(lp.x, lp.z);
      pitch = -Math.atan2(lp.y - HEAD_Y, Math.hypot(lp.x, lp.z));
    } else {
      // Cursor projected in front of the camera.
      s.tmp2.set(store.mouse.x, store.mouse.y, 0.5).unproject(camera);
      neck.current.updateWorldMatrix(true, false);
      const lp = neck.current.worldToLocal(s.tmp2);
      yaw = Math.atan2(lp.x, lp.z) * 0.7;
      pitch = -Math.atan2(lp.y - HEAD_Y, Math.hypot(lp.x, lp.z)) * 0.6;
    }
    yaw = THREE.MathUtils.clamp(yaw + Math.sin(t * 0.7) * 0.04, -1.3, 1.3);
    pitch = THREE.MathUtils.clamp(pitch, -0.6, 0.5);
    head.current.rotation.y = k(head.current.rotation.y, yaw, 6);
    head.current.rotation.x = k(head.current.rotation.x, pitch, 6);
    head.current.rotation.z = k(head.current.rotation.z, Math.sin(t * 1.1) * 0.03 + c.brows * 0.06, 3);
    neck.current.rotation.x = k(neck.current.rotation.x, -c.lean * 0.6, 5);

    // ── visor eyes: blink, widen, and tilt with the expression ──
    if (t > s.blinkAt) s.blinkAt = t + 2.5 + Math.random() * 3;
    const blink = s.blinkAt - t > 0.1 ? 1 : 0.08;
    const e = c.brows;
    eyes.current.forEach((eye, i) => {
      if (!eye) return;
      const side = i ? 1 : -1;
      eye.scale.set(c.eyes * (1 + Math.max(0, e) * 0.2), c.eyes * blink * (1 + e * 0.45), 1);
      eye.rotation.z = side * e * -0.3;
      eye.position.y = 0.012 + e * 0.008;
    });

    // ── light: accent glow levels, softer on the light theme ──
    const hot = THREE.MathUtils.lerp(2.6, 1.1, store.light);
    g.eye.color.copy(g.base).multiplyScalar(hot);
    g.seam.color.copy(g.base).multiplyScalar(hot * (0.55 + Math.sin(t * 2.2 + index) * 0.15));
    const thrust = 0.55 + fwd * 0.2 + Math.abs(turn) * 0.03 + Math.sin(t * 23) * 0.04;
    g.cone.opacity = thrust * (light ? 0.28 : 0.45);
    g.wash.opacity = thrust * (light ? 0.45 : 0.9);
    g.pool.opacity = (light ? 0.14 : 0.2) * (1 - lift * 2);
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 2.6) * 0.06);

    // ── chest charge meter: fills as the station assembles ──
    meter.current.forEach((bar, i) => bar && (bar.material = b * 5 > i + 0.5 && (i < 4 || Math.sin(t * 6) > 0) ? g.seam : g.dim));
  });

  return (
    <group ref={root} position={enter.map((v, i) => v + home[i]) as [number, number, number]}>
      {/* on the ground: contact shadow + a pool of thruster light */}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={g.shadow}>
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={g.pool}>
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>

      <group ref={frame}>
        {/* ── hover drive pod ── */}
        <mesh material={m.shell} scale={[1.1, 1, 1]}>
          <latheGeometry args={[POD, 48]} />
        </mesh>
        <mesh material={m.graphite} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 1, 1]}>
          <torusGeometry args={[0.345, 0.022, 10, 64]} />
        </mesh>
        <mesh material={m.joint} position={[0, 0.148, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 40]} />
        </mesh>
        <mesh material={g.seam} position={[0, 0.145, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.012, 8, 48]} />
        </mesh>
        {/* thruster: light cone + wash under the pod */}
        <mesh material={g.cone} position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.16, 0.3, 0.15, 32, 1, true]} />
        </mesh>
        <mesh material={g.wash} position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.7]} />
        </mesh>
        {/* stabiliser fins */}
        {[-1, 1].map((sd) => (
          <RoundedBox key={sd} args={[0.05, 0.1, 0.26]} radius={0.02} smoothness={3} material={m.graphite} position={[sd * 0.39, 0.25, -0.06]} rotation={[0.25, 0, sd * 0.2]} />
        ))}

        <group ref={body}>
          {/* waist: gimbal joint with a glowing ring */}
          <mesh material={m.graphite} position={[0, 0.41, 0]}>
            <cylinderGeometry args={[0.15, 0.17, 0.1, 32]} />
          </mesh>
          <mesh material={g.seam} position={[0, 0.405, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.168, 0.007, 6, 48]} />
          </mesh>

          {/* torso shell with a seam line wrapped around it */}
          <group scale={TORSO_SCALE}>
            <mesh material={m.shell}>
              <latheGeometry args={[TORSO, 56]} />
            </mesh>
            <mesh material={m.graphite}>
              <latheGeometry args={[ABDOMEN, 56]} />
            </mesh>
            <mesh material={g.seam} position={[0, 0.605, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.292, 0.004, 6, 72]} />
            </mesh>
            {/* shoulder yoke */}
            <mesh material={m.graphite} position={[0, 0.955, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.27, 0.02, 10, 64]} />
            </mesh>
          </group>

          {/* graphite flank armour with a light slot */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * 0.372, 0.72, 0]} rotation={[0, 0, sd * -0.08]}>
              <RoundedBox args={[0.05, 0.25, 0.26]} radius={0.018} smoothness={3} material={m.graphite} />
              <mesh material={g.seam} position={[sd * 0.026, 0, 0.02]}>
                <boxGeometry args={[0.004, 0.15, 0.012]} />
              </mesh>
            </group>
          ))}

          {/* chest: graphite plate, pulsing core and charge meter */}
          <group position={[0, 0.76, 0.285]} rotation={[-0.08, 0, 0]}>
            <RoundedBox args={[0.34, 0.26, 0.04]} radius={0.03} smoothness={4} material={m.graphite} />
            <mesh material={m.joint} position={[0.06, 0.02, 0.021]}>
              <circleGeometry args={[0.058, 40]} />
            </mesh>
            <mesh ref={core} material={g.eye} position={[0.06, 0.02, 0.023]}>
              <ringGeometry args={[0.03, 0.042, 40]} />
            </mesh>
            <mesh material={g.eye} position={[0.06, 0.02, 0.024]}>
              <circleGeometry args={[0.014, 20]} />
            </mesh>
            {Array.from({ length: 5 }, (_, i) => (
              <mesh key={i} ref={(o) => void (meter.current[i] = o)} position={[-0.1, -0.08 + i * 0.038, 0.022]} material={g.dim}>
                <planeGeometry args={[0.07, 0.018]} />
              </mesh>
            ))}
          </group>

          {/* back: power pack with vents */}
          <group position={[0, 0.78, -0.28]}>
            <RoundedBox args={[0.36, 0.34, 0.14]} radius={0.04} smoothness={4} material={m.graphite} />
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={m.joint} position={[0, 0.08 - i * 0.07, -0.072]}>
                <boxGeometry args={[0.24, 0.022, 0.01]} />
              </mesh>
            ))}
          </group>

          {/* neck + head */}
          <mesh material={m.joint} position={[0, NECK_Y - 0.005, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 0.05, 24]} />
          </mesh>
          <group ref={neck} position={[0, NECK_Y, 0]}>
            <mesh material={m.graphite} position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.045, 0.055, 0.12, 16]} />
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} material={m.joint} position={[sd * 0.06, 0.06, -0.01]} rotation={[0, 0, sd * -0.12]}>
                <cylinderGeometry args={[0.012, 0.012, 0.13, 8]} />
              </mesh>
            ))}
            <group ref={head} position={[0, HEAD_Y, 0]} rotation-order="YXZ">
              {/* helmet */}
              <mesh material={m.shell} scale={[1.22, 0.92, 1.08]}>
                <sphereGeometry args={[0.18, 40, 28]} />
              </mesh>
              {/* wraparound glass visor */}
              <mesh material={m.visor} scale={[1.22, 0.92, 1.08]}>
                <sphereGeometry args={[0.1835, 48, 20, Math.PI / 2 - 1.05, 2.1, 1.12, 0.78]} />
              </mesh>
              <object3D ref={visor} position={[0, 0.01, 0.19]} />
              {/* LED eyes behind the glass */}
              {[-1, 1].map((sd, i) => (
                <mesh key={sd} ref={(o) => void (eyes.current[i] = o)} material={g.eye} position={[sd * 0.068, 0.012, 0.193]} rotation={[0, sd * 0.3, 0]}>
                  <shapeGeometry args={[PILL, 12]} />
                </mesh>
              ))}
              {/* audio sensors */}
              {[-1, 1].map((sd) => (
                <group key={sd} position={[sd * 0.215, 0, -0.01]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh material={m.graphite}>
                    <cylinderGeometry args={[0.055, 0.06, 0.03, 28]} />
                  </mesh>
                  <mesh material={g.seam} position={[0, sd * 0.016, 0]}>
                    <torusGeometry args={[0.04, 0.005, 6, 28]} />
                  </mesh>
                </group>
              ))}
              {/* crest fin */}
              <RoundedBox args={[0.03, 0.05, 0.2]} radius={0.012} smoothness={3} material={m.graphite} position={[0, 0.165, -0.04]} />
            </group>
          </group>

          <Arm side={-1} arm={armL} fingers={fingL} tip={tipL} seam={g.seam} />
          <Arm side={1} arm={armR} fingers={fingR} tip={tipR} seam={g.seam} />
        </group>
      </group>
    </group>
  );
}
