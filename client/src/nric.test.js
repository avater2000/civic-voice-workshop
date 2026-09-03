import { describe, expect, it } from "vitest";
import { isValidWorkshopNric } from "./nric";

describe("workshop NRIC validation", () => {
  it("accepts the seeded workshop IDs", () => {
    expect(isValidWorkshopNric("S0000001A")).toBe(true);
    expect(isValidWorkshopNric("S0000002B")).toBe(true);
  });

  it("rejects missing and malformed IDs", () => {
    expect(isValidWorkshopNric("")).toBe(false);
    expect(isValidWorkshopNric("not-an-id")).toBe(false);
  });
});
