"use client";

import dynamic from "next/dynamic";
import Hud from "./Hud";
import Loader from "./Loader";
import ScrollDriver from "./ScrollDriver";
import Sections from "./Sections";
import Telemetry from "./Telemetry";

// WebGL only exists in the browser. The HTML content below is server-rendered, so it stays crawlable.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

export default function ClientShell() {
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
