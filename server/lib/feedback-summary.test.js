import { describe, expect, it, vi } from "vitest";
import { createFeedbackSummarizer, SummaryUnavailableError } from "./feedback-summary.js";

describe("OpenAI feedback summarizer", () => {
  it("sends a server-side Responses API request and returns normalized output", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "  The walkway lights need a later timer.\n" }),
    });
    const summarize = createFeedbackSummarizer({ apiKey: "test-key", fetchImplementation, model: "test-model" });

    await expect(summarize("The lights turn off early. ".repeat(12))).resolves.toBe("The walkway lights need a later timer.");
    expect(fetchImplementation).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
    }));
  });

  it("does not call the API when no server key is configured", async () => {
    const fetchImplementation = vi.fn();
    const summarize = createFeedbackSummarizer({ apiKey: "", fetchImplementation });

    await expect(summarize("Long feedback")).rejects.toBeInstanceOf(SummaryUnavailableError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
