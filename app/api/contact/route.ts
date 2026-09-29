import { NextResponse } from "next/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const type = String(body.type ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (name.length < 2 || !EMAIL.test(email) || !type || message.length < 20) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 422 });
  }

  const id = `REQ-${Date.now().toString(36).toUpperCase()}`;
  // TODO: forward to your inbox / CRM (Resend, SES, Slack webhook...). Logged for now.
  console.log("[contact]", { id, name, email, type, message });

  return NextResponse.json({ ok: true, id });
}
