import { describe, expect, it } from "vitest";
import { maskIdentifier } from "./identifier";

describe("identifier masking", () => {
  it("keeps only the first and final two characters of an NRIC-like ID", () => {
    expect(maskIdentifier("S0000001A")).toBe("S••••••1A");
  });

  it("does not expose malformed or missing identifiers", () => {
    expect(maskIdentifier("")).toBe("••••");
    expect(maskIdentifier(null)).toBe("••••");
    expect(maskIdentifier("S1A")).toBe("••••");
  });
});
