import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { createDb } from "./lib/db.js";
import { isFeedbackCategory } from "./lib/categories.js";
import { createLoginRateLimiter } from "./lib/login-rate-limiter.js";
import { verifyPassword } from "./lib/passwords.js";
import { sendError } from "./lib/errors.js";

export async function createApp(options = {}) {
  const db = options.db ?? (await createDb());
  const loginRateLimiter = options.loginRateLimiter ?? createLoginRateLimiter(options.loginRateLimitOptions);
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "civic-voice-api" });
  });

  app.post("/api/login", (req, res) => {
    const { nric, password, role } = req.body ?? {};
    const rateLimitKey = req.ip;
    const user = db.data.users.find(
      (candidate) => candidate.nric === nric && candidate.role === role && verifyPassword(password, candidate.passwordHash),
    );
    if (!user) {
      const retryAfter = loginRateLimiter.isLimited(rateLimitKey);
      if (retryAfter) {
        res.set("Retry-After", String(retryAfter));
        return sendError(res, 429, "RATE_LIMITED", `Too many failed sign-in attempts. Try again in ${retryAfter} seconds.`);
      }
      loginRateLimiter.recordFailure(rateLimitKey);
      return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid NRIC, password, or sign-in mode.");
    }

    loginRateLimiter.clear(rateLimitKey);

    // Workshop baseline only: this is deliberately not a production session.
    const token = Buffer.from(`${user.nric}:${user.role}`).toString("base64");
    return res.json({ token, user: { nric: user.nric, name: user.name, role: user.role } });
  });

  app.get("/api/feedback", (req, res) => {
    if (req.header("x-user-role") !== "admin") {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }
    let feedback = [...db.data.feedback].sort(
      (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
    );
    if (req.query.category) {
      feedback = feedback.filter((item) => item.category === req.query.category);
    }
    if (req.query.status) {
      feedback = feedback.filter((item) => item.status === req.query.status);
    }
    return res.json({ feedback });
  });

  app.post("/api/feedback", async (req, res) => {
    const { nric, name, message, category } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return sendError(res, 400, "INVALID_FEEDBACK", "Please enter feedback that is more than spaces or line breaks.");
    }
    if (!isFeedbackCategory(category)) {
      return sendError(res, 400, "INVALID_CATEGORY", "Choose a valid feedback category.");
    }
    const feedback = {
      id: crypto.randomUUID(), reference: `CV-${crypto.randomInt(100000, 1000000)}`, nric, name, message, category, status: "New",
      createdAt: new Date().toISOString(),
    };
    db.data.feedback.unshift(feedback);
    await db.write();
    return res.status(201).json({ feedback });
  });

  app.use((_req, res) => sendError(res, 404, "NOT_FOUND", "API route not found."));

  return app;
}
