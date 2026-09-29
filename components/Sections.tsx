"use client";

import { motion } from "framer-motion";
import { ArrowDown, Bell, Boxes, Database, Globe, KeyRound, Layers, Radar, Server, Smartphone, Zap } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { OFFERINGS } from "@/lib/content";
import { store } from "@/lib/store";
import ContactTerminal from "./ContactTerminal";

type Icon = ComponentType<{ size?: number; className?: string }>;

const reveal = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.3 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

/** One full-height station. Even = text left / object right; odd = mirrored. */
function Station({ i, accent, children }: { i: number; accent: string; children: ReactNode }) {
  return (
    <section id={`s-${i}`} className="relative flex min-h-[100svh] items-center px-5 py-24 md:px-16 lg:px-24" style={{ ["--accent" as string]: accent }}>
      <div className={`w-full max-w-xl ${i % 2 ? "md:ml-auto" : ""} max-md:mt-[38svh]`}>{children}</div>
    </section>
  );
}

function Feature({ icon: I, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <I size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <p className="text-sm leading-relaxed text-slate-400">{body}</p>
      </div>
    </li>
  );
}

function Track({ code, title, lead, items }: { code: string; title: string; lead: string; items: { icon: Icon; title: string; body: string }[] }) {
  return (
    <motion.div {...reveal} className="hud-card p-6 md:p-8">
      <div className="eyebrow">{code} · What we have built</div>
      <h2 className="mt-2 text-3xl font-bold leading-tight text-white md:text-4xl">{title}</h2>
      <p className="mt-3 text-slate-300">{lead}</p>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <Feature key={it.title} {...it} />
        ))}
      </ul>
    </motion.div>
  );
}

export default function Sections() {
  return (
    <div className="relative z-10">
      <Station i={0} accent="#22d3ee">
        <motion.div {...reveal}>
          <div className="eyebrow">Web · Mobile · Backend · Cloud</div>
          <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
            Engineered
            <br />
            under <span className="bg-gradient-to-r from-cyanx via-violetx to-pinkx bg-clip-text text-transparent">G-Force.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-slate-300">
            Full-stack web and mobile products, multi-tenant backends and production infrastructure. Scroll to fly through what we have built and what we can build for you.
          </p>
          <div className="mt-8 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-slate-400">
            <ArrowDown size={16} className="animate-bounce text-cyanx" /> Scroll to launch
          </div>
        </motion.div>
      </Station>

      <Station i={1} accent="#8b5cf6">
        <Track
          code="A"
          title="Frontend & mobile platforms"
          lead="Interfaces that load in under a second and feel native on every screen."
          items={[
            { icon: Globe, title: "Web frameworks", body: "Production builds on Next.js, React, Angular and fast-bundling Vite apps." },
            { icon: Smartphone, title: "React Native mobile", body: "One UI codebase for iOS and Android, state synchronisation and native device APIs." },
            { icon: Zap, title: "Delivery standards", body: "Sub-second page loads, seamless navigation and modular component design." },
          ]}
        />
      </Station>

      <Station i={2} accent="#34d399">
        <Track
          code="B"
          title="Enterprise backend & systems design"
          lead="Architecture that isolates tenants, guards every action and pushes events in real time."
          items={[
            { icon: Boxes, title: "Multi-tenant architecture", body: "Separate schemas vs shared pools, dynamic routing and tenant-context middleware." },
            { icon: KeyRound, title: "Role-based access control", body: "Hierarchical permissions, role inheritance, granular scopes and secure sessions." },
            { icon: Bell, title: "Notification engines", body: "WebSockets, Server-Sent Events and background push queues." },
            { icon: Layers, title: "Migrations & batch workflows", body: "Scheduled workers, idempotent jobs and zero-downtime schema upgrades." },
          ]}
        />
      </Station>

      <Station i={3} accent="#fbbf24">
        <Track
          code="C · D"
          title="Databases, traffic & observability"
          lead="Fast reads, safe writes, and a clear view of production at all times."
          items={[
            { icon: Database, title: "MySQL", body: "Complex relational queries, execution plans, indexing strategy and connection pooling." },
            { icon: Database, title: "MongoDB & Redis", body: "Document stores and key-value caches for fast reads, sessions and caching layers." },
            { icon: Server, title: "Traffic management", body: "Layer 4 and Layer 7 load balancers, reverse proxy routing and SSL termination." },
            { icon: Radar, title: "Observability", body: "Structured log aggregation, alert dashboards and Datadog APM tracking." },
          ]}
        />
      </Station>

      <Station i={4} accent="#f472b6">
        <motion.div {...reveal}>
          <div className="eyebrow">What we can build for you</div>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Full-lifecycle software services</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {OFFERINGS.map((o, i) => (
              <div
                key={o.title}
                onPointerEnter={() => void (store.hoveredOffering = i)}
                onPointerLeave={() => void (store.hoveredOffering === i && (store.hoveredOffering = -1))}
                className="hud-card cursor-default p-4 transition hover:-translate-y-1 hover:bg-white/5"
                style={{ ["--accent" as string]: o.color }}
              >
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: o.color }}>
                  {o.tag}
                </div>
                <div className="mt-1 font-semibold text-white">{o.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{o.body}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </Station>

      <Station i={5} accent="#22d3ee">
        <motion.div {...reveal}>
          <div className="eyebrow mb-3">Open channel</div>
          <ContactTerminal />
        </motion.div>
      </Station>
    </div>
  );
}
