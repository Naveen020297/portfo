"use client";

import dynamic from "next/dynamic";
import { SITE_THEME } from "@/lib/site";

// Each theme is its own chunk, so only the one picked in lib/site.ts is downloaded.
const SpaceShell = dynamic(() => import("./SpaceShell"));
const StudioShell = dynamic(() => import("./studio/StudioShell"));

export default function ClientShell() {
  return SITE_THEME === "space" ? <SpaceShell /> : <StudioShell />;
}
