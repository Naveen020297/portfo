import type { Tier } from "./store";

/** Picks the starting quality tier from the device's cores, memory, pointer type and motion preference. */
export function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || cores <= 2 || mem <= 2) return 0;
  if (coarse || cores <= 4 || mem <= 4) return 1;
  return 2;
}
