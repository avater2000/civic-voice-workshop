import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getFeedback, getFeedbackCsv, getHealthStatus, login, updateFeedbackStatus } from "./api";

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

  it("keeps the HTTP status on API errors so login can handle rate limits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: "RATE_LIMITED", message: "Too many failed sign-in attempts." } }),
    }));

    await expect(login({})).rejects.toMatchObject({
      name: "Error", status: 429, code: "RATE_LIMITED", message: "Too many failed sign-in attempts.",
    });
    await expect(login({})).rejects.toBeInstanceOf(ApiError);
  });

  it("sends active inbox filters as query parameters", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ feedback: [] }) });
    vi.stubGlobal("fetch", fetch);

    await expect(getFeedback({ role: "admin" }, { category: "Estate", status: "In review" })).resolves.toEqual({ feedback: [] });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback?category=Estate&status=In+review",
      expect.objectContaining({ headers: expect.objectContaining({ "x-user-role": "admin" }) }),
    );
  });

  it("includes the requested inbox page with active filters", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ feedback: [], pagination: {} }) });
    vi.stubGlobal("fetch", fetch);

    await getFeedback({ role: "admin" }, { category: "Estate", page: 2 });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback?category=Estate&page=2",
      expect.any(Object),
    );
  });

  it("requests CSV with all active filters and the admin role", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["csv"]) });
    vi.stubGlobal("fetch", fetch);

    await expect(getFeedbackCsv({ role: "admin" }, { category: "Estate", status: "New", query: "bench" })).resolves.toBeInstanceOf(Blob);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback/export.csv?category=Estate&status=New&query=bench",
      { headers: { "x-user-role": "admin" } },
    );
  });

  it("sends an admin status update to the feedback endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: { id: "fb-1", status: "Closed" } }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(updateFeedbackStatus({ role: "admin" }, "fb-1", "Closed"))
      .resolves.toMatchObject({ feedback: { status: "Closed" } });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/feedback/fb-1/status", expect.objectContaining({
      method: "PATCH",
      headers: expect.objectContaining({ "x-user-role": "admin" }),
      body: JSON.stringify({ status: "Closed" }),
    }));
  });
});
