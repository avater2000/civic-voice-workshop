import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FeedbackText } from "./FeedbackText";

describe("feedback text", () => {
  it("renders feedback as text rather than HTML", () => {
    const markup = renderToStaticMarkup(createElement(FeedbackText, {
      message: '<img src=x onerror="alert(1)">',
    }));

    expect(markup).toBe("<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>");
    expect(markup).not.toContain("<img");
  });
});
