// Shared mutable state. GSAP writes it, R3F's useFrame and the HUD read it.
// Deliberately NOT React state: scroll/mouse must never trigger re-renders.

export type Tier = 0 | 1 | 2; // 0 = low power, 1 = balanced, 2 = full

export const STATION_COUNT = 6;
export const STATION_SPACING = 16;

export const store = {
  progress: 0, // raw scroll progress 0..1 (station-aligned)
  smooth: 0, // GSAP-smoothed progress, drives the camera
  vel: 0, // signed scroll velocity, roughly -1..1
  active: 0, // nearest station index
  mouse: { x: 0, y: 0 }, // -1..1, GSAP-smoothed
  hoveredOffering: -1,
  pulse: 0, // 0..1 flash, decays (fired on form success)
  intro: 0, // 0..1 boot-up sequence after the first frames
  shake: 0, // 0..1 camera shake, bumped when armour plates lock
  fps: 60,
  tier: 2 as Tier,
};

/** Station-space position: 0 at hero, STATION_COUNT-1 at contact. */
export const stationPos = () => store.smooth * (STATION_COUNT - 1);

/** 1 when camera is exactly at station i, fading to 0 one station away. */
export const activity = (i: number) => Math.max(0, 1 - Math.abs(stationPos() - i));

/** Signed distance from station i, in stations. Negative = approaching. */
export const rel = (i: number) => stationPos() - i;

/** 0..1 assembly state of station i: armour flies in as you arrive, flies apart as you leave. */
export const build = (i: number) => {
  const a = Math.max(0, 1 - Math.abs(store.smooth * (STATION_COUNT - 1) - i));
  const t = Math.min(1, Math.max(0, (a - 0.12) / 0.68));
  return Math.min(store.intro, t * t * (3 - 2 * t));
};

export const READY_EVENT = "gforce:ready";

/** Fixed overlay that every drei <Html> mounts into. Without it, Html lands in <body> in document
 * coordinates (the canvas takes events from body) and drifts away by the scroll offset. */
export const htmlLayer: { current: HTMLElement } = { current: null as unknown as HTMLElement };
