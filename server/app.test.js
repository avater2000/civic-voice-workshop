import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./lib/db.js";

async function testApp(options = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
  const db = await createDb(path.join(directory, "db.json"));
  return createApp({ db, ...options });
}

describe("CivicVoice baseline API", () => {
  it("creates a missing datastore directory on first use", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const db = await createDb(path.join(directory, "missing", "data", "db.json"));
    expect(db.data.users).toHaveLength(2);
  });

  it("logs in the seeded citizen", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/login").send({
      nric: "S0000001A", password: "citizen123", role: "citizen",
    });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("citizen");
  });

  it("rate-limits repeated failed sign-ins without blocking correct credentials", async () => {
    const app = await testApp({ loginRateLimitOptions: { maxFailures: 2, windowMs: 60_000 } });
    const invalidLogin = { nric: "S0000001A", password: "wrong-password", role: "citizen" };

    await expect(request(app).post("/api/login").send(invalidLogin)).resolves.toMatchObject({ status: 401 });
    await expect(request(app).post("/api/login").send(invalidLogin)).resolves.toMatchObject({ status: 401 });

    const limited = await request(app).post("/api/login").send(invalidLogin);
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(limited.body.error).toMatch(/too many failed/i);

    const validLogin = await request(app).post("/api/login").send({
      nric: "S0000001A", password: "citizen123", role: "citizen",
    });
    expect(validLogin.status).toBe(200);
  });

  it("stores only password hashes while keeping the seeded credentials usable", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const file = path.join(directory, "db.json");
    const db = await createDb(file);
    const app = await createApp({ db });

    expect(db.data.users).toEqual(expect.arrayContaining([
      expect.objectContaining({ passwordHash: expect.any(String) }),
    ]));
    expect(db.data.users.every((user) => !("password" in user))).toBe(true);

    const response = await request(app).post("/api/login").send({
      nric: "S0000002B", password: "admin123", role: "admin",
    });
    expect(response.status).toBe(200);
  });

  it("accepts feedback with a supported category", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/feedback").send({
      nric: "S0000001A", name: "Aisha Rahman", message: "Please add more benches.", category: "Estate",
    });
    expect(response.status).toBe(201);
    expect(response.body.feedback.message).toBe("Please add more benches.");
    expect(response.body.feedback.reference).toMatch(/^CV-\d{6}$/);
    expect(response.body.feedback.reference).not.toBe(response.body.feedback.id);
    expect(response.body.feedback.category).toBe("Estate");
  });

  it("rejects blank and whitespace-only feedback", async () => {
    const app = await testApp();

    for (const message of ["", "  \n\t "]) {
      const response = await request(app).post("/api/feedback").send({
        nric: "S0000001A", name: "Aisha Rahman", message,
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/more than spaces/i);
    }
  });

  it("rejects feedback without a supported category", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/feedback").send({
      nric: "S0000001A", name: "Aisha Rahman", message: "Please add more benches.", category: "General",
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Choose a valid feedback category.");
  });

  it("blocks the feedback list without the admin role header", async () => {
    const app = await testApp();
    const response = await request(app).get("/api/feedback");
    expect(response.status).toBe(403);
  });

  it("returns feedback newest first when stored records are out of order", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const db = await createDb(path.join(directory, "db.json"));
    db.data.feedback = [
      { id: "old", createdAt: "2026-08-01T10:00:00.000Z" },
      { id: "new", createdAt: "2026-08-03T10:00:00.000Z" },
      { id: "middle", createdAt: "2026-08-02T10:00:00.000Z" },
    ];
    await db.write();
    const app = await createApp({ db });

    const response = await request(app).get("/api/feedback").set("x-user-role", "admin");

    expect(response.status).toBe(200);
    expect(response.body.feedback.map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });
});
