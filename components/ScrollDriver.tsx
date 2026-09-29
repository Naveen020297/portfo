"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STATION_COUNT, store } from "@/lib/store";

/**
 * Bridges DOM scroll + pointer into the shared store. GSAP owns the smoothing
 * (quickTo), R3F only reads. Renders nothing; everything is torn down on unmount.
 */
export default function ScrollDriver() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const setSmooth = gsap.quickTo(store, "smooth", { duration: 1.3, ease: "power3.out" });
    const setMx = gsap.quickTo(store.mouse, "x", { duration: 0.9, ease: "power2.out" });
    const setMy = gsap.quickTo(store.mouse, "y", { duration: 0.9, ease: "power2.out" });

    let centers: number[] = [];

    // Section centres in document space. Progress is interpolated between them, so
    // stations stay aligned with their text even when sections differ in height.
    const measure = () => {
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      centers = Array.from({ length: STATION_COUNT }, (_, i) => {
        const el = document.getElementById(`s-${i}`);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
      });
      centers[0] = Math.max(centers[0], vh / 2);
      centers[STATION_COUNT - 1] = Math.min(centers[STATION_COUNT - 1], docH - vh / 2);
    };

    const compute = () => {
      if (!centers.length) return;
      const y = window.scrollY + window.innerHeight / 2;
      let f = STATION_COUNT - 1;
      if (y <= centers[0]) f = 0;
      else {
        for (let i = 0; i < STATION_COUNT - 1; i++) {
          if (y < centers[i + 1]) {
            f = i + (y - centers[i]) / Math.max(1, centers[i + 1] - centers[i]);
            break;
          }
        }
      }
      store.progress = f / (STATION_COUNT - 1);
      store.active = Math.round(f);
      setSmooth(store.progress);
    };

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: compute,
      onRefresh: () => {
        measure();
        compute();
      },
    });

    const onPointer = (e: PointerEvent) => {
      setMx((e.clientX / window.innerWidth) * 2 - 1);
      setMy(-((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Late layout shifts (fonts, form validation messages) re-measure the sections.
    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(document.body);

    measure();
    compute();
    store.smooth = store.progress; // no fly-in from 0 on reload mid-page

    return () => {
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      trigger.kill();
    };
  }, []);

  return null;
}
