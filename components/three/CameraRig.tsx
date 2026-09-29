"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STATION_COUNT, STATION_SPACING, store } from "@/lib/store";

/** Flies the camera along a spline through every station, driven by smoothed scroll. */
export default function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const { pos, look, p, l } = useMemo(() => {
    const posPts: THREE.Vector3[] = [];
    const lookPts: THREE.Vector3[] = [];
    for (let i = 0; i < STATION_COUNT; i++) {
      const z = -STATION_SPACING * i;
      const dir = i % 2 === 0 ? 1 : -1;
      posPts.push(new THREE.Vector3(-dir * 0.9, 0.3, z + 8.5));
      lookPts.push(new THREE.Vector3(0, 0, z));
    }
    return {
      pos: new THREE.CatmullRomCurve3(posPts, false, "catmullrom", 0.5),
      look: new THREE.CatmullRomCurve3(lookPts, false, "catmullrom", 0.5),
      p: new THREE.Vector3(),
      l: new THREE.Vector3(),
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    // Velocity = how far the smoothed value lags the raw scroll. Feeds roll/FOV/spin.
    const target = THREE.MathUtils.clamp((store.progress - store.smooth) * (STATION_COUNT - 1) * 1.5, -1, 1);
    store.vel = THREE.MathUtils.damp(store.vel, target, 3, dt);
    store.pulse = THREE.MathUtils.damp(store.pulse, 0, 1.6, dt);
    store.shake = THREE.MathUtils.damp(store.shake, 0, 7, dt);

    const u = THREE.MathUtils.clamp(store.smooth, 0, 1);
    pos.getPoint(u, p);
    look.getPoint(u, l);

    // Fly-by swoop between stations, plus pointer parallax.
    const f = u * (STATION_COUNT - 1);
    p.y += Math.sin((f - Math.floor(f)) * Math.PI) * 0.9;
    p.x += store.mouse.x * 0.5;
    p.y += store.mouse.y * 0.3;

    // Handheld drift: slow, incommensurate sines so the frame breathes but never loops visibly.
    p.x += Math.sin(t * 0.31) * 0.05 + Math.sin(t * 0.57 + 1.7) * 0.025;
    p.y += Math.sin(t * 0.23 + 0.6) * 0.04 + Math.sin(t * 0.71) * 0.015;

    // Impact shake when armour locks into place: a fast, smooth judder that decays (not per-frame noise).
    const k = store.shake * 0.05;
    p.x += (Math.sin(t * 41.3) + Math.sin(t * 27.1 + 2.1) * 0.6) * k;
    p.y += (Math.sin(t * 37.7 + 0.9) + Math.sin(t * 23.9) * 0.6) * k;

    camera.position.copy(p);
    camera.lookAt(l);
    camera.rotateZ(-store.vel * 0.06 + store.mouse.x * -0.015 + Math.sin(t * 0.19) * 0.004 + Math.sin(t * 33.1) * store.shake * 0.006);

    const fov = 50 + Math.abs(store.vel) * 9 + store.pulse * 8;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
