"use client";

import dynamic from "next/dynamic";
import Hud from "./Hud";
import Loader from "./Loader";
import ScrollDriver from "./ScrollDriver";
import Sections from "./Sections";
import Telemetry from "./Telemetry";

// WebGL only exists in the browser. The HTML content below is server-rendered, so it stays crawlable.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

/** The original space fly-through (SITE_THEME "space"). */
export default function SpaceShell() {
  return (
    <main className="grain relative">
      <Experience />
      <ScrollDriver />
      <Telemetry />
      <Sections />
      <Hud />
      <Loader />
    </main>
  );
}
