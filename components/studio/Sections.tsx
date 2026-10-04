"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { COMPARE, LINEUP, NEXT_STEPS, PROCESS, SHIP } from "@/lib/content";
import { HERO_SCENE } from "@/lib/site";
import ContactForm from "./ContactForm";

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
        <motion.p variants={item} className="mt-6">
          <More href="#contact">Start a project</More>
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
              <p className="mt-6">
                <More href="#contact">Talk to us</More>
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="contact" className={`scroll-mt-12 ${pad} !pt-0`}>
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[28px] bg-tile p-5 md:grid-cols-2 md:gap-12 md:p-12">
          <motion.div {...inView} variants={group} className="px-2 pt-4 md:px-0 md:pt-2">
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
          </motion.div>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-semibold text-fg">G-Force</span> · Full-stack, mobile and systems engineering
          </span>
          <a href="#top" className="hover:text-fg">
            Back to top
          </a>
        </div>
      </footer>
    </>
  );
}
