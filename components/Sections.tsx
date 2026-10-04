"use client";

import { useEffect, useState, type ComponentType, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Bell, Boxes, Database, Globe, KeyRound, Layers, Mail, Phone, Radar, Server, Smartphone, Zap } from "lucide-react";
import { ENGAGEMENT, NEXT_STEPS, OFFERINGS, PROCESS, SHIP, STACK } from "@/lib/content";
import { SHOW_DIRECT_CONTACT } from "@/lib/site";
import { READY_EVENT, store } from "@/lib/store";
import ContactTerminal from "./ContactTerminal";

function WhatsAppIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.49 1.34 5L2 22l5.18-1.36a9.96 9.96 0 0 0 4.86 1.26h.01c5.52 0 10-4.48 10-10 0-5.52-4.48-10-10.01-10zm0 18.3c-1.5 0-2.98-.4-4.27-1.16l-.31-.18-3.17.83.85-3.09-.2-.32a8.27 8.27 0 0 1-1.27-4.38c0-4.57 3.73-8.3 8.32-8.3 4.59 0 8.32 3.73 8.32 8.3 0 4.58-3.73 8.3-8.32 8.3zm4.56-6.22c-.25-.13-1.48-.73-1.71-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.11-.23-.17-.48-.3z" />
    </svg>
  );
}

type Icon = ComponentType<{ size?: number; className?: string }>;

const EASE = [0.22, 1, 0.36, 1] as const;
const tone = (t: string) => `rgb(var(--${t}))`;

// Blocks rise out of a soft blur; children follow one after another.
const group: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE, staggerChildren: 0.07, delayChildren: 0.18 }, transitionEnd: { filter: "none" } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE }, transitionEnd: { filter: "none" } },
};
const inView = { initial: "hidden", whileInView: "show", viewport: { once: false, amount: 0.3 } } as const;

/** True once the 3D scene has drawn its first frames, i.e. when the loader starts to lift. */
function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (store.ready) return setReady(true);
    const on = () => setReady(true);
    window.addEventListener(READY_EVENT, on);
    const failsafe = window.setTimeout(on, 8000);
    return () => {
      window.removeEventListener(READY_EVENT, on);
      window.clearTimeout(failsafe);
    };
  }, []);
  return ready;
}

/** One full-height station. Even = text left / object right; odd = mirrored. */
function Station({ i, accent, children }: { i: number; accent: string; children: ReactNode }) {
  return (
    <section id={`s-${i}`} className="relative flex min-h-[100svh] items-center px-5 py-24 md:px-16 lg:px-24" style={{ ["--accent" as string]: tone(accent) }}>
      <div className={`w-full max-w-xl ${i % 2 ? "md:ml-auto" : ""} max-md:mt-[38svh]`}>{children}</div>
    </section>
  );
}

function Chips({ items, accent }: { items: readonly string[]; accent?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" style={accent ? { ["--accent" as string]: tone(accent) } : undefined}>
      {items.map((c) => (
        <span key={c} className="chip">
          {c}
        </span>
      ))}
    </div>
  );
}

function Feature({ icon: I, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <motion.li variants={item} className="flex gap-3">
      <I size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <div>
        <div className="text-sm font-semibold text-fg">{title}</div>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </motion.li>
  );
}

function Track({ code, title, lead, items, stack }: { code: string; title: string; lead: string; items: { icon: Icon; title: string; body: string }[]; stack: readonly string[] }) {
  return (
    <motion.div {...inView} variants={group} className="hud-card p-6 md:p-8">
      <motion.div variants={item} className="eyebrow">
        {code} · What we have built
      </motion.div>
      <motion.h2 variants={item} className="mt-2 text-3xl font-bold leading-tight text-fg md:text-4xl">
        {title}
      </motion.h2>
      <motion.p variants={item} className="mt-3 text-body">
        {lead}
      </motion.p>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <Feature key={it.title} {...it} />
        ))}
      </ul>
      <motion.div variants={item} className="mt-6 border-t border-line/70 pt-4">
        <Chips items={stack} />
      </motion.div>
    </motion.div>
  );
}

/** A headline line that slides up from behind a mask. */
function Line({ children, show, delay }: { children: ReactNode; show: boolean; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "105%", rotate: 2 }}
        animate={show ? { y: "0%", rotate: 0 } : undefined}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** "We ship ___": phrases cycle through a mask, one every few seconds. */
function Ship() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % SHIP.length), 2600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="ship">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={i}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="font-semibold text-fg"
        >
          {SHIP[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Hero() {
  const ready = useReady();
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: ready ? { opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } } : undefined,
    transition: { duration: 0.9, ease: EASE, delay },
  });
  return (
    <div>
      <motion.div {...fade(0.55)} className="eyebrow">
        Web · Mobile · Backend · Cloud
      </motion.div>
      <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tight text-fg md:text-7xl">
        <Line show={ready} delay={0.6}>
          Engineered
        </Line>
        <Line show={ready} delay={0.72}>
          under <span className="bg-gradient-to-r from-cyanx via-violetx to-pinkx bg-clip-text text-transparent">G-Force.</span>
        </Line>
      </h1>
      <motion.p {...fade(0.95)} className="mt-6 max-w-md text-lg text-body">
        Full-stack web and mobile products, multi-tenant backends and production infrastructure. Scroll to fly through what we have built and what we can build for you.
      </motion.p>
      <motion.p {...fade(1.05)} className="mt-4 text-lg text-muted">
        We ship <Ship />
      </motion.p>
      <motion.div {...fade(1.2)} className="mt-10 flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted">
        <span className="scroll-cue" aria-hidden />
        Scroll to launch
      </motion.div>
    </div>
  );
}

/** Pointer position inside the card, for the .spot radial highlight. */
const track = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

export default function Sections() {
  return (
    <div className="relative z-10">
      <Station i={0} accent="cyan">
        <Hero />
      </Station>

      <Station i={1} accent="violet">
        <Track
          code="A"
          title="Frontend & mobile platforms"
          lead="Interfaces that load in under a second and feel native on every screen."
          items={[
            { icon: Globe, title: "Web frameworks", body: "Production builds on Next.js, React, Angular and fast-bundling Vite apps." },
            { icon: Smartphone, title: "React Native mobile", body: "One UI codebase for iOS and Android, state synchronisation and native device APIs." },
            { icon: Zap, title: "Delivery standards", body: "Sub-second page loads, seamless navigation and modular component design." },
          ]}
          stack={["Next.js", "React", "Angular", "Vite", "React Native", "TypeScript"]}
        />
      </Station>

      <Station i={2} accent="green">
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
          stack={["Node.js", "WebSockets", "SSE", "RBAC", "Multi-tenant", "Queues & cron"]}
        />
      </Station>

      <Station i={3} accent="amber">
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
          stack={["MySQL", "MongoDB", "Redis", "Nginx", "L4 / L7", "Datadog"]}
        />
      </Station>

      <Station i={4} accent="pink">
        <motion.div {...inView} variants={group}>
          <motion.div variants={item} className="eyebrow">
            What we can build for you
          </motion.div>
          <motion.h2 variants={item} className="mt-2 text-3xl font-bold text-fg md:text-4xl">
            Full-lifecycle software services
          </motion.h2>
          <motion.p variants={item} className="mt-3 max-w-md text-body">
            One team from the first wireframe to the pager rotation. Hover a service to see it in 3D.
          </motion.p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {OFFERINGS.map((o, i) => (
              // Framer owns the wrapper's transform; the hover lift lives on the inner card.
              <motion.div key={o.title} variants={item}>
                <div
                  onPointerMove={track}
                  onPointerEnter={() => void (store.hoveredOffering = i)}
                  onPointerLeave={() => void (store.hoveredOffering === i && (store.hoveredOffering = -1))}
                  className="hud-card group h-full cursor-default p-4 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
                  style={{ ["--accent" as string]: tone(o.tone) }}
                >
                  <span className="spot" aria-hidden />
                  <div className="relative">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">{o.tag}</div>
                    <div className="mt-1 font-semibold text-fg">{o.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{o.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Station>

      <Station i={5} accent="cyan">
        <motion.div {...inView} variants={group}>
          <motion.div variants={item} className="eyebrow">
            05 · How we work
          </motion.div>
          <motion.h2 variants={item} className="mt-2 text-3xl font-bold leading-tight text-fg md:text-4xl">
            From brief to production
          </motion.h2>
          <motion.p variants={item} className="mt-3 max-w-md text-body">
            Four stages, four concrete deliverables, no drama. Hover a step and the robot presents it.
          </motion.p>
          <ol className="mt-4">
            {PROCESS.map((p, i) => (
              <motion.li
                key={p.n}
                variants={item}
                className="step"
                style={{ ["--c" as string]: tone(p.tone) }}
                onPointerEnter={() => void (store.hoveredStep = i)}
                onPointerLeave={() => void (store.hoveredStep === i && (store.hoveredStep = -1))}
              >
                <span className="step-n">{p.n}</span>
                <div>
                  <div className="font-semibold text-fg">{p.title}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{p.body}</p>
                  <div className="step-out">→ {p.out}</div>
                </div>
              </motion.li>
            ))}
          </ol>
          <motion.div variants={item} className="mt-4 grid gap-x-5 gap-y-2 border-t border-line/70 pt-4 sm:grid-cols-3">
            {ENGAGEMENT.map((e) => (
              <div key={e.title}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-cyanx">{e.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{e.body}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </Station>

      <Station i={6} accent="violet">
        <motion.div {...inView} variants={group}>
          <motion.div variants={item} className="eyebrow">
            06 · Toolbelt
          </motion.div>
          <motion.h2 variants={item} className="mt-2 text-3xl font-bold leading-tight text-fg md:text-4xl">
            Proven tools, chosen for the job
          </motion.h2>
          <motion.p variants={item} className="mt-3 max-w-md text-body">
            Boring where it should be boring, sharp where it matters. Hover a group to pick its ring out of the orbit.
          </motion.p>
          <div className="mt-6 space-y-3">
            {STACK.map((g, i) => (
              <motion.div key={g.title} variants={item}>
                <div
                  onPointerMove={track}
                  onPointerEnter={() => void (store.hoveredRing = i)}
                  onPointerLeave={() => void (store.hoveredRing === i && (store.hoveredRing = -1))}
                  className="hud-card group cursor-default p-4 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
                  style={{ ["--accent" as string]: tone(g.tone) }}
                >
                  <span className="spot" aria-hidden />
                  <div className="relative">
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      Ring {i + 1} · {g.title}
                    </div>
                    <Chips items={g.items} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Station>

      <Station i={7} accent="cyan">
        <motion.div {...inView} variants={group}>
          <motion.div variants={item} className="eyebrow mb-3">
            07 · Open channel
          </motion.div>
          <motion.div variants={item}>
            <ContactTerminal />
          </motion.div>
          <motion.ol variants={item} className="mt-4 grid gap-x-5 gap-y-2 sm:grid-cols-3">
            {NEXT_STEPS.map((n, i) => (
              <li key={n.title}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-cyanx">Then · {String(i + 1).padStart(2, "0")}</div>
                <div className="mt-0.5 text-sm font-semibold text-fg">{n.title}</div>
                <p className="text-xs leading-relaxed text-muted">{n.body}</p>
              </li>
            ))}
          </motion.ol>

          {/* Direct channels */}
          {SHOW_DIRECT_CONTACT && (
            <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/70 pt-4 font-mono text-xs">
              <a href="mailto:naveensuresh321@gmail.com" className="flex items-center gap-2 rounded border border-line bg-void/60 px-3 py-1.5 text-muted transition hover:border-cyanx hover:text-cyanx">
                <Mail size={13} className="text-cyanx" />
                <span>naveensuresh321@gmail.com</span>
              </a>
              <a href="https://wa.me/918904181356" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded border border-greenx/40 bg-greenx/10 px-3 py-1.5 text-greenx transition hover:bg-greenx/20">
                <WhatsAppIcon size={14} />
                <span>WhatsApp</span>
              </a>
              <a href="tel:+918904181356" className="flex items-center gap-2 rounded border border-line bg-void/60 px-3 py-1.5 text-muted transition hover:border-pinkx hover:text-pinkx">
                <Phone size={13} className="text-pinkx" />
                <span>+91-8904181356</span>
              </a>
            </motion.div>
          )}
        </motion.div>
      </Station>
    </div>
  );
}
