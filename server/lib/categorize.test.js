import { describe, expect, it, vi } from "vitest";
import { createFeedbackCategorizer, fallbackCategory } from "./categorize.js";

describe("feedback categorization", () => {
  it("uses deterministic keyword categories without an API key", async () => {
    const categorize = createFeedbackCategorizer({ apiKey: "" });

    await expect(categorize("The bus stop needs shade.")).resolves.toBe("Transport");
    await expect(categorize("Please plant more trees.")).resolves.toBe("Environment");
    await expect(categorize("The lift is broken.")).resolves.toBe("Estate");
    expect(fallbackCategory("Thank you for the event.")).toBe("Other");
  });

  it("uses a mocked server-side OpenAI response when a key is configured", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: '{"category":"Environment"}' }),
    });
    const categorize = createFeedbackCategorizer({ apiKey: "test-key", fetchFn, model: "test-model" });

    await expect(categorize("The litter needs clearing.")).resolves.toBe("Environment");
    expect(fetchFn).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      body: expect.stringContaining('"model":"test-model"'),
    }));
  });

  it("falls back deterministically when the model request fails", async () => {
    const categorize = createFeedbackCategorizer({ apiKey: "test-key", fetchFn: vi.fn().mockResolvedValue({ ok: false }) });

    await expect(categorize("The MRT station is crowded.")).resolves.toBe("Transport");
  });
});
