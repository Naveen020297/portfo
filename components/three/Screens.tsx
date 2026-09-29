"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { build, htmlLayer } from "@/lib/store";

type V3 = [number, number, number];
const PX_PER_UNIT = 40; // drei <Html transform> maps 40 CSS px to 1 world unit

/**
 * A live DOM "display" mounted in 3D. Powers on like a CRT once station `index`
 * has assembled.
 */
export function Screen({
  index,
  width,
  px,
  position,
  rotation,
  children,
}: {
  index: number;
  width: number;
  px: [number, number];
  position?: V3;
  rotation?: V3;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const on = Math.min(1, Math.max(0, (build(index) - 0.72) / 0.28));
    if (on <= 0.001) {
      if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";
    el.style.opacity = String(Math.min(1, on * 1.6));
    el.style.transform = on < 1 ? `scale(${0.6 + on * 0.4}, ${0.02 + on ** 2 * 0.98})` : "";
    el.style.filter = on < 1 ? `brightness(${1 + (1 - on) * 4})` : "";
  });
  return (
    <group position={position} rotation={rotation} scale={width / (px[0] / PX_PER_UNIT)}>
      <Html portal={htmlLayer} transform zIndexRange={[5, 0]} pointerEvents="none">
        <div ref={ref} className="scr" style={{ width: px[0], height: px[1], visibility: "hidden" }}>
          {children}
        </div>
      </Html>
    </group>
  );
}

/* ───────────── 01 · A live web page ───────────── */
export function WebScreen(p: { index: number; position: V3; rotation?: V3; width: number }) {
  return (
    <Screen {...p} px={[480, 300]}>
      <div className="chrome">
        <i />
        <i />
        <i />
        <span>https://yourproduct.app</span>
      </div>
      <div className="webpage">
        <nav>
          <b>◆ Acme</b>
          <span>Product</span>
          <span>Pricing</span>
          <em>Sign in</em>
        </nav>
        <div className="web-hero">
          <h4>
            Ship faster.
            <br />
            Scale further.<span className="caret" />
          </h4>
          <p>Next.js · React · Angular · Vite</p>
          <button>Get started</button>
        </div>
        <div className="web-cards">
          {["Dashboard", "Checkout", "Analytics"].map((t, i) => (
            <div key={t} style={{ animationDelay: `${1.1 + i * 1.3}s` }}>
              <u />
              {t}
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

export function PhoneScreen(p: { index: number; position: V3; rotation?: V3; width: number }) {
  return (
    <Screen {...p} px={[200, 400]}>
      <div className="phone">
        <div className="notch" />
        <div className="phone-head">
          <div className="phone-avatar" />
          <div>
            <b>Welcome back</b>
            <small>iOS + Android</small>
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="phone-row" style={{ animationDelay: `${i * 0.25}s` }}>
            <u />
            <span />
          </div>
        ))}
        <div className="phone-tabs">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </Screen>
  );
}
