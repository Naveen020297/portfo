"use client";

import { Component, type ReactNode } from "react";
import { READY_EVENT } from "@/lib/store";

/** If WebGL is unavailable or the scene throws, fall back to a static backdrop and unblock the loader. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[G-Force] 3D scene failed, using static fallback", error);
    window.dispatchEvent(new Event(READY_EVENT));
  }

  render() {
    if (this.state.failed) {
      return <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_30%_20%,#1e1b4b,#05060a_60%)]" aria-hidden />;
    }
    return this.props.children;
  }
}
