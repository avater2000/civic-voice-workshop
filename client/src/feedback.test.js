import { describe, expect, it } from "vitest";
import { limitFeedbackLength, MAX_FEEDBACK_LENGTH } from "./feedback";

describe("feedback length limit", () => {
  it("preserves feedback at or below the maximum", () => {
    const message = "a".repeat(MAX_FEEDBACK_LENGTH);

    expect(limitFeedbackLength(message)).toBe(message);
  });

  it("truncates feedback that exceeds the maximum", () => {
    expect(limitFeedbackLength("a".repeat(MAX_FEEDBACK_LENGTH + 1))).toHaveLength(MAX_FEEDBACK_LENGTH);
  });
});
