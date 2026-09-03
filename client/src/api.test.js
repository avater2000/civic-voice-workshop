import { afterEach, describe, expect, it, vi } from "vitest";
import { getHealthStatus } from "./api";

describe("API health checks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the health endpoint and recognises a healthy API", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, service: "civic-voice-api" }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(getHealthStatus()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/health", expect.objectContaining({
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
    }));
  });

  it("treats an unhealthy response as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false }),
    }));

    await expect(getHealthStatus()).resolves.toBe(false);
  });
});
