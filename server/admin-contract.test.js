import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./lib/db.js";

async function createContractApp() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-admin-contract-"));
  const db = await createDb(path.join(directory, "db.json"));
  return { app: await createApp({ db }), db };
}

async function signInAsAdmin(app) {
  const response = await request(app).post("/api/login").send({
    nric: "S0000002B", password: "admin123", role: "admin",
  });
  return response;
}

function adminHeaders(token) {
  return { authorization: `Bearer ${token}`, "x-user-role": "admin" };
}

describe("admin API contract", () => {
  it("returns the admin session contract from isolated fixture data", async () => {
    const { app, db } = await createContractApp();
    const response = await signInAsAdmin(app);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: { nric: "S0000002B", name: "Daniel Tan", role: "admin" },
    });
    expect(db.data.users).toHaveLength(2);
  });

  it("allows the authenticated admin to read the inbox response contract", async () => {
    const { app } = await createContractApp();
    const login = await signInAsAdmin(app);
    const response = await request(app).get("/api/feedback").set(adminHeaders(login.body.token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      feedback: expect.arrayContaining([
        expect.objectContaining({ id: "fb-seed-1", status: "New" }),
      ]),
      pagination: expect.objectContaining({ page: 1, pageSize: 10, total: 1 }),
    }));
  });

  it("returns a structured forbidden error when a citizen tries to read the inbox", async () => {
    const { app } = await createContractApp();
    const response = await request(app).get("/api/feedback").set("x-user-role", "citizen");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: "FORBIDDEN", message: "Admin access required." },
    });
  });
});
