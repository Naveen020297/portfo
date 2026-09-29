"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { OFFERINGS } from "@/lib/content";
import { build, rel, store, type Tier } from "@/lib/store";
import { Plate, backOut, emitSparks, useGlow, useMetals } from "./fx";
import { Callout, Packets } from "./parts";
import Robot, { aim, headingTo, type Act, type Rig } from "./Robot";
import { PhoneScreen, WebScreen } from "./Screens";
import Singularity from "./Singularity";

const C = { cyan: "#22d3ee", violet: "#8b5cf6", amber: "#fbbf24", pink: "#f472b6", green: "#34d399" };
const damp = THREE.MathUtils.damp;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Idle sway + cursor tilt + a turn driven by how far you've scrolled past. */
function useSway(index: number, baseY = 0, turn = 0.6) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = damp(g.rotation.y, baseY + rel(index) * turn + store.mouse.x * 0.25, 4, dt);
    g.rotation.x = damp(g.rotation.x, -store.mouse.y * 0.12, 4, dt);
  });
  return ref;
}

/** A ring of armour segments that assembles, then keeps turning like a gear. */
function SegRing({
  index,
  radius,
  count,
  size,
  glow,
  speed,
  seed,
  delay = 0,
  spark,
  ...props
}: {
  index: number;
  radius: number;
  count: number;
  size: [number, number, number];
  glow?: THREE.Material;
  speed: number;
  seed: number;
  delay?: number;
  spark?: string;
} & Omit<React.ComponentProps<"group">, "ref">) {
  const { gun, chrome } = useMetals();
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += dt * speed * (1 + Math.abs(store.vel) * 6);
  });
  return (
    <group {...props}>
      <group ref={spin}>
        {Array.from({ length: count }, (_, i) => {
          const a = (i / count) * Math.PI * 2;
          return (
            <Plate
              key={i}
              index={index}
              seed={seed + i * 7}
              delay={delay + (i / count) * 0.3}
              position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}
              rotation={[0, 0, a + Math.PI / 2]}
              spark={i % 3 === 0 ? spark : undefined}
            >
              <mesh material={i % 2 ? chrome : gun}>
                <boxGeometry args={size} />
              </mesh>
              {glow && i % 2 === 0 && (
                <mesh material={glow} position={[0, 0, size[2] / 2 + 0.005]}>
                  <boxGeometry args={[size[0] * 0.55, size[1] * 0.18, 0.01]} />
                </mesh>
              )}
            </Plate>
          );
        })}
      </group>
    </group>
  );
}

/* ───────────── 00 · Hero: the G-Force singularity ───────────── */
export function HeroCore({ tier }: { tier: Tier }) {
  const core = useRef<THREE.Group>(null);
  const at = useMemo(() => new THREE.Vector3(), []);

  // The robot watches the black hole, braces under G-force, and now and then waves at you.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      const v = Math.abs(store.vel);
      const p = rig.pose;
      core.current?.getWorldPosition(at);
      if (v > 0.12 || Math.sin(t * 0.45) > -0.2) p.look = at;
      p.eyes = 1 + v * 0.9;
      p.brows = -0.25 + v * 1.4;
      p.lean = -v * 0.45;
      if (v > 0.18) {
        p.lPitch = p.rPitch = -0.15;
        p.gripL = p.gripR = 1;
      } else if (Math.sin(t * 0.45) < -0.75) {
        p.look = null;
        p.rPitch = -2.0;
        p.rYaw = 0.35 + Math.sin(t * 11) * 0.3;
        p.brows = 0.5;
      }
    },
    [at],
  );

  return (
    <>
      <group ref={core} position={[0, 0.45, 0]} scale={0.85}>
        <Singularity tier={tier} />
      </group>
      <Robot index={0} home={[-2.1, -2.0, 1.2]} enter={[4.5, 0, 0.6]} faceYaw={0.35} accent={C.cyan} act={act} />
      <Callout index={0} position={[-1.5, 2.1, 0]} title="G-FORCE SINGULARITY" text="Scroll fast: the disk spins up, jets fire" color={C.cyan} align="left" />
    </>
  );
}

/* ───────────── 01 · Frontend & mobile: a monitor and phone that transform into place ───────────── */
export function BuildStation({ tier }: { tier: Tier }) {
  const { gun, dark, chrome } = useMetals();
  const glow = useGlow(C.violet, 1, 3);
  const glowC = useGlow(C.cyan, 1, 3);
  const sway = useSway(1, 0.28, 0.5);
  const W = 3.6;
  const H = 2.3;
  const monitor = useRef<THREE.Group>(null);
  const phone = useRef<THREE.Group>(null);
  const at = useMemo(() => new THREE.Vector3(), []);

  // The robot "codes" both screens: turns to one, taps away at it, then switches.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      const onPhone = Math.floor(t / 3.2) % 2 === 1;
      (onPhone ? phone : monitor).current?.getWorldPosition(at);
      const p = rig.pose;
      p.look = at;
      rig.faceYaw = headingTo(rig, at, 1.0);
      if (rig.moving) return;
      const tap = Math.sin(t * 16) * 0.12;
      if (onPhone) {
        aim(rig, "r", at);
        p.rPitch += tap;
        p.gripR = 0.9;
      } else {
        aim(rig, "l", at);
        aim(rig, "r", at);
        p.lPitch += tap;
        p.rPitch -= tap;
        p.gripL = p.gripR = 0.9;
      }
      p.brows = 0.2;
    },
    [at],
  );

  return (
    <>
    <Robot index={1} home={[0.35, -2.05, 1.6]} enter={[4.5, 0, 0.4]} faceYaw={-0.6} accent={C.violet} act={act} />
    <group ref={sway}>
      {/* monitor */}
      <group ref={monitor} position={[-0.35, 0.45, 0]}>
        <Plate index={1} seed={11} delay={0}>
          <mesh material={dark} position={[0, 0, -0.06]}>
            <boxGeometry args={[W, H, 0.06]} />
          </mesh>
        </Plate>
        {[
          { p: [0, H / 2, 0] as const, s: [W + 0.14, 0.12, 0.16] as const },
          { p: [0, -H / 2, 0] as const, s: [W + 0.14, 0.12, 0.16] as const },
          { p: [-W / 2, 0, 0] as const, s: [0.12, H, 0.16] as const },
          { p: [W / 2, 0, 0] as const, s: [0.12, H, 0.16] as const },
        ].map((b, i) => (
          <Plate key={i} index={1} seed={20 + i} delay={0.1 + i * 0.06} position={[...b.p]} spark={C.violet}>
            <mesh material={chrome}>
              <boxGeometry args={[...b.s]} />
            </mesh>
          </Plate>
        ))}
        {/* rear armour: visible as the monitor turns */}
        {tier > 0 &&
          Array.from({ length: 6 }, (_, i) => (
            <Plate key={i} index={1} seed={40 + i} delay={0.05 + i * 0.04} position={[((i % 3) - 1) * 1.15, i < 3 ? 0.5 : -0.5, -0.16]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.04]}>
              <mesh material={gun}>
                <boxGeometry args={[1.08, 0.92, 0.08]} />
              </mesh>
            </Plate>
          ))}
        <Plate index={1} seed={60} delay={0.3} position={[0, -H / 2 - 0.4, -0.1]} spark={C.violet}>
          <mesh material={gun}>
            <boxGeometry args={[0.3, 0.7, 0.14]} />
          </mesh>
          <mesh material={chrome} position={[0, -0.37, 0.1]}>
            <boxGeometry args={[1.5, 0.06, 0.7]} />
          </mesh>
          <mesh material={glow} position={[0, -0.33, 0.46]}>
            <boxGeometry args={[1.2, 0.02, 0.01]} />
          </mesh>
        </Plate>
        <Plate index={1} seed={61} delay={0.35} position={[0, -H / 2 - 0.02, 0.085]}>
          <mesh material={glow}>
            <boxGeometry args={[W * 0.5, 0.025, 0.01]} />
          </mesh>
        </Plate>
        <WebScreen index={1} position={[0, 0, -0.01]} width={W - 0.12} />
      </group>

      {/* phone */}
      <group ref={phone} position={[1.95, -0.55, 0.9]} rotation={[0, -0.25, 0]}>
        <Plate index={1} seed={70} delay={0.2} spark={C.cyan}>
          <RoundedBox args={[1.16, 2.3, 0.1]} radius={0.12} smoothness={3} material={dark} position={[0, 0, -0.06]} />
        </Plate>
        {[-1, 1].map((s, i) => (
          <Plate key={s} index={1} seed={72 + i} delay={0.3 + i * 0.05} position={[s * 0.585, 0, -0.02]} spark={C.cyan}>
            <mesh material={chrome}>
              <boxGeometry args={[0.04, 2.1, 0.12]} />
            </mesh>
            <mesh material={glowC} position={[s * 0.025, 0.4, 0]}>
              <boxGeometry args={[0.01, 0.3, 0.05]} />
            </mesh>
          </Plate>
        ))}
        <PhoneScreen index={1} position={[0, 0, 0]} width={1.04} />
      </group>

      <Callout index={1} position={[-1.6, 2.05, 0]} title="WEB + MOBILE" text="Next · React · Angular · Vite · React Native" color={C.violet} />
    </group>
    </>
  );
}

/* ───────────── 02 · Backend: server rack with drawer blades, RBAC lock, event bus ───────────── */
export function BackendStation({ tier }: { tier: Tier }) {
  const { gun, dark, chrome } = useMetals();
  const sway = useSway(2, -0.32, 0.5);
  const tenantGlows = [useGlow(C.cyan, 2, 3.5), useGlow(C.violet, 2, 3.5), useGlow(C.green, 2, 3.5)];
  const lockGlow = useGlow(C.amber, 2, 3);
  const W = 1.9;
  const H = 2.5;
  const D = 1.2;
  const blades = tier === 0 ? 4 : 6;
  const bladeY = (i: number) => H / 2 - 0.32 - i * ((H - 0.4) / blades);
  const hub = useMemo(() => V(0, H / 2 + 0.75, 0), []);
  const rack = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const beamMat = useGlow(C.green, 2, 1.2);
  const rigRef = useRef<Rig | null>(null);
  const tmp = useMemo(() => ({ at: new THREE.Vector3(), eye: new THREE.Vector3(), mid: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);

  // Security patrol: drive to a spot, turn to the rack, sweep a scan beam over the tenant blades.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      rigRef.current = rig;
      const phase = Math.floor(t / 4.5) % 2;
      rig.goal.x = phase ? 0.9 : -1.1;
      rack.current?.getWorldPosition(tmp.at);
      tmp.at.y += Math.sin(t * 2.2) * 0.9;
      rig.faceYaw = headingTo(rig, tmp.at, 1.25);
      rig.pose.look = rig.moving ? null : tmp.at;
      rig.pose.brows = rig.moving ? 0 : -0.3;
      rig.pose.eyes = rig.moving ? 1 : 0.8;
    },
    [tmp],
  );

  useFrame(() => {
    const b = beam.current;
    const rig = rigRef.current;
    if (!b || !rig?.eye) return;
    b.visible = !rig.moving && build(2) > 0.9;
    if (!b.visible) return;
    // Beam from between the eyes to the scan point, in this group's space.
    rig.eye.getWorldPosition(tmp.eye);
    const parent = b.parent!;
    const e = parent.worldToLocal(tmp.eye.clone());
    const a = parent.worldToLocal(tmp.at.clone());
    const len = e.distanceTo(a);
    b.position.copy(tmp.mid.addVectors(e, a).multiplyScalar(0.5));
    b.scale.set(1, len, 1);
    b.quaternion.setFromUnitVectors(tmp.up, a.sub(e).normalize());
  });
  const leds = useMemo(() => Array.from({ length: blades }, (_, i) => V(-0.45, bladeY(i), D / 2)), [blades]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <Robot index={2} home={[-1.1, -2.05, 1.6]} enter={[-4.5, 0, 0.5]} faceYaw={0.8} accent={C.green} act={act} />
    <mesh ref={beam} material={beamMat} visible={false}>
      <cylinderGeometry args={[0.18, 0.004, 1, 20, 1, true]} />
    </mesh>
    <group ref={sway} position={[0.25, 0.25, 0]}>
      <group ref={rack} position={[0, 0, D / 2]} />
      {/* chassis */}
      {[-1, 1].map((s, i) => (
        <Plate key={s} index={2} seed={100 + i} delay={i * 0.05} position={[s * (W / 2), 0, 0]} spark={C.green}>
          <mesh material={gun}>
            <boxGeometry args={[0.1, H, D]} />
          </mesh>
        </Plate>
      ))}
      {[-1, 1].map((s, i) => (
        <Plate key={s} index={2} seed={110 + i} delay={0.08 + i * 0.05} position={[0, s * (H / 2), 0]} spark={C.green}>
          <mesh material={chrome}>
            <boxGeometry args={[W + 0.1, 0.1, D]} />
          </mesh>
        </Plate>
      ))}
      <Plate index={2} seed={120} delay={0.02} position={[0, 0, -D / 2]}>
        <mesh material={dark}>
          <boxGeometry args={[W, H, 0.05]} />
        </mesh>
      </Plate>

      {/* blades slide in like drawers; LED colour = tenant */}
      {Array.from({ length: blades }, (_, i) => (
        <Plate key={i} index={2} seed={130 + i} delay={0.22 + i * 0.06} from={[0, 0, 3.5]} spin={0.05} position={[0, bladeY(i), 0.02]} spark={C.green}>
          <mesh material={dark}>
            <boxGeometry args={[W - 0.14, (H - 0.4) / blades - 0.06, D - 0.1]} />
          </mesh>
          <mesh material={tenantGlows[Math.floor((i * 3) / blades)]} position={[-0.45, 0, (D - 0.1) / 2 + 0.006]}>
            <boxGeometry args={[0.6, 0.035, 0.01]} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} material={chrome} position={[0.35 + k * 0.16, 0, (D - 0.1) / 2 + 0.01]}>
              <boxGeometry args={[0.1, 0.1, 0.02]} />
            </mesh>
          ))}
        </Plate>
      ))}

      {/* RBAC: concentric lock rings, narrowest = most privileged */}
      <group position={[0, H / 2 + 0.75, 0]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <SegRing index={2} radius={0.95} count={14} size={[0.36, 0.1, 0.12]} glow={lockGlow} speed={0.5} seed={200} delay={0.4} spark={C.amber} />
        <SegRing index={2} radius={0.66} count={10} size={[0.3, 0.09, 0.1]} speed={-0.8} seed={260} delay={0.48} />
        <mesh material={lockGlow}>
          <octahedronGeometry args={[0.2, 0]} />
        </mesh>
      </group>
      <Packets from={hub} targets={leds} color="#ff9ad5" speed={0.45} />

      <Callout index={2} position={[-1.0, 2.0, 0]} title="RBAC LOCK" text="Roles · scopes · sessions" color={C.amber} align="left" />
      <Callout index={2} position={[-1.0, 1.05, 0.6]} title="REALTIME EVENTS" text="WebSockets · SSE · push queues" color={C.pink} align="left" />
      <Callout index={2} position={[-1.0, -0.4, 0.6]} title="MULTI-TENANT" text="Isolated schemas or shared pools" color={C.green} align="left" />
    </group>
    </>
  );
}

/* ───────────── 03 · Data & infra: hydraulic load balancer + database stack ───────────── */
export function InfraStation({ tier }: { tier: Tier }) {
  const { gun, dark, chrome } = useMetals();
  const sway = useSway(3, 0.3, 0.5);
  const glow = useGlow(C.cyan, 3, 3.5);
  const amber = useGlow(C.amber, 3, 3);
  const nodeGlow = useGlow(C.violet, 3, 2.5);
  const hubRef = useRef<THREE.Group>(null);
  const arms = useRef<{ rod: THREE.Object3D | null; node: THREE.Object3D | null; done: boolean }[]>([]);
  const angles = [0.6, Math.PI - 0.6, Math.PI + 0.6, -0.6];
  const nodes = useMemo(() => angles.map((a) => V(Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const origin = useMemo(() => V(0, 0, 0), []);
  const wp = useMemo(() => new THREE.Vector3(), []);

  const at = useMemo(() => new THREE.Vector3(), []);

  // Traffic controller: turns to each healthy server in turn and points the request its way.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      const node = arms.current[Math.floor(t / 1.3) % 3]?.node;
      if (!node) return;
      node.getWorldPosition(at);
      rig.faceYaw = headingTo(rig, at, 1.1);
      rig.pose.look = at;
      const right = rig.root.worldToLocal(at.clone()).x > 0;
      aim(rig, right ? "r" : "l", at);
      if (right) rig.pose.gripR = 1;
      else rig.pose.gripL = 1;
      rig.pose.brows = 0.3;
    },
    [at],
  );

  useFrame((_, dt) => {
    const b = build(3);
    if (hubRef.current) hubRef.current.rotation.z += dt * (0.4 + Math.abs(store.vel) * 3);
    arms.current.forEach((a, i) => {
      if (!a?.rod || !a.node) return;
      // Hydraulic extension: rod pushes out, then the server node deploys on the end.
      const t = Math.min(1, Math.max(0, (b - 0.25 - i * 0.08) / 0.45));
      const e = t >= 1 ? 1 : backOut(t, 2);
      a.rod.position.x = 0.62 + 0.5 * e;
      a.node.position.x = 1.0 + 0.85 * e;
      a.node.scale.setScalar(Math.max(0.001, Math.min(1, t * 2)));
      if (t >= 1 && !a.done) {
        a.node.getWorldPosition(wp);
        emitSparks(wp, 16, C.cyan);
        store.shake = Math.min(1, store.shake + 0.08);
      }
      a.done = t >= 1;
    });
  });

  return (
    <>
    <Robot index={3} home={[2.5, -2.05, 1.6]} enter={[4.5, 0, 0.3]} accent={C.amber} act={act} />
    <group ref={sway}>
      {/* load balancer */}
      <group position={[0.35, 0.55, 0]}>
        <Plate index={3} seed={300} delay={0} spark={C.cyan}>
          <group ref={hubRef}>
            <mesh material={chrome} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.52, 0.52, 0.32, 8]} />
            </mesh>
            <mesh material={glow} position={[0, 0, 0.17]}>
              <torusGeometry args={[0.36, 0.03, 8, 40]} />
            </mesh>
            <mesh material={glow} position={[0, 0, 0.12]}>
              <sphereGeometry args={[0.16, 16, 16]} />
            </mesh>
          </group>
        </Plate>
        {angles.map((a, i) => (
          <group key={i} rotation={[0, 0, a]}>
            <Plate index={3} seed={310 + i} delay={0.12 + i * 0.05} position={[0.62, 0, 0]}>
              <mesh material={gun} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 0.55, 12]} />
              </mesh>
            </Plate>
            <group ref={(o) => void ((arms.current[i] ??= { rod: null, node: null, done: false }).rod = o)}>
              <mesh material={chrome} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.6, 10]} />
              </mesh>
            </group>
            <group ref={(o) => void ((arms.current[i] ??= { rod: null, node: null, done: false }).node = o)} rotation={[0, 0, -a]}>
              <mesh material={dark}>
                <boxGeometry args={[0.55, 0.55, 0.55]} />
              </mesh>
              <mesh material={i === 3 ? amber : nodeGlow} position={[0, 0, 0.281]}>
                <boxGeometry args={[0.32, 0.04, 0.01]} />
              </mesh>
              <mesh material={chrome} position={[0, 0.3, 0]}>
                <boxGeometry args={[0.6, 0.05, 0.6]} />
              </mesh>
            </group>
          </group>
        ))}
        <Packets from={origin} targets={nodes.slice(0, 3)} color="#7ef4ff" speed={0.8} />
      </group>

      {/* database stack: platters drop in and lock */}
      <group position={[-1.55, -1.1, -0.3]}>
        {Array.from({ length: tier === 0 ? 2 : 3 }, (_, i) => (
          <Plate key={i} index={3} seed={340 + i} delay={0.3 + i * 0.1} from={[0, 3 + i, 0]} spin={0.1} position={[0, i * 0.34, 0]} spark={C.amber}>
            <mesh material={i % 2 ? chrome : gun}>
              <cylinderGeometry args={[0.62, 0.62, 0.28, 40]} />
            </mesh>
            <mesh material={amber} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.625, 0.015, 6, 48]} />
            </mesh>
          </Plate>
        ))}
        <Plate index={3} seed={360} delay={0.6} position={[0.95, 1.25, 0.2]}>
          <mesh material={chrome}>
            <octahedronGeometry args={[0.24, 0]} />
          </mesh>
        </Plate>
        <Plate index={3} seed={361} delay={0.65} position={[-0.25, 1.45, 0]}>
          <mesh material={gun}>
            <dodecahedronGeometry args={[0.24, 0]} />
          </mesh>
        </Plate>
      </group>

      <Callout index={3} position={[-1.35, -1.5, 0]} title="MYSQL · MONGODB · REDIS" text="Indexing, pooling, caching layers" color={C.amber} />
      <Callout index={3} position={[2.1, 2.35, 0]} title="L4 / L7 LOAD BALANCER" text="Reverse proxy, SSL termination" color={C.cyan} align="left" />
    </group>
    </>
  );
}

/* ───────────── 04 · Offerings: armoured modules that crack open on hover ───────────── */
function coreGeometry(i: number) {
  switch (i) {
    case 0:
      return <boxGeometry args={[0.32, 0.55, 0.06]} />;
    case 1:
      return <boxGeometry args={[0.58, 0.4, 0.06]} />;
    case 2:
      return <cylinderGeometry args={[0.26, 0.26, 0.36, 6]} />;
    default:
      return <torusKnotGeometry args={[0.18, 0.06, 80, 10]} />;
  }
}

const FACES: { n: [number, number, number]; r: [number, number, number] }[] = [
  { n: [0, 0, 1], r: [0, 0, 0] },
  { n: [0, 0, -1], r: [0, Math.PI, 0] },
  { n: [1, 0, 0], r: [0, Math.PI / 2, 0] },
  { n: [-1, 0, 0], r: [0, -Math.PI / 2, 0] },
  { n: [0, 1, 0], r: [-Math.PI / 2, 0, 0] },
  { n: [0, -1, 0], r: [Math.PI / 2, 0, 0] },
];

/** World positions of the service modules, so the robot can find the hovered one. */
const modulePos = OFFERINGS.map(() => new THREE.Vector3());

function Module({ i, color, glow }: { i: number; color: string; glow: THREE.Material }) {
  const { gun, chrome } = useMetals();
  const body = useRef<THREE.Group>(null);
  const faces = useRef<(THREE.Group | null)[]>([]);
  const core = useRef<THREE.Group>(null);
  const was = useRef(false);
  const wp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const hot = store.hoveredOffering === i;
    const g = body.current;
    if (!g) return;
    g.getWorldPosition(modulePos[i]);
    const open = (g.userData.open = damp(g.userData.open ?? 0, hot ? 1 : 0.08, 7, dt));
    g.rotation.y += dt * (hot ? 2.2 : 0.4);
    g.rotation.x = damp(g.rotation.x, hot ? 0.35 : 0.1, 5, dt);
    g.scale.setScalar(damp(g.scale.x, hot ? 1.3 : 1, 6, dt));
    faces.current.forEach((f, k) => {
      if (!f) return;
      const n = FACES[k].n;
      const d = 0.42 + open * 0.5;
      f.position.set(n[0] * d, n[1] * d, n[2] * d);
      f.rotation.set(FACES[k].r[0] + open * 0.6 * (k % 2 ? 1 : -1), FACES[k].r[1], FACES[k].r[2] + open * 0.4);
    });
    if (core.current) {
      core.current.scale.setScalar(0.7 + open * 0.7);
      core.current.rotation.y -= dt * 3;
    }
    if (hot && !was.current) {
      g.getWorldPosition(wp);
      emitSparks(wp, 26, color, 0.8);
    }
    was.current = hot;
  });

  return (
    <group
      ref={body}
      onPointerOver={() => void (store.hoveredOffering = i)}
      onPointerOut={() => void (store.hoveredOffering === i && (store.hoveredOffering = -1))}
    >
      <group ref={core}>
        <mesh material={glow}>{coreGeometry(i)}</mesh>
      </group>
      {FACES.map((_, k) => (
        <Plate key={k} index={4} seed={400 + i * 10 + k} delay={0.1 + i * 0.1 + k * 0.03} spark={k === 0 ? color : undefined}>
          <group ref={(g) => void (faces.current[k] = g)}>
            <mesh material={k % 2 ? chrome : gun}>
              <boxGeometry args={[0.78, 0.78, 0.06]} />
            </mesh>
            <mesh material={glow} position={[0, -0.3, 0.035]}>
              <boxGeometry args={[0.4, 0.03, 0.01]} />
            </mesh>
          </group>
        </Plate>
      ))}
    </group>
  );
}

export function OfferStation({ tier }: { tier: Tier }) {
  const { chrome } = useMetals();
  const ring = useRef<THREE.Group>(null);
  const glows = OFFERINGS.map((o) => useGlow(o.color, 4, 3.5)); // eslint-disable-line react-hooks/rules-of-hooks
  const ringGlow = useGlow("#ffffff", 4, 1.2);
  const weld = useRef<THREE.Mesh>(null);
  const weldMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  useEffect(() => () => weldMat.dispose(), [weldMat]);
  const rigRef = useRef<Rig | null>(null);
  const tmp = useMemo(() => ({ tip: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), last: 0 }), []);

  // Hover a service: the robot turns to that module and welds it. Otherwise it waves you over.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      rigRef.current = rig;
      const i = store.hoveredOffering;
      const p = rig.pose;
      if (i < 0) {
        if (Math.sin(t * 0.8) > 0.2) {
          p.rPitch = -1.9;
          p.rYaw = 0.3 + Math.sin(t * 10) * 0.3;
          p.brows = 0.4;
        }
        return;
      }
      const at = modulePos[i];
      rig.faceYaw = headingTo(rig, at, 1.1);
      p.look = at;
      aim(rig, "r", at);
      p.gripR = 1;
      p.eyes = 1.25;
      p.brows = 0.6;
      p.bounce = 0.25;
    },
    [],
  );

  useFrame(({ clock }) => {
    const w = weld.current;
    const rig = rigRef.current;
    const i = store.hoveredOffering;
    if (!w || !rig?.tipR) return;
    w.visible = i >= 0 && !rig.moving && build(4) > 0.9;
    if (!w.visible) return;
    const parent = w.parent!;
    rig.tipR.getWorldPosition(tmp.tip);
    const a = parent.worldToLocal(tmp.tip.clone());
    const bpt = parent.worldToLocal(modulePos[i].clone());
    w.position.copy(a).add(bpt).multiplyScalar(0.5);
    w.scale.set(1, a.distanceTo(bpt), 1);
    w.quaternion.setFromUnitVectors(tmp.up, bpt.clone().sub(a).normalize());
    const flick = 0.6 + Math.random() * 0.8;
    weldMat.color.set(OFFERINGS[i].color).multiplyScalar(3 * flick);
    if (clock.elapsedTime - tmp.last > 0.07) {
      tmp.last = clock.elapsedTime;
      emitSparks(modulePos[i], 5, OFFERINGS[i].color, 0.6);
    }
  });

  useFrame((_, dt) => {
    const r = ring.current;
    if (!r) return;
    const last = r.userData.last ?? rel(4);
    const idle = store.hoveredOffering === -1 ? 1 : 0.15;
    r.rotation.y += dt * (0.22 * idle + Math.abs(store.vel) * 2) + (rel(4) - last) * 1.4;
    r.userData.last = rel(4);
  });

  return (
    <>
    <Robot index={4} home={[-0.3, -2.1, 2.1]} enter={[-4.5, 0, 0]} accent={C.pink} act={act} />
    <mesh ref={weld} material={weldMat} visible={false}>
      <cylinderGeometry args={[0.012, 0.012, 1, 6, 1, true]} />
    </mesh>
    <group position={[0, 0.35, 0]}>
      <group rotation={[0.25, 0, 0]}>
        <group ref={ring}>
          {OFFERINGS.map((o, i) => {
            const a = (i / OFFERINGS.length) * Math.PI * 2;
            return (
              <group key={o.title} position={[Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05]}>
                <Module i={i} color={o.color} glow={glows[i]} />
              </group>
            );
          })}
        </group>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={ringGlow}>
          <torusGeometry args={[2.05, 0.012, 6, 128]} />
        </mesh>
        {tier > 0 && <SegRing index={4} radius={0.55} count={10} size={[0.26, 0.1, 0.1]} speed={0.8} seed={480} delay={0.2} rotation={[Math.PI / 2, 0, 0]} />}
        <mesh material={chrome}>
          <icosahedronGeometry args={[0.3, 1]} />
        </mesh>
      </group>
      <Callout index={4} position={[-1.5, 2.1, 0]} title="HOVER A SERVICE" text="The module cracks open, the robot welds it" color={C.violet} align="left" />
    </group>
    </>
  );
}

/* ───────────── 05 · Contact: an armoured portal ───────────── */
const HORIZON_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const HORIZON_FRAG = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform vec3 uA; uniform vec3 uB;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float s1 = sin(a * 6.0 + r * 14.0 - uTime * 3.0) * 0.5 + 0.5;
  float s2 = sin(a * 3.0 - r * 9.0 + uTime * 2.0) * 0.5 + 0.5;
  float ripple = sin(r * 30.0 - uTime * 6.0) * 0.5 + 0.5;
  vec3 col = mix(uA, uB, s1 * s2);
  float body = smoothstep(1.0, 0.0, r);
  float rim = smoothstep(0.7, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
  vec3 c = (col * (0.25 + s1 * 0.55 + ripple * 0.15) * body + uA * rim * 1.8) * uAmp;
  gl_FragColor = vec4(c, 1.0);
}
`;

export function ContactStation({ tier }: { tier: Tier }) {
  const sway = useSway(5, 0.3, 0.4);
  const glow = useGlow(C.cyan, 5, 3);
  const chevrons = useRef<THREE.Group>(null);
  const tunnel = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HORIZON_VERT,
        fragmentShader: HORIZON_FRAG,
        uniforms: { uTime: { value: 0 }, uAmp: { value: 0 }, uA: { value: new THREE.Color(C.cyan) }, uB: { value: new THREE.Color(C.violet) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const portal = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Mesh>(null);
  const cubeMat = useGlow(C.cyan, 5, 2.5);
  const rigRef = useRef<Rig | null>(null);
  const throwState = useMemo(() => ({ t0: -99, busy: false, from: new THREE.Vector3(), to: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), hit: false }), []);

  // Carries your brief as a glowing data cube. On submit: winds up and hurls it into the portal.
  const act: Act = useMemo(
    () => (rig, { t }) => {
      rigRef.current = rig;
      const p = rig.pose;
      const st = throwState;
      if (store.pulse > 0.8 && !st.busy) {
        st.busy = true;
        st.t0 = t;
        st.hit = false;
      }
      const k = t - st.t0;
      if (portal.current) portal.current.getWorldPosition(st.to);
      if (st.busy && k < 0.6) {
        p.lPitch = p.rPitch = -1.2 - k * 1.2;
        p.lYaw = p.rYaw = -0.2;
        p.gripL = p.gripR = 1;
        p.lean = -0.15;
        p.look = st.to;
      } else if (st.busy && k < 3) {
        p.lPitch = p.rPitch = -0.6;
        p.gripL = p.gripR = 0;
        p.bounce = k > 1.3 ? 0.6 : 0;
        p.eyes = 1.3;
        p.brows = 0.7;
        p.look = k < 1.4 ? st.to : null;
      } else {
        if (st.busy && k >= 3) st.busy = false;
        p.lPitch = p.rPitch = 0.25;
        p.lYaw = p.rYaw = -0.28;
        p.gripL = p.gripR = 0.8;
        p.brows = 0.15;
      }
    },
    [throwState],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const b = build(5);
    // Data cube: held between the claws, then thrown along an arc into the portal.
    const c = cube.current;
    const rig = rigRef.current;
    if (c && rig?.tipL && rig.tipR) {
      const st = throwState;
      const k = t - st.t0;
      const parent = c.parent!;
      rig.tipL.getWorldPosition(st.a);
      rig.tipR.getWorldPosition(st.b);
      const hands = parent.worldToLocal(st.a.add(st.b).multiplyScalar(0.5));
      c.rotation.x += 0.02;
      c.rotation.y += 0.03;
      if (!st.busy || k < 0.6) {
        c.position.copy(hands);
        c.scale.setScalar(Math.min(1, st.busy ? 1 : Math.max(0.001, (k - 3) * 3) || 1) * 0.17);
        st.from.copy(hands);
      } else if (k < 1.4) {
        const u = (k - 0.6) / 0.8;
        const target = parent.worldToLocal(st.b.copy(st.to));
        c.position.lerpVectors(st.from, target, u);
        c.position.y += Math.sin(u * Math.PI) * 1.2;
        c.scale.setScalar(0.17 * (1 - u * 0.8));
      } else {
        if (!st.hit) {
          st.hit = true;
          emitSparks(st.to, 40, C.cyan, 1.4);
          store.shake = Math.min(1, store.shake + 0.3);
        }
        c.scale.setScalar(0.001);
      }
    }
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAmp.value = Math.max(0, (b - 0.6) / 0.4) * (1.1 + store.pulse * 2.5);
    // Chevrons light up one by one, like a dial-in sequence.
    chevrons.current?.children.forEach((c, i, all) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const lit = b > 0.5 + (i / all.length) * 0.45;
      const blink = (t * 2 - i * 0.3) % 3 < 0.25 ? 2 : 1;
      m.color.set(C.amber).multiplyScalar(lit ? 3 * blink + store.pulse * 4 : 0.08);
    });
    tunnel.current.forEach((r, i) => {
      if (r) r.scale.setScalar(1 + Math.sin(t * 2 - i * 0.6) * 0.03 + store.pulse * 0.3);
    });
  });

  const segs = tier === 0 ? 12 : 18;
  return (
    <>
    <Robot index={5} home={[1.1, -2.05, 1.7]} enter={[-4.5, 0, 0.4]} faceYaw={-0.45} accent={C.cyan} act={act} />
    <mesh ref={cube} material={cubeMat}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
    <group ref={sway} position={[0, 0.3, 0]}>
      <group ref={portal} />
      <SegRing index={5} radius={1.9} count={segs} size={[0.64, 0.34, 0.36]} glow={glow} speed={0} seed={600} spark={C.cyan} />
      <SegRing index={5} radius={1.6} count={tier === 0 ? 18 : 36} size={[0.12, 0.2, 0.1]} speed={0.3} seed={700} delay={0.3} />
      <group ref={chevrons}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2 + Math.PI / 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0.2]} rotation={[0, 0, a - Math.PI / 2]}>
              <coneGeometry args={[0.12, 0.2, 3]} />
              <meshBasicMaterial toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      <mesh material={mat}>
        <circleGeometry args={[1.5, 64]} />
      </mesh>
      {Array.from({ length: tier === 0 ? 3 : 6 }, (_, i) => (
        <mesh key={i} ref={(m) => void (tunnel.current[i] = m)} position={[0, 0, -0.8 - i * 0.9]} material={glow}>
          <torusGeometry args={[1.45 - i * 0.14, 0.012, 6, 64]} />
        </mesh>
      ))}
      <Callout index={5} position={[0, 2.45, 0]} title="OPEN CHANNEL" text="Send the brief, the robot throws it through" color={C.cyan} />
    </group>
    </>
  );
}
