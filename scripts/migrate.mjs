// Applies db/migrations/*.sql to the database in DATABASE_URL, in file-name order, once each.
// Usage: npm run db:migrate            apply what is pending
//        npm run db:migrate -- --status   list what is applied and what is pending
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "db", "migrations");

// Same files Next.js reads. Variables already set in the shell win; .env.local wins over .env.
for (const f of [".env.local", ".env"]) {
  const file = path.join(root, f);
  if (existsSync(file)) process.loadEnvFile(file);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example) and run this again.");
  process.exit(1);
}

const statusOnly = process.argv.includes("--status");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = async () => new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));

  if (statusOnly) {
    const done = await applied();
    for (const f of files) console.log(`${done.has(f) ? "applied" : "pending"}  ${f}`);
  } else {
    let ran = 0;
    for (const f of files) {
      // One transaction per file: it either applies completely or not at all.
      await client.query("begin");
      try {
        // Held until commit, so two runs at once cannot apply the same file twice.
        await client.query("select pg_advisory_xact_lock(7274)");
        if ((await applied()).has(f)) {
          await client.query("rollback");
          continue;
        }
        await client.query(await readFile(path.join(dir, f), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [f]);
        await client.query("commit");
        console.log(`applied  ${f}`);
        ran++;
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${f} failed and was rolled back: ${error.message}`);
      }
    }
    console.log(ran ? `Done: ${ran} migration${ran > 1 ? "s" : ""} applied.` : "Nothing to do: the database is up to date.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
