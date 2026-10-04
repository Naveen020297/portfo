"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { COUNTRIES, countryOf } from "@/lib/contact";
import { store } from "@/lib/store";
import { useContactForm } from "@/lib/useContactForm";

// Top-level on purpose: a component defined inside render remounts every keystroke and drops focus.
function Row({ error, label, children }: { error?: string; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm text-cyanx">&gt;</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-faint">{label}</span>
        <AnimatePresence>
          {error && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[11px] text-pinkx">
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="ml-4 border-b border-line pb-1 transition focus-within:border-cyanx">{children}</div>
    </label>
  );
}

const inputCls ="w-full bg-transparent font-mono text-sm text-fg placeholder:text-faint/70 outline-none";

export default function ContactTerminal() {
  // On success the tunnel behind flashes.
  const { v, set, blur, err, valid, status, note, submit } = useContactForm(() => void (store.pulse = 1));
  const country = countryOf(v.country) ?? COUNTRIES[0];

  return (
    <form onSubmit={submit} noValidate className="hud-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-pinkx" />
        <span className="h-2.5 w-2.5 rounded-full bg-amberx" />
        <span className="h-2.5 w-2.5 rounded-full bg-greenx" />
        <span className="ml-2 font-mono text-[11px] text-faint">gforce@project-request:~$</span>
      </div>

      <div className="space-y-5 p-5">
        <Row error={err("name")} label="name">
          <input className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} placeholder="Gohan" autoComplete="name" />
        </Row>
        <Row error={err("email")} label="email">
          <input className={inputCls} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} onBlur={() => blur("email")} placeholder="gohan@company.com" autoComplete="email" />
        </Row>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-cyanx">&gt;</span>
            <label htmlFor="contact-phone" className="font-mono text-[11px] uppercase tracking-widest text-faint">
              phone
            </label>
            {err("phone") && <span className="font-mono text-[11px] text-pinkx">{err("phone")}</span>}
          </div>
          <div className="ml-4 flex items-center gap-3 border-b border-line pb-1 transition focus-within:border-cyanx">
            {/* The prefix shows as short text; the real select lies invisibly on top of it. */}
            <div className="relative shrink-0 font-mono text-sm text-cyanx">
              <span aria-hidden>{country.iso === "ZZ" ? "other" : `${country.iso} ${country.dial}`} ▾</span>
              <select aria-label="Country code" value={v.country} onChange={(e) => set("country", e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.iso === "ZZ" ? "Other country" : `${c.name} (${c.dial})`}
                  </option>
                ))}
              </select>
            </div>
            <input
              id="contact-phone"
              className={inputCls}
              type="tel"
              inputMode="tel"
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => blur("phone")}
              placeholder={country.example}
              autoComplete={country.iso === "ZZ" ? "tel" : "tel-national"}
            />
          </div>
        </div>

        <Row error={err("message")} label="brief (optional)">
          <textarea className={`${inputCls} resize-none`} rows={4} value={v.message} onChange={(e) => set("message", e.target.value)} onBlur={() => blur("message")} placeholder="What are we building, for whom, and by when?" />
        </Row>

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="font-mono text-[11px] text-faint">{valid ? "[ ready to transmit ]" : "[ awaiting valid input ]"}</span>
          <button
            type="submit"
            disabled={status === "sending"}
            className="flex items-center gap-2 rounded bg-cyanx px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-void transition hover:bg-fg disabled:opacity-60"
          >
            {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {status === "sending" ? "Sending" : "Transmit"}
          </button>
        </div>

        <div aria-live="polite" className="min-h-5">
          {status === "ok" && (
            <p className="flex items-start gap-2 font-mono text-xs text-greenx">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> [ OK ] {note}
            </p>
          )}
          {status === "error" && (
            <p className="flex items-start gap-2 font-mono text-xs text-pinkx">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> [ ERR ] {note}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
