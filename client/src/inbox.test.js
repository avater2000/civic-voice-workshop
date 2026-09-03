import { describe, expect, it } from "vitest";
import { sortFeedbackNewestFirst } from "./inbox";

describe("inbox ordering", () => {
  it("sorts feedback newest first without changing the received array", () => {
    const feedback = [
      { id: "old", createdAt: "2026-08-01T10:00:00.000Z" },
      { id: "new", createdAt: "2026-08-03T10:00:00.000Z" },
      { id: "middle", createdAt: "2026-08-02T10:00:00.000Z" },
    ];

    expect(sortFeedbackNewestFirst(feedback).map((item) => item.id)).toEqual(["new", "middle", "old"]);
    expect(feedback.map((item) => item.id)).toEqual(["old", "new", "middle"]);
  });
});
