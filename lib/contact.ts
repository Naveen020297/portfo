// Server-safe and browser-safe: no hooks, no Node APIs.
//
// The one definition of a project request. Both forms, the API route and the database
// (db/migrations) use this shape and these rules, so a request looks the same everywhere.

/**
 * Countries offered in the phone field. `digits` is the allowed length of the national number
 * (without the dialling code or a leading 0). "ZZ" lets a visitor from anywhere else type the
 * whole international number themselves.
 */
export const COUNTRIES = [
  { iso: "IN", name: "India", dial: "+91", digits: [10, 10], example: "98765 43210" },
  { iso: "US", name: "United States", dial: "+1", digits: [10, 10], example: "415 555 0132" },
  { iso: "CA", name: "Canada", dial: "+1", digits: [10, 10], example: "416 555 0132" },
  { iso: "GB", name: "United Kingdom", dial: "+44", digits: [9, 10], example: "7400 123456" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", digits: [8, 9], example: "50 123 4567" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", digits: [9, 9], example: "50 123 4567" },
  { iso: "SG", name: "Singapore", dial: "+65", digits: [8, 8], example: "8123 4567" },
  { iso: "AU", name: "Australia", dial: "+61", digits: [9, 9], example: "412 345 678" },
  { iso: "NZ", name: "New Zealand", dial: "+64", digits: [8, 10], example: "21 123 4567" },
  { iso: "DE", name: "Germany", dial: "+49", digits: [6, 11], example: "1512 3456789" },
  { iso: "FR", name: "France", dial: "+33", digits: [9, 9], example: "6 12 34 56 78" },
  { iso: "NL", name: "Netherlands", dial: "+31", digits: [9, 9], example: "6 12345678" },
  { iso: "ZZ", name: "Other", dial: "+", digits: [8, 15], example: "Country code and number" },
] as const;

export type CountryIso = (typeof COUNTRIES)[number]["iso"];
export const DEFAULT_COUNTRY: CountryIso = "IN";
export const countryOf = (iso: string) => COUNTRIES.find((c) => c.iso === iso);

/** What a form holds while the visitor types, and what it posts to /api/contact. */
export type ContactInput = {
  name: string;
  email: string;
  country: string; // one of COUNTRIES' iso codes
  phone: string; // the national number as typed: spaces, dashes and a leading 0 are fine
  message: string;
};

/** The canonical request: what the API stores and what every other consumer should expect. */
export type ContactRequest = {
  name: string; // trimmed, single spaces, 2-100 characters
  email: string; // trimmed, lower case
  phone: string; // E.164: "+" then country code and number, digits only, e.g. +919876543210
  country: CountryIso; // ISO 3166-1 alpha-2 of the chosen prefix ("ZZ" = other); tells US from CA
  message: string | null; // trimmed; null when left empty
};

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export const LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMax: 2000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9]\d{6,14}$/;
const text = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Checks a submitted form and turns it into the canonical ContactRequest.
 * The forms call it for their error messages; the API calls it again, since a browser can send anything.
 */
export function parseContact(input: unknown): { ok: true; value: ContactRequest } | { ok: false; errors: ContactErrors } {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const errors: ContactErrors = {};

  const name = text(raw.name).trim().replace(/\s+/g, " ");
  if (name.length < LIMITS.nameMin) errors.name = `name must be at least ${LIMITS.nameMin} characters`;
  else if (name.length > LIMITS.nameMax) errors.name = `name must be at most ${LIMITS.nameMax} characters`;

  const email = text(raw.email).trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > LIMITS.emailMax) errors.email = "enter a valid email address";

  const country = countryOf(text(raw.country));
  let phone = "";
  if (!country) errors.country = "pick a country code";
  else {
    // Digits only; a leading 0 (or 00) is a trunk prefix that is dropped in the international form.
    const national = text(raw.phone).replace(/\D/g, "").replace(/^0+/, "");
    const [min, max] = country.digits;
    phone = country.dial + national;
    if (!national) errors.phone = "enter a phone number";
    else if (national.length < min || national.length > max || !E164.test(phone)) {
      errors.phone = country.iso === "ZZ" ? "enter the number with its country code" : `enter a valid ${country.name} number (${min === max ? min : `${min}-${max}`} digits)`;
    }
  }

  const message = text(raw.message).trim();
  if (message.length > LIMITS.messageMax) errors.message = `keep the brief under ${LIMITS.messageMax} characters (${message.length})`;

  if (!country || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, phone, country: country.iso, message: message || null } };
}
