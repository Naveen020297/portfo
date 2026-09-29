"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { READY_EVENT } from "@/lib/store";

const MIN_MS = 900;

/** Skeleton HUD shown while the 3D scene compiles; fades out on the first rendered frames. */
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const ctx = gsap.context(() => {
      gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 0.85, duration: 2.2, ease: "power2.out" });
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - start));
      gsap.to(bar.current, { scaleX: 1, duration: 0.3, delay: wait / 1000 });
      gsap.to(root.current, { opacity: 0, duration: 0.6, delay: wait / 1000 + 0.25, onComplete: () => setGone(true) });
    };

    window.addEventListener(READY_EVENT, finish);
    const failsafe = window.setTimeout(finish, 8000);
    return () => {
      window.removeEventListener(READY_EVENT, finish);
      window.clearTimeout(failsafe);
      ctx.revert();
    };
  }, []);

  if (gone) return null;
  return (
    <div ref={root} className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-void px-8" role="status" aria-label="Loading">
      <div className="font-mono text-xs uppercase tracking-[0.4em] text-cyanx">G-FORCE · initialising</div>
      <div className="w-full max-w-md space-y-3">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton mt-6 h-24 w-full" />
      </div>
      <div className="h-[3px] w-full max-w-md overflow-hidden rounded bg-slate-800">
        <div ref={bar} className="h-full origin-left bg-gradient-to-r from-cyanx to-violetx" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
