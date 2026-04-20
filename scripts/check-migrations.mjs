#!/usr/bin/env node
// B-33 — fail loud if migration filenames aren't unique + monotonically
// ordered. Run via `node scripts/check-migrations.mjs` (or wire into a
// pre-commit hook).
//
// Convention: <YYYYMMDD>[a-z]_<description>.sql

import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const PATTERN = /^(\d{8})([a-z]?)_[a-z0-9_]+\.sql$/;

function fail(msg) {
  console.error(`\u001b[31m✘\u001b[0m  ${msg}`);
  process.exitCode = 1;
}

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

const seen = new Set();
const sortKeys = [];

for (const f of files) {
  const m = f.match(PATTERN);
  if (!m) {
    fail(`migration "${f}" doesn't match YYYYMMDD[a-z]_description.sql`);
    continue;
  }
  const [, day, suffix] = m;
  const key = `${day}${suffix || ""}`;
  if (seen.has(key)) {
    fail(`duplicate migration prefix "${key}" — pick a new suffix letter`);
  }
  seen.add(key);
  sortKeys.push({ key, file: f });
}

sortKeys.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
const observed = files.slice().sort();
for (let i = 0; i < observed.length; i++) {
  if (observed[i] !== sortKeys[i].file) {
    fail(
      `migration ordering is non-monotonic — fs sort: ${observed[i]} vs key sort: ${sortKeys[i].file}`,
    );
    break;
  }
}

if (process.exitCode) {
  console.error(
    `\u001b[31m✘\u001b[0m  ${sortKeys.length} migrations checked — see errors above`,
  );
  process.exit(1);
}
console.log(`\u001b[32m✔\u001b[0m  ${sortKeys.length} migrations checked, all good`);
