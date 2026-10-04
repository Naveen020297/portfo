"use client";

import { useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import ErrorBoundary from "@/components/ErrorBoundary";
import { detectTier } from "@/lib/tier";
import type { Kind } from "./objects";
import Showcase, { pointer } from "./Showcase";

type Slot = { kind: Kind; track: RefObject<HTMLElement> };

/** Neutral studio reflections, baked once and shared by every view. No HDR download. */
function useRoomEnv() {
  const gl = useThree((s) => s.gl);
  const [env, setEnv] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    setEnv(target.texture);
    return () => target.dispose();
  }, [gl]);
  return env;
}

function Views({ slots, still }: { slots: Slot[]; still: boolean }) {
  const env = useRoomEnv();
  // The views draw themselves into their own rectangles. Wiping the canvas first each frame means
  // a view that has just scrolled out of sight cannot leave its last frame behind.
  useFrame(({ gl }) => gl.clear());
  if (!env) return null;
  return (
    <>
      {slots.map((s, i) => (
        <View key={i} track={s.track}>
          <Showcase kind={s.kind} track={s.track} env={env} still={still} />
        </View>
      ))}
    </>
  );
}

/**
 * One transparent canvas pinned over the page. Every element under `root` marked with
 * `data-object` gets its 3D object drawn exactly on top of it, so the objects scroll with the layout.
 */
export default function Stage({ root }: { root: RefObject<HTMLElement | null> }) {
  const [tier] = useState(detectTier);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-object]") ?? [];
    setSlots(Array.from(els, (el) => ({ kind: el.dataset.object as Kind, track: { current: el } })));
  }, [root]);

  useEffect(() => {
    if (still || !window.matchMedia("(pointer: fine)").matches) return;
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, [still]);

  return (
    // Tall as the largest viewport, so a phone's collapsing address bar never resizes the canvas.
    <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-lvh" aria-hidden>
      <ErrorBoundary fallback={null}>
        <Canvas
          dpr={[1, tier === 2 ? 2 : 1.5]}
          gl={{ antialias: tier > 0, alpha: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping }}
          style={{ pointerEvents: "none" }}
        >
          <Views slots={slots} still={still} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
