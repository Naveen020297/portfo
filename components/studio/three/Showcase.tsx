"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { OBJECTS, ShotCtx, type Kind, type Shot } from "./objects";

// A long lens from slightly above, like a product photo.
const CAM: [number, number, number] = [0, 1.8, 9];
const FOV = 28;
const VISIBLE_H = 2 * Math.hypot(...CAM) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
/** Share of the view the object may fill; the rest is breathing room for parts in flight. */
const FILL = 0.84;

/** Pointer position, -1..1 across the window. Written by Stage, read by every rig. */
export const pointer = { x: 0, y: 0 };

const damp = THREE.MathUtils.damp;

/**
 * One object in its own view: camera, studio light and the rig that fits it to the box it tracks.
 * The object assembles as its card scrolls up to the middle of the screen and stays whole after that.
 * A pinned object (the hero) assembles over the whole stretch of page its box stays pinned for.
 */
export default function Showcase({ kind, track, env, still }: { kind: Kind; track: RefObject<HTMLElement>; env: THREE.Texture; still: boolean }) {
  const o = OBJECTS[kind];
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environment = env;
  }, [scene, env]);

  const shot = useMemo<Shot>(() => ({ asm: still ? 1 : 0, aspect: 1, still }), [still]);
  const fit = useRef<THREE.Group>(null);
  const turn = useRef<THREE.Group>(null);

  useFrame(({ camera, clock }, rawDt) => {
    const el = track.current;
    const f = fit.current;
    const g = turn.current;
    if (!el || !f || !g) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (!r.height) return;

    shot.aspect = (camera as THREE.PerspectiveCamera).aspect;
    // A pinned box starts partly below the fold. Its scene fits and centres itself in the part
    // that is on screen, so nothing is cut off before the box is fully in view.
    let room = 1;
    if (o.pin) {
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, vh);
      room = Math.max(0.2, (bottom - top) / r.height);
      f.position.y = (((r.top + r.bottom) / 2 - (top + bottom) / 2) / r.height) * VISIBLE_H;
    }
    f.scale.setScalar(Math.min((VISIBLE_H * shot.aspect * FILL) / o.extent[0], (VISIBLE_H * room * FILL) / o.extent[1]));
    if (still) {
      g.rotation.y = o.yaw;
      return;
    }

    const dt = Math.min(rawDt, 0.05);
    let target: number;
    if (o.pin && el.parentElement) {
      // The box is sticky inside a taller track. Progress runs from the top of the page to just
      // before the track lets the box go.
      const tr = el.parentElement.getBoundingClientRect();
      const pinnedAt = parseFloat(getComputedStyle(el).top) || 0;
      const scroll = tr.top + window.scrollY - pinnedAt + tr.height - r.height;
      target = THREE.MathUtils.clamp(window.scrollY / (scroll * 0.9), 0, 1);
    } else {
      // How far the box's centre still is below the middle of the screen, in screen heights.
      const below = (r.top + r.height / 2 - vh / 2) / vh;
      target = 1 - THREE.MathUtils.smoothstep(below, 0.08, 0.6);
    }
    shot.asm = damp(shot.asm, target, 6, dt);
    if (shot.asm > 0.999) shot.asm = 1;

    // Turns in as it assembles, then sways a little and leans toward the pointer.
    const yaw = o.yaw + (1 - shot.asm) * -0.8 * Math.sign(o.yaw) + Math.sin(clock.elapsedTime * 0.35) * 0.1 + pointer.x * 0.18;
    g.rotation.y = damp(g.rotation.y, yaw, 5, dt);
    g.rotation.x = damp(g.rotation.x, -pointer.y * 0.06, 5, dt);
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={FOV} near={1} far={40} position={CAM} rotation={[-Math.atan2(CAM[1], CAM[2]), 0, 0]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 6]} intensity={1.4} />
      <ShotCtx.Provider value={shot}>
        <group ref={fit}>
          <group ref={turn} rotation={[0, o.yaw, 0]}>
            <o.C />
          </group>
        </group>
      </ShotCtx.Provider>
    </>
  );
}
