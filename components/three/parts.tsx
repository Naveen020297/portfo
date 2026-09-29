"use client";

import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { STATION_SPACING, activity, htmlLayer, rel } from "@/lib/store";

/** Places a station on the flight path. Objects sit to one side, text opposite; centred on mobile. */
export function Anchor({ index, accent, children }: { index: number; accent: string; children: ReactNode }) {
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const mobile = aspect < 0.95;
  const side = index % 2 === 0 ? 1 : -1;
  const x = mobile ? 0 : side * Math.min(3.6, 3.73 * aspect * 0.5);
  const y = mobile ? 1.9 : 0;
  const s = mobile ? 0.6 : 1;
  const ref = useRef<THREE.Group>(null);
  // Skip drawing stations more than ~1.5 stops away: they're behind fog or behind the camera.
  useFrame(() => {
    if (ref.current) ref.current.visible = Math.abs(rel(index)) < 1.5;
  });
  return (
    <group ref={ref} position={[x, y, -STATION_SPACING * index]} scale={s}>
      <pointLight position={[2, 3, 4]} intensity={60} distance={16} color={accent} />
      {children}
    </group>
  );
}

/** A DOM label pinned to a 3D point that fades in as its station becomes active. */
export function Callout({
  index,
  position,
  title,
  text,
  color,
  align = "right",
}: {
  index: number;
  position: [number, number, number];
  title: string;
  text: string;
  color: string;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const v = THREE.MathUtils.smoothstep(activity(index), 0.55, 0.9);
    el.style.opacity = String(v);
    // Set the whole transform here (it replaces the CSS one): centre vertically, and for
    // left-aligned callouts shift the box so it ends at the anchor instead of starting there.
    el.style.transform = `translate(${align === "left" ? "-100%" : "0"}, calc(-50% + ${(1 - v) * 10}px))`;
  });
  return (
    <Html portal={htmlLayer} position={position} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div ref={ref} className={`callout hidden md:flex ${align === "left" ? "callout-left" : ""}`} style={{ opacity: 0, ["--c" as string]: color }}>
        <span className="callout-dot" />
        <span className="callout-line" />
        <span className="callout-box">
          <b>{title}</b>
          <i>{text}</i>
        </span>
      </div>
    </Html>
  );
}

/** Glowing dots travelling from a source to several targets: events, requests, notifications. */
export function Packets({
  from,
  targets,
  color,
  speed = 0.5,
  size = 0.07,
}: {
  from: THREE.Vector3;
  targets: THREE.Vector3[];
  color: string;
  speed?: number;
  size?: number;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    targets.forEach((to, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = (t + i / targets.length) % 1;
      m.position.lerpVectors(from, to, k);
      m.scale.setScalar(Math.sin(k * Math.PI) + 0.05);
    });
  });
  return (
    <>
      {targets.map((_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[size, 10, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
