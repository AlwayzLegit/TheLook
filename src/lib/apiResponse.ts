import { NextResponse } from "next/server";

/**
 * Return a consistent JSON error response. Never exposes internal details.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Return a consistent JSON success response.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Log errors in a production-safe manner. In development, logs the full error.
 * In production, logs only a sanitized summary.
 */
export function logError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${context}] ${message}`);
  }
}
