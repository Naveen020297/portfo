import { useSyncExternalStore } from "react";
import gsap from "gsap";
import { store } from "./store";
import { THEME_KEY } from "./themeBoot";

export type Theme = "dark" | "light";

/** Scene colours per theme. The 3D side blends between them with store.light (0 dark .. 1 light). */
export const SCENE = {
  dark: { bg: "#05060a", fog: "#05060a", ambient: 0.25, sun: 1.6, hemi: 0, cell: "#0f2733", section: "#233158", sky: ["#04050a", "#0a0e1c", "#05060a"], accentMix: 0.035 },
  light: { bg: "#f6f7f9", fog: "#f3f5f8", ambient: 0.55, sun: 2.2, hemi: 0.6, cell: "#cfd6e0", section: "#b3bdcc", sky: ["#e4ecf8", "#fbfcfd", "#eef1f5"], accentMix: 0.1, aurora: ["#d3f0f8", "#e6defc"] },
} as const;

const listeners = new Set<() => void>();
let current: Theme = "dark";

if (typeof document !== "undefined") {
  current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  store.light = current === "light" ? 1 : 0;

  // Follow the OS setting until the visitor picks a theme themselves.
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {}
    if (!saved) apply(e.matches ? "light" : "dark");
  });
}

/** Switch theme. `instant` skips the cross-fade (used under a view transition, which animates instead). */
function apply(t: Theme, instant = false) {
  if (t === current) return;
  current = t;
  const root = document.documentElement;
  const k = t === "light" ? 1 : 0;
  if (instant) {
    gsap.killTweensOf(store, "light");
    store.light = k;
  } else {
    // Colour transitions only while switching, so hovers elsewhere stay instant.
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 700);
    gsap.to(store, { light: k, duration: 0.6, ease: "sine.inOut", overwrite: true });
  }
  root.dataset.theme = t;
  root.style.colorScheme = t;
  listeners.forEach((l) => l());
}

const frames = (n: number) => new Promise<void>((r) => (n <= 0 ? r() : requestAnimationFrame(() => void frames(n - 1).then(r))));

type VTDocument = Document & { startViewTransition?: (cb: () => Promise<void>) => { ready: Promise<void> } };

/**
 * Pick a theme. Where the browser supports view transitions, the new theme is revealed as a circle
 * growing out of `from` (the toggle); otherwise, and under reduced motion, everything cross-fades.
 */
export function setTheme(t: Theme, from?: { x: number; y: number }) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
  const doc = document as VTDocument;
  if (!doc.startViewTransition || !from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply(t);

  const vt = doc.startViewTransition(async () => {
    apply(t, true);
    // Let React commit and the WebGL scene draw a frame in the new colours before the snapshot.
    await Promise.race([frames(3), new Promise((r) => setTimeout(r, 120))]);
  });
  const r = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
  vt.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${r}px at ${from.x}px ${from.y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Current theme. Server render (and hydration) always sees "dark"; the real value follows. */
export const useTheme = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => "dark" as Theme,
  );
