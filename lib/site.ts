// Server-safe: imported by the root layout, so no hooks or browser APIs here.

export type SiteTheme = "studio" | "space";

/**
 * Which site renders. "studio" is the light lineup page; "space" is the original 3D fly-through.
 * Switch back with NEXT_PUBLIC_SITE_THEME=space (or change the default here).
 */
export const SITE_THEME: SiteTheme = process.env.NEXT_PUBLIC_SITE_THEME === "space" ? "space" : "studio";

/**
 * The hero's 3D scene (papers, gears, buildings and vehicles turning into a laptop as you scroll).
 * Hidden for now; set to true to bring it back. The scene itself lives in components/studio/three.
 */
export const HERO_SCENE = false;
