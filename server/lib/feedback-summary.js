const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export class SummaryUnavailableError extends Error {}

export function createFeedbackSummarizer({
  apiKey = process.env.OPENAI_API_KEY,
  fetchImplementation = fetch,
  model = "gpt-4.1-mini",
} = {}) {
  return async function summarizeFeedback(message) {
    if (!apiKey) throw new SummaryUnavailableError("OPENAI_API_KEY is not configured.");

    const response = await fetchImplementation(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: "Summarize the feedback in exactly one concise sentence. Do not add labels or commentary.",
        input: message,
        max_output_tokens: 80,
      }),
    });
    if (!response.ok) throw new SummaryUnavailableError("OpenAI summary request failed.");

    const { output_text: outputText } = await response.json();
    const summary = outputText?.replace(/\s+/g, " ").trim();
    if (!summary) throw new SummaryUnavailableError("OpenAI did not return a summary.");
    return summary;
  };
}
