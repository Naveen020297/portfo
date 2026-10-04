// Server only: imported by route handlers, never by a component.
import { Pool } from "pg";
import type { ContactRequest } from "./contact";

// One pool per server process, kept on globalThis so a dev hot-reload does not open another.
const g = globalThis as typeof globalThis & { __gforcePool?: Pool };

/** The connection pool, or null while DATABASE_URL is not configured. */
function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return (g.__gforcePool ??= new Pool({ connectionString: url, max: 3 }));
}

/**
 * Stores a project request in contact_requests (see db/migrations).
 * Returns false, storing nothing, while no database is configured.
 */
export async function saveContact(reference: string, c: ContactRequest) {
  const db = pool();
  if (!db) return false;
  await db.query("insert into contact_requests (reference, name, email, phone, country, message) values ($1, $2, $3, $4, $5, $6)", [reference, c.name, c.email, c.phone, c.country, c.message]);
  return true;
}
