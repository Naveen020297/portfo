"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Gauge } from "lucide-react";
import { STATIONS } from "@/lib/content";
import { STATION_COUNT, store } from "@/lib/store";

const TIER_LABEL = ["LOW", "BALANCED", "FULL"];

/** Cockpit overlay. Numbers update by direct DOM writes each frame, never through React state. */
export default function Hud() {
  const bar = useRef<HTMLDivElement>(null);
  const fps = useRef<HTMLSpanElement>(null);
  const g = useRef<HTMLSpanElement>(null);
  const tier = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    let lastActive = 0;
    let lastText = 0;
    const tick = (t: number) => {
      if (bar.current) bar.current.style.transform = `scaleX(${store.smooth})`;
      if (store.active !== lastActive) {
        lastActive = store.active;
        setActive(lastActive);
      }
      if (t - lastText > 250) {
        lastText = t;
        if (fps.current) fps.current.textContent = String(Math.round(store.fps));
        if (g.current) g.current.textContent = (1 + Math.abs(store.vel) * 7).toFixed(1);
        if (tier.current) tier.current.textContent = TIER_LABEL[store.tier];
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (i: number) => document.getElementById(`s-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="pointer-events-none fixed inset-0 z-30 font-mono text-[11px] uppercase tracking-widest text-slate-400">
      <header className="pointer-events-auto flex items-center justify-between px-5 py-4 md:px-10">
        <button onClick={() => go(0)} className="flex items-center gap-2 text-sm font-bold tracking-[0.3em] text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-cyanx shadow-[0_0_12px_#22d3ee]" />
          G-FORCE
        </button>
        <button onClick={() => go(STATION_COUNT - 1)} className="rounded border border-cyanx/50 px-3 py-1.5 text-cyanx transition hover:bg-cyanx hover:text-black">
          Start a project
        </button>
      </header>

      {/* Station rail */}
      <nav className="pointer-events-auto absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex" aria-label="Stations">
        {STATIONS.map((s, i) => (
          <button key={s.id} onClick={() => go(i)} className="group flex items-center gap-3" aria-label={s.label} aria-current={active === i}>
            <span className={`transition ${active === i ? "text-white opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{s.label}</span>
            <span className={`h-2 rounded-full transition-all ${active === i ? "w-6 bg-cyanx shadow-[0_0_10px_#22d3ee]" : "w-2 bg-slate-600 group-hover:bg-slate-300"}`} />
          </button>
        ))}
      </nav>

      <footer className="absolute inset-x-0 bottom-0 px-5 pb-4 md:px-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <div className="text-cyanx">
              Station {STATIONS[active].code}/{String(STATION_COUNT - 1).padStart(2, "0")}
            </div>
            <div className="text-white">{STATIONS[active].label}</div>
          </div>
          <div className="flex gap-5 text-right">
            <span className="flex items-center gap-1.5">
              <Gauge size={13} className="text-pinkx" />
              <span ref={g} className="text-white">1.0</span> G
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Activity size={13} className="text-greenx" />
              <span ref={fps} className="text-white">60</span> FPS
            </span>
            <span className="hidden sm:inline">
              GFX <span ref={tier} className="text-white">FULL</span>
            </span>
          </div>
        </div>
        <div className="h-[2px] w-full bg-slate-800">
          <div ref={bar} className="h-full origin-left bg-gradient-to-r from-cyanx via-violetx to-pinkx" style={{ transform: "scaleX(0)" }} />
        </div>
      </footer>
    </div>
  );
}
