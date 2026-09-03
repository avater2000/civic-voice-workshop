import { isFeedbackCategory } from "./categories.js";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

export function fallbackCategory(message) {
  const text = String(message).toLowerCase();
  if (/\b(bus|train|mrt|traffic|road|parking|bicycle)\b/.test(text)) return "Transport";
  if (/\b(tree|trees|litter|recycling|pollution|drain|park)\b/.test(text)) return "Environment";
  if (/\b(lift|block|walkway|bench|benches|estate|housing|void deck)\b/.test(text)) return "Estate";
  return "Other";
}

function categoryFromOutput(output) {
  try {
    const category = JSON.parse(output).category;
    return isFeedbackCategory(category) ? category : null;
  } catch {
    return isFeedbackCategory(output?.trim()) ? output.trim() : null;
  }
}

export function createFeedbackCategorizer({
  apiKey = process.env.OPENAI_API_KEY,
  fetchFn = globalThis.fetch,
  model = MODEL,
} = {}) {
  return async function categorizeFeedback(message) {
    const fallback = fallbackCategory(message);
    if (!apiKey || typeof fetchFn !== "function") return fallback;

    try {
      const response = await fetchFn("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: `Choose one category for this civic feedback: Estate, Transport, Environment, or Other. Return JSON only with a category field.\n\nFeedback: ${message}`,
          text: {
            format: {
              type: "json_schema",
              name: "feedback_category",
              strict: true,
              schema: {
                type: "object",
                properties: { category: { type: "string", enum: ["Estate", "Transport", "Environment", "Other"] } },
                required: ["category"],
                additionalProperties: false,
              },
            },
          },
        }),
      });
      if (!response.ok) return fallback;
      const result = await response.json();
      return categoryFromOutput(result.output_text) ?? fallback;
    } catch {
      return fallback;
    }
  };
}
