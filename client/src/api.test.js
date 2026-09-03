import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getFeedback, getFeedbackCsv, getFeedbackDetail, getHealthStatus, login, updateFeedbackStatus } from "./api";

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

    await expect(getFeedback({ token: "session-token", user: { role: "admin" } }, { category: "Estate", status: "In review" })).resolves.toEqual({ feedback: [] });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback?category=Estate&status=In+review",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-token" }) }),
    );
  });

  it("includes the requested inbox page with active filters", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ feedback: [], pagination: {} }) });
    vi.stubGlobal("fetch", fetch);

    await getFeedback({ token: "session-token", user: { role: "admin" } }, { category: "Estate", page: 2 });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback?category=Estate&page=2",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-token" }) }),
    );
  });

  it("requests CSV with all active filters and the admin token", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["csv"]) });
    vi.stubGlobal("fetch", fetch);

    await expect(getFeedbackCsv({ token: "session-token", user: { role: "admin" } }, { category: "Estate", status: "New", query: "bench" })).resolves.toBeInstanceOf(Blob);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback/export.csv?category=Estate&status=New&query=bench",
      { headers: { Authorization: "Bearer session-token" } },
    );
  });

  it("sends an admin status update to the feedback endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: { id: "fb-1", status: "Closed" } }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(updateFeedbackStatus({ token: "session-token", user: { role: "admin" } }, "fb-1", "Closed"))
      .resolves.toMatchObject({ feedback: { status: "Closed" } });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/feedback/fb-1/status", expect.objectContaining({
      method: "PATCH",
      headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
      body: JSON.stringify({ status: "Closed" }),
    }));
  });

  it("requests a selected feedback record with the admin token", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ feedback: { id: "feedback/1" } }) });
    vi.stubGlobal("fetch", fetch);

    await expect(getFeedbackDetail({ token: "session-token", user: { role: "admin" } }, "feedback/1")).resolves.toEqual({ feedback: { id: "feedback/1" } });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/feedback/feedback%2F1",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-token" }) }),
    );
  });

  it("uses the server-issued token for admin feedback requests", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: [] }),
    });
    vi.stubGlobal("fetch", fetch);

    await getFeedback({ token: "session-token", user: { role: "admin" } });

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/feedback", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
    }));
  });
});
