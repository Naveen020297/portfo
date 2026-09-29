"use client";

import { useEffect } from "react";
import { datadogRum } from "@datadog/browser-rum";
import { store } from "@/lib/store";

/**
 * Datadog RUM (opt-in via env) plus a WebGL frame-drop watcher.
 * Without credentials it does nothing, so local dev stays quiet.
 */
export default function Telemetry() {
  useEffect(() => {
    const applicationId = process.env.NEXT_PUBLIC_DD_APP_ID;
    const clientToken = process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN;
    if (!applicationId || !clientToken) return;

    datadogRum.init({
      applicationId,
      clientToken,
      site: (process.env.NEXT_PUBLIC_DD_SITE ?? "datadoghq.com") as "datadoghq.com",
      service: "g-force-portfolio",
      env: process.env.NEXT_PUBLIC_DD_ENV ?? "production",
      sessionSampleRate: 100,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: "mask-user-input",
    });

    // Report a frame drop when the smoothed FPS stays under 30 for ~3s (once per quality tier).
    let low = 0;
    let last = performance.now();
    const reported = new Set<number>();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      if (store.fps < 30) low += elapsed;
      else low = 0;
      if (low > 3000 && !reported.has(store.tier)) {
        reported.add(store.tier);
        datadogRum.addAction("webgl_frame_drop", { fps: Math.round(store.fps), tier: store.tier });
      }
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
