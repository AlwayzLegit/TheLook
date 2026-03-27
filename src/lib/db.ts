import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("POSTGRES_URL environment variable is not set");
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

// Lazy proxy — only creates DB connection at runtime, not at build time
export const db = new Proxy({}, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;
