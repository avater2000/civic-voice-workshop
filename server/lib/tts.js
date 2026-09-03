export function createSpeechSynthesizer({
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl = globalThis.fetch,
} = {}) {
  return async function synthesizeSpeech(input) {
    if (!apiKey) {
      const error = new Error("Audio playback is not configured.");
      error.code = "TTS_UNAVAILABLE";
      throw error;
    }

    const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "alloy", input }),
    });
    if (!response.ok) {
      const error = new Error("Audio playback could not be created.");
      error.code = "TTS_FAILED";
      throw error;
    }
    return Buffer.from(await response.arrayBuffer());
  };
}
