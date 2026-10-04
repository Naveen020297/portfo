"use client";

import type { ReactNode } from "react";
import { CheckCircle2, ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import { COUNTRIES, countryOf } from "@/lib/contact";
import { useContactForm } from "@/lib/useContactForm";

// The shared validation messages are lower case (they suit the space theme's terminal); capitalise them here.
const errorCls = "mt-1.5 block text-sm text-red-600 first-letter:uppercase";

// Top-level on purpose: a component defined inside render remounts every keystroke and drops focus.
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-fg">{label}</span>
      {hint && <span className="ml-1.5 text-sm text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className={errorCls}>{error}</span>}
    </label>
  );
}

// 16px text: anything smaller makes iOS zoom the page when the field takes focus.
const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-fg outline-none transition placeholder:text-faint focus:border-link focus:ring-4 focus:ring-link/15";

export default function ContactForm() {
  const { v, set, blur, err, status, note, submit } = useContactForm();
  const country = countryOf(v.country) ?? COUNTRIES[0];

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl bg-white p-6 md:p-8">
      <Field label="Name" error={err("name")}>
        <input className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} placeholder="Ada Lovelace" autoComplete="name" />
      </Field>
      <Field label="Email" error={err("email")}>
        <input className={inputCls} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} onBlur={() => blur("email")} placeholder="ada@company.com" autoComplete="email" />
      </Field>

      <div>
        <label htmlFor="contact-phone" className="text-sm font-medium text-fg">
          Phone
        </label>
        <div className="mt-1.5 flex rounded-xl border border-line bg-white transition focus-within:border-link focus-within:ring-4 focus-within:ring-link/15">
          {/* The prefix shows as short text; the real select lies invisibly on top of it. */}
          <div className="relative flex shrink-0 items-center gap-1 border-r border-line pl-4 pr-3 text-base text-fg">
            <span aria-hidden>{country.iso === "ZZ" ? country.name : `${country.iso} ${country.dial}`}</span>
            <ChevronDown size={14} className="text-muted" aria-hidden />
            <select aria-label="Country code" value={v.country} onChange={(e) => set("country", e.target.value)} className="absolute inset-0 cursor-pointer text-base opacity-0">
              {COUNTRIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.iso === "ZZ" ? "Other country" : `${c.name} (${c.dial})`}
                </option>
              ))}
            </select>
          </div>
          <input
            id="contact-phone"
            className="w-full min-w-0 rounded-r-xl bg-transparent px-4 py-3 text-base text-fg outline-none placeholder:text-faint"
            type="tel"
            inputMode="tel"
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
            onBlur={() => blur("phone")}
            placeholder={country.example}
            autoComplete={country.iso === "ZZ" ? "tel" : "tel-national"}
          />
        </div>
        {err("phone") && <span className={errorCls}>{err("phone")}</span>}
      </div>

      <Field label="Brief" hint="Optional" error={err("message")}>
        <textarea className={`${inputCls} resize-none`} rows={4} value={v.message} onChange={(e) => set("message", e.target.value)} onBlur={() => blur("message")} placeholder="What are we building, for whom, and by when?" />
      </Field>

      <button type="submit" disabled={status === "sending"} className="flex w-full items-center justify-center gap-2 rounded-full bg-link px-6 py-3 text-base font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60 sm:w-auto">
        {status === "sending" && <Loader2 size={16} className="animate-spin" />}
        {status === "sending" ? "Sending" : "Send request"}
      </button>

      <div aria-live="polite">
        {status === "ok" && (
          <p className="flex items-start gap-2 text-sm text-green-700">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {note}
          </p>
        )}
        {status === "error" && (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {note}
          </p>
        )}
      </div>
    </form>
  );
}
