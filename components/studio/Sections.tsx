"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { COMPARE, LINEUP, NEXT_STEPS, PROCESS, SHIP } from "@/lib/content";
import { HERO_SCENE } from "@/lib/site";
import ContactForm from "./ContactForm";

function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.49 1.34 5L2 22l5.18-1.36a9.96 9.96 0 0 0 4.86 1.26h.01c5.52 0 10-4.48 10-10 0-5.52-4.48-10-10.01-10zm0 18.3c-1.5 0-2.98-.4-4.27-1.16l-.31-.18-3.17.83.85-3.09-.2-.32a8.27 8.27 0 0 1-1.27-4.38c0-4.57 3.73-8.3 8.32-8.3 4.59 0 8.32 3.73 8.32 8.3 0 4.58-3.73 8.3-8.32 8.3zm4.56-6.22c-.25-.13-1.48-.73-1.71-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.11-.23-.17-.48-.3z" />
    </svg>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;
const tone = (t: string) => `rgb(var(--${t}))`;

// Blocks rise into place once; children follow one after another.
const group: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.25 } } as const;

/** Section heading: one large line and a short lead under it. */
function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <motion.header {...inView} variants={group} className="mx-auto max-w-6xl">
      <motion.h2 variants={item} className="text-4xl font-semibold tracking-tight text-fg md:text-6xl">
        {title}
      </motion.h2>
      <motion.p variants={item} className="mt-4 max-w-2xl text-lg text-muted md:text-xl">
        {lead}
      </motion.p>
    </motion.header>
  );
}

function More({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-0.5 text-link hover:underline">
      {children}
      <ChevronRight size={16} aria-hidden />
    </a>
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
    <span className="grid h-[1.5em] justify-items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="font-semibold text-fg [grid-area:1/1]"
        >
          {SHIP[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The box a 3D object is drawn over (see three/Stage.tsx). The soft highlight stands in if WebGL is unavailable. */
function ObjectBox({ kind, className }: { kind: string; className: string }) {
  return <div data-object={kind} aria-hidden className={`bg-[radial-gradient(closest-side,rgb(255_255_255/0.9),transparent)] ${className}`} />;
}

function Hero() {
  return (
    <section id="top" className="px-5 pt-10 text-center md:pt-12">
      <motion.div initial="hidden" animate="show" variants={group}>
        <motion.p variants={item} className="text-sm font-medium text-muted md:text-base">
          Web · Mobile · Backend · Cloud
        </motion.p>
        <motion.h1 variants={item} className="mx-auto mt-3 text-[clamp(2.75rem,7.2vw,6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-fg">
          Engineered under <span className="whitespace-nowrap">G-Force.</span>
        </motion.h1>
        <motion.p variants={item} className="mx-auto mt-5 max-w-2xl text-lg text-body md:text-xl">
          Full-stack web and mobile products, multi-tenant backends and production infrastructure.
        </motion.p>
        <motion.div variants={item} className="mt-4 text-lg text-muted">
          We ship
          <Ship />
        </motion.div>
        <motion.div variants={item} className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-lg">
          <a href="#contact" className="rounded-full bg-link px-6 py-2.5 text-base font-medium text-white transition-opacity hover:opacity-85">
            Start a project
          </a>
          {/* <More href="#services">See what we build</More> */}
        </motion.div>
      </motion.div>
      {/* The scene stays pinned while the page scrolls through this track; that scroll turns it into the laptop (three/Showcase.tsx). */}
      {HERO_SCENE && (
        <div className="mt-4 h-[80svh] motion-reduce:h-auto md:h-[100svh] md:motion-reduce:h-auto">
          <ObjectBox kind="hero" className="sticky top-[calc(27svh+1.5rem)] mx-auto h-[46svh] w-full max-w-6xl md:top-[calc(15svh+1.5rem)] md:h-[70svh]" />
        </div>
      )}
    </section>
  );
}

function Product({ p, flip }: { p: (typeof LINEUP)[number]; flip: boolean }) {
  return (
    <article id={p.id} className="grid scroll-mt-16 overflow-hidden rounded-[28px] bg-tile md:grid-cols-2 md:items-center">
      {/* The object always has its own box: above the text on a phone, beside it on a desktop. */}
      <ObjectBox kind={p.object} className={`aspect-[4/3] w-full md:aspect-auto md:h-[540px] ${flip ? "md:order-2" : ""}`} />
      <motion.div {...inView} variants={group} className="px-6 pb-9 pt-2 md:p-12 lg:p-16" style={{ ["--accent" as string]: tone(p.tone) }}>
        <motion.p variants={item} className="text-sm font-semibold text-[var(--accent)]">
          {p.name}
        </motion.p>
        <motion.h3 variants={item} className="mt-2 text-3xl font-semibold leading-[1.08] tracking-tight text-fg md:text-[2.75rem]">
          {p.headline}
        </motion.h3>
        <motion.p variants={item} className="mt-4 text-lg text-body">
          {p.body}
        </motion.p>
        <ul className="mt-6 space-y-3 border-t border-line pt-6">
          {p.features.map((f) => (
            <motion.li key={f.title} variants={item} className="text-[15px] leading-relaxed text-muted">
              <span className="font-semibold text-fg">{f.title}.</span> {f.body}
            </motion.li>
          ))}
        </ul>
        <motion.p variants={item} className="mt-6 text-sm text-muted">
          {p.stack.join(" · ")}
        </motion.p>
      </motion.div>
    </article>
  );
}

const pad = "px-4 py-20 md:px-6 md:py-28";

export default function Sections() {
  return (
    <>
      <Hero />

      <section id="services" className={`scroll-mt-12 ${pad}`}>
        <Heading title="What we build." lead="One team from the first wireframe to the pager rotation." />
        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:mt-14">
          {LINEUP.map((p, i) => (
            <Product key={p.id} p={p} flip={i % 2 === 1} />
          ))}
        </div>
      </section>

      <section id="process" className={`scroll-mt-12 ${pad} !pt-0`}>
        <Heading title="From brief to production." lead="Four stages, four concrete deliverables, no drama." />
        <motion.ol {...inView} variants={group} className="mx-auto mt-10 grid max-w-6xl gap-5 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
          {PROCESS.map((p) => (
            <motion.li key={p.n} variants={item} className="flex flex-col rounded-[28px] bg-tile p-7">
              <span className="text-sm font-semibold" style={{ color: tone(p.tone) }}>
                {p.n}
              </span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-fg">{p.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{p.body}</p>
              <p className="mt-auto pt-6 text-sm text-fg">
                <span className="block text-muted">You get</span>
                {p.out}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      <section id="engagement" className={`scroll-mt-12 ${pad} !pt-0`}>
        <Heading title="Which way of working fits?" lead="Three ways to engage, depending on how defined the work is." />
        <motion.div {...inView} variants={group} className="mx-auto mt-10 grid max-w-6xl md:mt-14 md:grid-cols-3">
          {COMPARE.map((c) => (
            <motion.div key={c.title} variants={item} className="border-t border-line px-2 py-8 text-center md:border-l md:border-t-0 md:px-8 md:py-2 md:first:border-l-0">
              <h3 className="text-2xl font-semibold tracking-tight text-fg">{c.title}</h3>
              <dl className="mt-6 space-y-5 text-[15px] leading-relaxed">
                <div>
                  <dt className="text-muted">Best for</dt>
                  <dd className="mt-1 text-fg">{c.best}</dd>
                </div>
                <div>
                  <dt className="text-muted">You get</dt>
                  <dd className="mt-1 text-fg">{c.get}</dd>
                </div>
              </dl>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="contact" className={`scroll-mt-12 ${pad} !pt-0`}>
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[28px] bg-tile p-5 md:grid-cols-2 md:gap-12 md:p-12">
          <motion.div {...inView} variants={group} className="flex flex-col justify-between px-2 pt-4 md:px-0 md:pt-2">
            <div>
              <motion.h2 variants={item} className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
                Start a project.
              </motion.h2>
              <motion.p variants={item} className="mt-4 text-lg text-muted">
                Tell us what you are building. Here is what happens next.
              </motion.p>
              <ol className="mt-8 space-y-5">
                {NEXT_STEPS.map((n, i) => (
                  <motion.li key={n.title} variants={item} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-fg">{i + 1}</span>
                    <div>
                      <div className="font-semibold text-fg">{n.title}</div>
                      <p className="text-[15px] text-muted">{n.body}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>

            <motion.div variants={item} className="mt-8 border-t border-line/70 pt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Direct channels</div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <a
                  href="mailto:naveensuresh321@gmail.com"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:border-link hover:text-link"
                >
                  <Mail size={15} className="text-muted" />
                  naveensuresh321@gmail.com
                </a>
                <a
                  href="https://wa.me/918904181356"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-300"
                >
                  <WhatsAppIcon size={16} />
                  WhatsApp
                </a>
                <a
                  href="tel:+918904181356"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:border-link hover:text-link"
                >
                  <Phone size={15} className="text-muted" />
                  +91-8904181356
                </a>
              </div>
            </motion.div>
          </motion.div>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <span>
            <span className="font-semibold text-fg">G-Force</span> · Full-stack, mobile and systems engineering
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a href="mailto:naveensuresh321@gmail.com" className="inline-flex items-center gap-1.5 text-fg transition hover:text-link">
              <Mail size={14} className="text-muted" />
              <span>naveensuresh321@gmail.com</span>
            </a>
            <a href="https://wa.me/918904181356" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-emerald-600 transition hover:text-emerald-700">
              <WhatsAppIcon size={14} />
              <span>WhatsApp</span>
            </a>
            <a href="tel:+918904181356" className="inline-flex items-center gap-1.5 text-fg transition hover:text-link">
              <Phone size={14} className="text-muted" />
              <span>+91-8904181356</span>
            </a>
          </div>
          <a href="#top" className="hover:text-fg">
            Back to top
          </a>
        </div>
      </footer>
    </>
  );
}
