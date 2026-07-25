#!/usr/bin/env node
/**
 * Pre-deploy check. Run `npm run preflight` before you push.
 *
 * Catches the failures that only show up AFTER a deploy, when you're on
 * stage and a judge is watching: a missing env var, an unrun migration, a
 * database function the code calls but the SQL never created.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

let fail = 0, warn = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { console.log(`  \x1b[31m✗\x1b[0m ${m}`); fail++; };
const meh = (m) => { console.log(`  \x1b[33m!\x1b[0m ${m}`); warn++; };

console.log("\n\x1b[1mUdhaarAI pre-flight\x1b[0m\n");

/* 1. environment ---------------------------------------------------- */
console.log("Environment");
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "GEMINI_API_KEY",
];
const envFile = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
for (const key of REQUIRED) {
  const inFile = new RegExp(`^${key}=.+`, "m").test(envFile);
  const inProc = !!process.env[key];
  if (inFile || inProc) ok(`${key} is set`);
  else bad(`${key} is MISSING — the app will not boot`);
}
if (/^SUPABASE_SERVICE_ROLE_KEY=.+/m.test(envFile)) {
  ok("service role key present (server-only, never shipped)");
}
if (/NEXT_PUBLIC_.*(SERVICE_ROLE|GEMINI)/.test(envFile)) {
  bad("A SECRET IS PREFIXED NEXT_PUBLIC_ — it would be exposed to every browser");
}

/* 2. SQL vs code ---------------------------------------------------- */
console.log("\nDatabase");
const sql = readdirSync("supabase")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join("supabase", f), "utf8"))
  .join("\n");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name))
    : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []
  );
}
const code = walk("src").map((f) => readFileSync(f, "utf8")).join("\n");

const rpcs = [...new Set([...code.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map((m) => m[1]))];
for (const fn of rpcs) {
  if (new RegExp(`function public\\.${fn}\\b`).test(sql)) ok(`rpc ${fn}() exists in SQL`);
  else bad(`rpc ${fn}() is CALLED but never created — run the migrations`);
}

const tables = [...new Set([...code.matchAll(/\.from\(\s*["']([a-z_]+)["']/g)].map((m) => m[1]))]
  .filter((t) => t !== "notebooks"); // storage bucket, not a table
for (const tbl of tables) {
  if (new RegExp(`create table if not exists public\\.${tbl}\\b`).test(sql)) ok(`table ${tbl} exists`);
  else bad(`table ${tbl} is QUERIED but never created`);
}

// every table must have RLS
for (const tbl of tables) {
  if (new RegExp(`alter table\\s+public\\.${tbl}\\s+enable row level security`).test(sql)) ok(`RLS on ${tbl}`);
  else bad(`table ${tbl} has NO ROW LEVEL SECURITY — its data is readable by anyone`);
}

/* 3. assets --------------------------------------------------------- */
console.log("\nAssets");
for (const f of ["public/og.jpg", "public/favicon.png", "public/manifest.webmanifest", "public/brand/overview.jpg"]) {
  existsSync(f) ? ok(`${f}`) : meh(`${f} missing — social preview or icon will fall back`);
}

/* 4. secrets in source ---------------------------------------------- */
console.log("\nSecrets");
const leaked = /(?:sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/.exec(code);
leaked ? bad(`possible hardcoded key in source: ${leaked[0].slice(0, 12)}…`) : ok("no hardcoded API keys in src/");

/* ------------------------------------------------------------------- */
console.log(
  `\n${fail === 0 ? "\x1b[32mReady to deploy" : "\x1b[31mNOT ready"}\x1b[0m — ` +
  `${fail} blocker${fail === 1 ? "" : "s"}, ${warn} warning${warn === 1 ? "" : "s"}\n`
);
process.exit(fail ? 1 : 0);
