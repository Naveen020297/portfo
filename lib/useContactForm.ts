import { useState, type FormEvent } from "react";
import { DEFAULT_COUNTRY, parseContact, type ContactErrors, type ContactInput } from "./contact";

export type Values = ContactInput;

const EMPTY: Values = { name: "", email: "", country: DEFAULT_COUNTRY, phone: "", message: "" };

/** State, validation and submit for the project-request form. Shared by both site themes. */
export function useContactForm(onSuccess?: () => void) {
  const [v, setV] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [note, setNote] = useState("");

  // The same check the API runs (lib/contact.ts), so the form and the server never disagree.
  const parsed = parseContact(v);
  const errors: ContactErrors = parsed.ok ? {} : parsed.errors;
  const valid = parsed.ok;
  const set = (k: keyof Values, val: string) => setV((s) => ({ ...s, [k]: val }));
  const blur = (k: keyof Values) => setTouched((t) => ({ ...t, [k]: true }));
  /** The field's error, once the visitor has left it or tried to submit. */
  const err = (k: keyof Values) => (touched[k] && errors[k] ? errors[k] : "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, country: true, phone: true, message: true });
    if (!valid) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Request failed");
      setStatus("ok");
      setNote(`Request ${data.id} received. We'll reply within one business day.`);
      onSuccess?.();
      setV({ ...EMPTY, country: v.country });
      setTouched({});
    } catch (x) {
      setStatus("error");
      setNote(x instanceof Error ? x.message : "Something went wrong. Please retry.");
    }
  };

  return { v, set, blur, err, valid, status, note, submit };
}
