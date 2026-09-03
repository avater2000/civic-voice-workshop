import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, login, submitFeedback } from "./api";
import { createApp } from "../../server/app.js";
import { createDb } from "../../server/lib/db.js";

async function createClientApiHarness() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-client-api-"));
  const db = await createDb(path.join(directory, "db.json"));
  const app = await createApp({ db });

  vi.stubGlobal("fetch", async (url, options = {}) => {
    const target = new URL(url);
    const method = (options.method ?? "GET").toLowerCase();
    let response = request(app)[method](`${target.pathname}${target.search}`);

    for (const [name, value] of Object.entries(options.headers ?? {})) {
      response = response.set(name, value);
    }
    if (options.body) response = response.send(JSON.parse(options.body));
    const result = await response;
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  });

  return { db };
}

describe("client API and CivicVoice API integration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("supports switching from citizen to admin sign-in modes", async () => {
    await createClientApiHarness();

    const citizenSession = await login({ nric: "S0000001A", password: "citizen123", role: "citizen" });
    expect(citizenSession.user).toMatchObject({ role: "citizen", nric: "S0000001A" });

    const adminSession = await login({ nric: "S0000002B", password: "admin123", role: "admin" });
    expect(adminSession.user).toMatchObject({ role: "admin", nric: "S0000002B" });
  });

  it("submits citizen feedback through the client API and returns a reference", async () => {
    const { db } = await createClientApiHarness();
    const session = await login({ nric: "S0000001A", password: "citizen123", role: "citizen" });

    const response = await submitFeedback({
      nric: session.user.nric,
      name: session.user.name,
      category: "Environment",
      message: "Please add a recycling bin near the playground.",
    });

    expect(response.feedback).toMatchObject({ category: "Environment", status: "New" });
    expect(response.feedback.reference).toMatch(/^CV-\d{6}$/);
    expect(db.data.feedback[0]).toMatchObject({ id: response.feedback.id, message: response.feedback.message });
  });

  it("surfaces structured API validation errors to the client", async () => {
    await createClientApiHarness();

    await expect(submitFeedback({
      nric: "S0000001A", name: "Aisha Rahman", category: "Estate", message: " \n ",
    })).rejects.toMatchObject({
      name: "Error", status: 400, code: "INVALID_FEEDBACK",
      message: "Please enter feedback that is more than spaces or line breaks.",
    });
    await expect(submitFeedback({
      nric: "S0000001A", name: "Aisha Rahman", category: "Estate", message: " \n ",
    })).rejects.toBeInstanceOf(ApiError);
  });
});
