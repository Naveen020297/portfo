"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { PROJECT_TYPES } from "@/lib/content";
import { store } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = { name: string; email: string; type: string; message: string };
type Errors = Partial<Record<keyof Values, string>>;

const validate = (v: Values): Errors => {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "name must be at least 2 characters";
  if (!EMAIL.test(v.email.trim())) e.email = "enter a valid email address";
  if (!v.type) e.type = "pick a project type";
  if (v.message.trim().length < 20) e.message = `describe the project (${v.message.trim().length}/20 chars)`;
  return e;
};

// Top-level on purpose: a component defined inside render remounts every keystroke and drops focus.
function Row({ error, label, children }: { error?: string; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm text-cyanx">&gt;</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">{label}</span>
        <AnimatePresence>
          {error && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[11px] text-pinkx">
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="ml-4 border-b border-slate-700 pb-1 transition focus-within:border-cyanx">{children}</div>
    </label>
  );
}

const inputCls ="w-full bg-transparent font-mono text-sm text-white placeholder:text-slate-600 outline-none";

export default function ContactTerminal() {
  const [v, setV] = useState<Values>({ name: "", email: "", type: "", message: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [note, setNote] = useState("");

  const errors = validate(v);
  const valid = Object.keys(errors).length === 0;
  const set = (k: keyof Values, val: string) => setV((s) => ({ ...s, [k]: val }));
  const blur = (k: keyof Values) => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof Values) => (touched[k] && errors[k] ? errors[k] : "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, type: true, message: true });
    if (!valid) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Request failed");
      setStatus("ok");
      setNote(`Request ${data.id} received. We'll reply within one business day.`);
      store.pulse = 1; // the tunnel behind flashes
      setV({ name: "", email: "", type: "", message: "" });
      setTouched({});
    } catch (x) {
      setStatus("error");
      setNote(x instanceof Error ? x.message : "Something went wrong. Please retry.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="hud-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-pinkx" />
        <span className="h-2.5 w-2.5 rounded-full bg-amberx" />
        <span className="h-2.5 w-2.5 rounded-full bg-greenx" />
        <span className="ml-2 font-mono text-[11px] text-slate-500">gforce@project-request:~$</span>
      </div>

      <div className="space-y-5 p-5">
        <Row error={err("name")} label="name">
          <input className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} placeholder="Ada Lovelace" autoComplete="name" />
        </Row>
        <Row error={err("email")} label="email">
          <input className={inputCls} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} onBlur={() => blur("email")} placeholder="ada@company.com" autoComplete="email" />
        </Row>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-cyanx">&gt;</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">project type</span>
            {err("type") && <span className="font-mono text-[11px] text-pinkx">{err("type")}</span>}
          </div>
          <div className="ml-4 mt-2 flex flex-wrap gap-2">
            {PROJECT_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  set("type", t);
                  blur("type");
                }}
                aria-pressed={v.type === t}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] transition ${v.type === t ? "border-cyanx bg-cyanx/15 text-cyanx" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Row error={err("message")} label="brief">
          <textarea className={`${inputCls} resize-none`} rows={4} value={v.message} onChange={(e) => set("message", e.target.value)} onBlur={() => blur("message")} placeholder="What are we building, for whom, and by when?" />
        </Row>

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="font-mono text-[11px] text-slate-500">{valid ? "[ ready to transmit ]" : "[ awaiting valid input ]"}</span>
          <button
            type="submit"
            disabled={status === "sending"}
            className="flex items-center gap-2 rounded bg-cyanx px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-60"
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
