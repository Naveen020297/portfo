"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { READY_EVENT } from "@/lib/store";

const MIN_MS = 900;
const MARK = "G-FORCE";

/** Boot screen while the 3D scene compiles: wordmark, counter, hairline. Wipes upward on the first frames. */
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const p = { v: 0 };
    const draw = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${p.v})`;
      if (count.current) count.current.textContent = String(Math.round(p.v * 100)).padStart(3, "0");
    };
    const ctx = gsap.context(() => {
      gsap.to(p, { v: 0.86, duration: 2.4, ease: "power2.out", onUpdate: draw });
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - start)) / 1000;
      ctx.add(() => {
        gsap
          .timeline({ delay: wait, onComplete: () => setGone(true) })
          .to(p, { v: 1, duration: 0.45, ease: "power2.inOut", onUpdate: draw, overwrite: true })
          .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, "+=0.15");
      });
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
    <div
      ref={root}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-void px-8"
      style={{ clipPath: "inset(0 0 0% 0)" }}
      role="status"
      aria-label="Loading"
    >
      <div className="load-mark font-mono text-sm font-bold tracking-[0.6em] text-fg" aria-hidden>
        {MARK.split("").map((c, i) => (
          <span key={i} style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
            {c}
          </span>
        ))}
      </div>
      <div className="w-full max-w-xs">
        <div className="mb-3 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-faint">
          <span>Initialising scene</span>
          <span className="text-2xl font-light tabular-nums tracking-normal text-fg">
            <span ref={count}>000</span>
          </span>
        </div>
        <div className="h-px w-full bg-line">
          <div ref={bar} className="h-full origin-left bg-gradient-to-r from-cyanx via-violetx to-pinkx" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </div>
  );
}
