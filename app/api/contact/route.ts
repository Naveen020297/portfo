import { NextResponse } from "next/server";
import { parseContact } from "@/lib/contact";
import { saveContact } from "@/lib/db";

// The PostgreSQL client needs Node, not the edge runtime.
export const runtime = "nodejs";

/** The reference shown to the visitor: time-ordered, with a random tail so two requests in the same millisecond differ. */
const newReference = () => `REQ-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseContact(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "Validation failed", errors: parsed.errors }, { status: 422 });

  const id = newReference();
  try {
    const stored = await saveContact(id, parsed.value);
    // Until DATABASE_URL is set the request only reaches the server log.
    if (!stored) console.warn("[contact] DATABASE_URL is not set: request logged, not stored", { id, ...parsed.value });
  } catch (error) {
    console.error("[contact] could not store request", id, error);
    return NextResponse.json({ ok: false, error: "We could not save your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
