"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Telemetry from "../Telemetry";
import Nav from "./Nav";
import Sections from "./Sections";

// WebGL only exists in the browser. The page itself is server-rendered and complete without it.
const Stage = dynamic(() => import("./three/Stage"), { ssr: false });

/** The light lineup page (SITE_THEME "studio"). */
export default function StudioShell() {
  const main = useRef<HTMLElement>(null);
  return (
    <>
      <Nav />
      <main ref={main} className="relative">
        <Sections />
        <Stage root={main} />
      </main>
      <Telemetry />
    </>
  );
}
