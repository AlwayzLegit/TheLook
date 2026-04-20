// Lightweight structured logger. Routes can pull a stable request id and
// attach it to every log line so admin errors can be correlated to the
// admin action that triggered them.
//
// Usage:
//   const log = createLogger("api/foo");
//   log.warn("rate-limited", { ip });
//   log.error("db read failed", err);

import { headers } from "next/headers";

export type LogLevel = "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

interface Logger {
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, errOrFields?: unknown): void;
  child(scope: string): Logger;
}

// Per-request id from Vercel/Cloudflare/Supabase, or a generated fallback.
// Cached on globalThis per request via Next's headers() call so siblings see
// the same id within one request.
async function getRequestId(): Promise<string | null> {
  try {
    const h = await headers();
    return (
      h.get("x-vercel-id") ||
      h.get("x-request-id") ||
      h.get("cf-ray") ||
      null
    );
  } catch {
    return null;
  }
}

function emit(level: LogLevel, scope: string, msg: string, fields?: LogFields) {
  const payload: LogFields = {
    level,
    scope,
    msg,
    ts: new Date().toISOString(),
    ...(fields || {}),
  };
  // Vercel and most log aggregators happily parse a single JSON line.
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function makeLogger(scope: string): Logger {
  return {
    info(msg, fields) {
      void getRequestId().then((rid) =>
        emit("info", scope, msg, { ...(fields || {}), requestId: rid }),
      );
    },
    warn(msg, fields) {
      void getRequestId().then((rid) =>
        emit("warn", scope, msg, { ...(fields || {}), requestId: rid }),
      );
    },
    error(msg, errOrFields) {
      const fields: LogFields =
        errOrFields instanceof Error
          ? { error: errOrFields.message, stack: errOrFields.stack }
          : (errOrFields as LogFields) || {};
      void getRequestId().then((rid) =>
        emit("error", scope, msg, { ...fields, requestId: rid }),
      );
    },
    child(child) {
      return makeLogger(`${scope}:${child}`);
    },
  };
}

export function createLogger(scope: string): Logger {
  return makeLogger(scope);
}
