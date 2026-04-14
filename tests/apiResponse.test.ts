import { describe, it, expect, vi } from "vitest";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";

describe("apiError", () => {
  it("returns JSON with error message and status", async () => {
    const response = apiError("Not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 500 for server errors", async () => {
    const response = apiError("Internal error", 500);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Internal error" });
  });

  it("returns 400 for validation errors", async () => {
    const response = apiError("Invalid input", 400);
    expect(response.status).toBe(400);
  });
});

describe("apiSuccess", () => {
  it("returns JSON with data and 200 by default", async () => {
    const response = apiSuccess({ items: [1, 2, 3] });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ items: [1, 2, 3] });
  });

  it("returns custom status code", async () => {
    const response = apiSuccess({ id: "abc" }, 201);
    expect(response.status).toBe(201);
  });

  it("handles empty array", async () => {
    const response = apiSuccess([]);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });
});

describe("logError", () => {
  it("logs full error in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("test error");
    logError("test/context", err);

    expect(spy).toHaveBeenCalledWith("[test/context]", err);
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it("logs only message in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("test/context", new Error("sensitive details"));

    expect(spy).toHaveBeenCalledWith("[test/context] sensitive details");
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it("handles non-Error objects", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    logError("test", "string error");

    expect(spy).toHaveBeenCalledWith("[test] string error");
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
