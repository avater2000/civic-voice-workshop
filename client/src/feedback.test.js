import { describe, expect, it } from "vitest";
import { hasFeedbackContent, limitFeedbackLength, MAX_FEEDBACK_LENGTH } from "./feedback";

describe("feedback length limit", () => {
  it("preserves feedback at or below the maximum", () => {
    const message = "a".repeat(MAX_FEEDBACK_LENGTH);

    expect(limitFeedbackLength(message)).toBe(message);
  });

  it("truncates feedback that exceeds the maximum", () => {
    expect(limitFeedbackLength("a".repeat(MAX_FEEDBACK_LENGTH + 1))).toHaveLength(MAX_FEEDBACK_LENGTH);
  });
});

describe("feedback content validation", () => {
  it("rejects empty and whitespace-only feedback", () => {
    expect(hasFeedbackContent("")).toBe(false);
    expect(hasFeedbackContent(" \n\t ")).toBe(false);
  });

  it("accepts useful feedback, including content with surrounding whitespace", () => {
    expect(hasFeedbackContent("  Please add more benches.  ")).toBe(true);
  });
});
