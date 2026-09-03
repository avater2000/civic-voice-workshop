import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { createDb } from "./lib/db.js";
import { isFeedbackCategory } from "./lib/categories.js";
import { createLoginRateLimiter } from "./lib/login-rate-limiter.js";
import { verifyPassword } from "./lib/passwords.js";
import { sendError } from "./lib/errors.js";
import { toCsv } from "./lib/csv.js";
import { normalizeFeedbackText } from "./lib/feedback-text.js";
import { createFeedbackSummarizer } from "./lib/feedback-summary.js";

function getFilteredFeedback(feedback, { category, status, query }) {
  let filtered = [...feedback].sort(
    (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
  );
  if (category) filtered = filtered.filter((item) => item.category === category);
  if (status) filtered = filtered.filter((item) => item.status === status);
  const searchTerm = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (searchTerm) {
    filtered = filtered.filter((item) => `${item.name} ${item.message}`.toLowerCase().includes(searchTerm));
  }
  return filtered;
}

const FEEDBACK_STATUSES = new Set(["New", "In review", "Closed"]);
const FEEDBACK_PAGE_SIZE = 10;

function isAdminRequest(req) {
  return req.header("x-user-role") === "admin";
}

function paginateFeedback(feedback, requestedPage) {
  const total = feedback.length;
  const totalPages = Math.max(1, Math.ceil(total / FEEDBACK_PAGE_SIZE));
  const parsedPage = Number.parseInt(requestedPage, 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, totalPages)
    : 1;
  const start = (page - 1) * FEEDBACK_PAGE_SIZE;
  return {
    feedback: feedback.slice(start, start + FEEDBACK_PAGE_SIZE),
    pagination: { page, pageSize: FEEDBACK_PAGE_SIZE, total, totalPages },
  };
}

export async function createApp(options = {}) {
  const db = options.db ?? (await createDb());
  const loginRateLimiter = options.loginRateLimiter ?? createLoginRateLimiter(options.loginRateLimitOptions);
  const summarizeFeedback = options.summarizeFeedback ?? createFeedbackSummarizer();
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
    if (!isAdminRequest(req)) {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }
    const feedback = getFilteredFeedback(db.data.feedback, req.query);
    return res.json(paginateFeedback(feedback, req.query.page));
  });

  app.get("/api/feedback/export.csv", (req, res) => {
    if (!isAdminRequest(req)) {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }
    const feedback = getFilteredFeedback(db.data.feedback, req.query);
    const rows = [
      ["Reference", "Name", "Identifier", "Category", "Status", "Submitted at", "Feedback"],
      ...feedback.map((item) => [item.reference, item.name, item.nric, item.category, item.status, item.createdAt, item.message]),
    ];
    res.type("text/csv");
    res.attachment("civicvoice-feedback.csv");
    return res.send(toCsv(rows));
  });

  app.patch("/api/feedback/:id/status", async (req, res) => {
    if (!isAdminRequest(req)) {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }

    const { status } = req.body ?? {};
    if (!FEEDBACK_STATUSES.has(status)) {
      return sendError(res, 400, "INVALID_STATUS", "Choose a valid feedback status.");
    }

    const feedback = db.data.feedback.find((item) => item.id === req.params.id);
    if (!feedback) return sendError(res, 404, "NOT_FOUND", "Feedback not found.");

    feedback.status = status;
    await db.write();
    return res.json({ feedback });
  });

  app.get("/api/feedback/:id", (req, res) => {
    if (!isAdminRequest(req)) {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }
    const feedback = db.data.feedback.find((item) => item.id === req.params.id);
    if (!feedback) {
      return sendError(res, 404, "FEEDBACK_NOT_FOUND", "Feedback was not found.");
  }
    return res.json({ feedback });
  });

  app.post("/api/feedback/:id/summary", async (req, res) => {
    if (!isAdminRequest(req)) {
      return sendError(res, 403, "FORBIDDEN", "Admin access required.");
    }
    const feedback = db.data.feedback.find((item) => item.id === req.params.id);
    if (!feedback) return sendError(res, 404, "FEEDBACK_NOT_FOUND", "Feedback was not found.");
    if (feedback.message.length <= 200) {
      return sendError(res, 400, "SUMMARY_NOT_REQUIRED", "Only feedback longer than 200 characters can be summarized.");
    }
    if (feedback.summary) return res.json({ summary: feedback.summary, cached: true });

    try {
      const summary = await summarizeFeedback(feedback.message);
      feedback.summary = summary;
      await db.write();
      return res.json({ summary, cached: false });
    } catch {
      return sendError(res, 503, "SUMMARY_UNAVAILABLE", "Summary could not be generated. The original feedback remains available.");
    }
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
      id: crypto.randomUUID(), reference: `CV-${crypto.randomInt(100000, 1000000)}`, nric, name, message: normalizeFeedbackText(message), category, status: "New",
      createdAt: new Date().toISOString(),
    };
    db.data.feedback.unshift(feedback);
    await db.write();
    return res.status(201).json({ feedback });
  });

  app.use((_req, res) => sendError(res, 404, "NOT_FOUND", "API route not found."));

  return app;
}
