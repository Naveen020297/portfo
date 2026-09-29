"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect, VignetteEffect } from "postprocessing";
import * as THREE from "three";
import { build, store, type Tier } from "@/lib/store";
import { useTheme } from "@/lib/theme";

/* ───────────── helpers ───────────── */

/** Deterministic 0..1 noise so plates scatter the same way on every render. */
export const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Overshoot then settle: the "clunk" of a plate locking in. */
export const backOut = (t: number, s = 1.6) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

/* ───────────── materials ───────────── */

let metals: { gun: THREE.MeshPhysicalMaterial; dark: THREE.MeshPhysicalMaterial; chrome: THREE.MeshPhysicalMaterial } | null = null;

/** Shared PBR metals. They only look right with the environment below reflecting in them. */
export function useMetals() {
  if (!metals) {
    metals = {
      gun: new THREE.MeshPhysicalMaterial({ color: "#4a5263", metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
      dark: new THREE.MeshPhysicalMaterial({ color: "#1b202b", metalness: 0.9, roughness: 0.42, clearcoat: 0.3 }),
      chrome: new THREE.MeshPhysicalMaterial({ color: "#d5dce8", metalness: 1, roughness: 0.14, clearcoat: 1 }),
    };
  }
  return metals;
}

/**
 * Energy-seam material that powers up as station `index` finishes assembling.
 * Warming up, it stutters irregularly like a tube striking, rather than strobing on a fixed beat.
 * On the light theme it settles at its true colour instead of blowing out to white.
 */
export function useGlow(color: string, index: number, boost = 3) {
  const { mat, base } = useMemo(() => {
    const base = new THREE.Color(color);
    return { base, mat: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }) };
  }, [color]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => {
    const b = build(index);
    const stutter = rnd(Math.floor(clock.elapsedTime * 13) + index * 17);
    const flicker = b > 0.35 && b < 0.97 ? (stutter > 0.35 ? 1 : 0.2 + stutter) : 1;
    const peak = THREE.MathUtils.lerp(boost, 1.05, store.light);
    mat.color.copy(base).multiplyScalar(0.05 + b ** 3 * peak * flicker + store.pulse * 2);
  });
  return mat;
}

/* ───────────── sparks ───────────── */

const MAX_SPARKS = 700;
const pool = {
  p: new Float32Array(MAX_SPARKS * 3),
  v: new Float32Array(MAX_SPARKS * 3),
  life: new Float32Array(MAX_SPARKS),
  max: new Float32Array(MAX_SPARKS).fill(1),
  c: new Float32Array(MAX_SPARKS * 3),
  head: 0,
  dirty: false,
};
const tmpC = new THREE.Color();
const white = new THREE.Color("#fff7d6");

/** Fire a burst of welding sparks at a world position. */
export function emitSparks(at: THREE.Vector3, count: number, color: string, power = 1) {
  const n = Math.round(count * (store.tier === 0 ? 0.3 : store.tier === 1 ? 0.6 : 1));
  // White-hot on dark; on light, a saturated ember that still reads against the pale sky.
  if (store.light > 0.5) tmpC.set(color).multiplyScalar(0.85);
  else tmpC.set(color).lerp(white, 0.5).multiplyScalar(5);
  for (let k = 0; k < n; k++) {
    const i = pool.head++ % MAX_SPARKS;
    pool.p.set([at.x, at.y, at.z], i * 3);
    const th = Math.random() * Math.PI * 2;
    const up = Math.random() * 0.9 + 0.1;
    const sp = (2 + Math.random() * 5) * power;
    pool.v.set([Math.cos(th) * sp * (1 - up * 0.5), up * sp, Math.sin(th) * sp * (1 - up * 0.5) + 1.5], i * 3);
    pool.max[i] = pool.life[i] = 0.3 + Math.random() * 0.6;
    pool.c.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
  }
  pool.dirty = true;
}

export function Sparks() {
  const light = useTheme() === "light";
  const ref = useRef<THREE.InstancedMesh>(null);
  const t = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), d: new THREE.Vector3(), z: new THREE.Vector3(0, 0, 1), c: new THREE.Color() }), []);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < MAX_SPARKS; i++) {
      m.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      m.setColorAt(i, t.c.set(0, 0, 0));
    }
  }, [t]);

  useFrame((_, rawDt) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (pool.life[i] <= 0) {
        if (pool.life[i] > -1) {
          pool.life[i] = -1;
          m.setMatrixAt(i, t.m.makeScale(0, 0, 0));
        }
        continue;
      }
      pool.life[i] -= dt;
      const o = i * 3;
      pool.v[o + 1] -= 9.8 * dt;
      const drag = 1 - 1.8 * dt;
      pool.v[o] *= drag;
      pool.v[o + 1] *= drag;
      pool.v[o + 2] *= drag;
      pool.p[o] += pool.v[o] * dt;
      pool.p[o + 1] += pool.v[o + 1] * dt;
      pool.p[o + 2] += pool.v[o + 2] * dt;
      t.d.set(pool.v[o], pool.v[o + 1], pool.v[o + 2]);
      const speed = t.d.length();
      t.q.setFromUnitVectors(t.z, t.d.divideScalar(speed || 1));
      const f = Math.max(0, pool.life[i] / pool.max[i]);
      t.s.set(f, f, (0.2 + speed * 0.05) * f);
      m.setMatrixAt(i, t.m.compose(t.p.set(pool.p[o], pool.p[o + 1], pool.p[o + 2]), t.q, t.s));
      if (pool.dirty) m.setColorAt(i, t.c.setRGB(pool.c[o], pool.c[o + 1], pool.c[o + 2]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (pool.dirty && m.instanceColor) m.instanceColor.needsUpdate = true;
    pool.dirty = false;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_SPARKS]} frustumCulled={false}>
      <boxGeometry args={[0.018, 0.018, 0.22]} />
      <meshBasicMaterial toneMapped={false} blending={light ? THREE.NormalBlending : THREE.AdditiveBlending} depthWrite={false} transparent />
    </instancedMesh>
  );
}

/* ───────────── armour plate ───────────── */

type V3 = [number, number, number];

/**
 * One piece of armour. Sits scattered and tumbling in space, then flies home and
 * locks (with overshoot, sparks and camera shake) as station `index` assembles.
 */
export function Plate({
  index,
  seed,
  delay = 0,
  spread = 4,
  from,
  spin = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  spark,
  children,
}: {
  index: number;
  seed: number;
  delay?: number;
  spread?: number;
  /** Fixed approach vector (e.g. a drawer sliding in). Random when omitted. */
  from?: V3;
  spin?: number;
  position?: V3;
  rotation?: V3;
  /** Spark colour on lock; no sparks when omitted. */
  spark?: string;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const key = `${position}|${rotation}|${from}`;
  const d = useMemo(() => {
    const off = from
      ? new THREE.Vector3(...from)
      : new THREE.Vector3(rnd(seed) - 0.5, rnd(seed + 1) - 0.5, rnd(seed + 2) * 0.7 + 0.15).normalize().multiplyScalar(spread * (0.6 + rnd(seed + 3) * 0.8));
    return {
      home: new THREE.Vector3(...position),
      rot: new THREE.Euler(...rotation),
      off,
      tumble: new THREE.Vector3(rnd(seed + 4) - 0.5, rnd(seed + 5) - 0.5, rnd(seed + 6) - 0.5).multiplyScalar(7 * spin),
      prev: -1,
      wp: new THREE.Vector3(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, seed, spread, spin]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = clamp01((build(index) - delay) / 0.4);
    const k = 1 - (t >= 1 ? 1 : backOut(t));
    g.visible = t > 0.001;
    g.position.copy(d.home).addScaledVector(d.off, k);
    g.rotation.set(d.rot.x + d.tumble.x * k, d.rot.y + d.tumble.y * k, d.rot.z + d.tumble.z * k);
    g.scale.setScalar(Math.min(1, t * 3));
    if (spark && d.prev >= 0 && d.prev < 1 && t >= 1) {
      g.getWorldPosition(d.wp);
      emitSparks(d.wp, 12, spark);
      store.shake = Math.min(1, store.shake + 0.06);
    }
    d.prev = t;
  });

  return <group ref={ref}>{children}</group>;
}

/* ───────────── lighting + post ───────────── */

/**
 * Studio lighting baked once into a cube map: gives the metal real reflections, no HDR download.
 * Light theme re-bakes it inside a bright cyclorama so the metal picks up a daylight sheen.
 */
export function StudioEnv() {
  const light = useTheme() === "light";
  return (
    <Environment key={light ? "light" : "dark"} resolution={128} frames={1}>
      {light && <color attach="background" args={["#2a303b"]} />}
      <Lightformer form="rect" intensity={2.5} position={[0, 5, 6]} scale={[14, 4, 1]} />
      <Lightformer form="rect" intensity={5} color="#22d3ee" position={[-9, 1, 0]} rotation-y={Math.PI / 2} scale={[24, 1.2, 1]} />
      <Lightformer form="rect" intensity={5} color="#8b5cf6" position={[9, -1, 0]} rotation-y={-Math.PI / 2} scale={[24, 1.2, 1]} />
      <Lightformer form="ring" intensity={3} color="#f472b6" position={[0, 7, -6]} scale={5} />
      <Lightformer form="rect" intensity={1.2} color="#fbbf24" position={[0, -6, 2]} rotation-x={-Math.PI / 2} scale={[20, 2, 1]} />
    </Environment>
  );
}

/**
 * Bloom (energy glow), velocity-driven chromatic aberration and a lens vignette. Off on low tier.
 * A pale sky sits right at the bloom threshold, so the light theme lifts it and softens the vignette.
 */
export function Effects({ tier }: { tier: Tier }) {
  const offset = useMemo(() => new THREE.Vector2(0.0005, 0.0003), []);
  const bloom = useRef<BloomEffect>(null);
  const vignette = useRef<VignetteEffect>(null);
  useFrame(() => {
    const k = 0.0004 + Math.abs(store.vel) * 0.0045 + store.pulse * 0.006 + store.shake * 0.008;
    offset.set(k, k * 0.6);
    const l = store.light;
    if (bloom.current) {
      bloom.current.intensity = THREE.MathUtils.lerp(1.1, 0.35, l);
      bloom.current.luminanceMaterial.threshold = THREE.MathUtils.lerp(0.9, 1.15, l);
    }
    if (vignette.current) vignette.current.darkness = THREE.MathUtils.lerp(0.7, 0.12, l);
  });
  if (tier === 0) return null;
  return (
    <EffectComposer multisampling={tier === 2 ? 4 : 0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={1.1} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.72} />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} />
      <Vignette ref={vignette} darkness={0.7} offset={0.22} />
    </EffectComposer>
  );
}
