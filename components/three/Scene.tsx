"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { READY_EVENT, STATION_COUNT, STATION_SPACING, store, type Tier } from "@/lib/store";
import CameraRig from "./CameraRig";
import { Effects, Sparks, StudioEnv } from "./fx";
import { Anchor } from "./parts";
import { BackendStation, BuildStation, ContactStation, HeroCore, InfraStation, OfferStation } from "./stations";

const STAR_COUNT: Record<Tier, number> = { 0: 1200, 1: 4000, 2: 9000 };
const DEPTH = STATION_SPACING * (STATION_COUNT - 1);

/** Star tunnel along the flight path. Stretches with scroll velocity. */
function Starfield({ tier }: { tier: Tier }) {
  const mat = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => {
    const n = STAR_COUNT[tier];
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.random() - 0.5) * 60;
      a[i * 3 + 1] = (Math.random() - 0.5) * 34;
      a[i * 3 + 2] = 14 - Math.random() * (DEPTH + 40);
    }
    return a;
  }, [tier]);

  useFrame(() => {
    if (mat.current) mat.current.size = 0.045 + Math.abs(store.vel) * 0.09 + store.pulse * 0.08;
  });

  return (
    <points key={tier}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={0.045} color="#a5f3fc" transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Infinite floor grid that follows the camera path; sells the sense of speed. */
function Floor() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.z = -store.smooth * DEPTH;
  });
  return (
    <group ref={ref} position={[0, -3.2, 0]}>
      <Grid args={[80, 80]} cellSize={1} cellThickness={0.6} cellColor="#164e63" sectionSize={8} sectionThickness={1.1} sectionColor="#7c3aed" fadeDistance={45} fadeStrength={1.6} infiniteGrid />
    </group>
  );
}

/** FPS probe + one-shot "ready" signal for the loader. */
function Probe() {
  const frames = useRef(0);
  useFrame((_, dt) => {
    if (dt > 0) store.fps = store.fps * 0.94 + (1 / dt) * 0.06;
    if (++frames.current === 3) window.dispatchEvent(new Event(READY_EVENT));
    // Boot sequence: armour assembles over ~2.4s once the first frames are on screen.
    if (frames.current > 3) store.intro = Math.min(1, store.intro + dt / 2.4);
  });
  useEffect(() => {
    frames.current = 0;
  }, []);
  return null;
}

export default function Scene({ tier }: { tier: Tier }) {
  store.tier = tier;
  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 14, 48]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <StudioEnv />
      <Sparks />
      <CameraRig />
      <Probe />
      <Starfield tier={tier} />
      {tier > 0 && <Floor />}

      <Anchor index={0} accent="#22d3ee">
        <HeroCore tier={tier} />
      </Anchor>
      <Anchor index={1} accent="#8b5cf6">
        <BuildStation tier={tier} />
      </Anchor>
      <Anchor index={2} accent="#34d399">
        <BackendStation tier={tier} />
      </Anchor>
      <Anchor index={3} accent="#fbbf24">
        <InfraStation tier={tier} />
      </Anchor>
      <Anchor index={4} accent="#f472b6">
        <OfferStation tier={tier} />
      </Anchor>
      <Anchor index={5} accent="#22d3ee">
        <ContactStation tier={tier} />
      </Anchor>

      <Effects tier={tier} />
    </>
  );
}
