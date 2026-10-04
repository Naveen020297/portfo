"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { htmlLayer, type Tier } from "@/lib/store";
import { detectTier } from "@/lib/tier";
import Scene from "./three/Scene";
import ErrorBoundary from "./ErrorBoundary";

export default function Experience() {
  // Starting quality tier; PerformanceMonitor refines it at runtime.
  const initial = useRef<Tier>(detectTier());
  const [tier, setTier] = useState<Tier>(initial.current);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <ErrorBoundary>
        <Canvas
          // Pointer events come from the page, not the canvas, so 3D hover works under the DOM overlay.
          eventSource={document.body}
          eventPrefix="client"
          dpr={[1, tier === 2 ? 2 : 1.25]}
          camera={{ fov: 50, near: 0.1, far: 120, position: [0, 0.3, 8.5] }}
          gl={{ antialias: initial.current > 0, powerPreference: "high-performance", alpha: false }}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setTier((t) => Math.max(0, t - 1) as Tier)}
            onIncline={() => setTier((t) => Math.min(initial.current, t + 1) as Tier)}
            onFallback={() => setTier(0)}
          >
            <Suspense fallback={null}>
              <Scene tier={tier} />
            </Suspense>
          </PerformanceMonitor>
        </Canvas>
      </ErrorBoundary>
      <div ref={(el) => void (el && (htmlLayer.current = el))} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
