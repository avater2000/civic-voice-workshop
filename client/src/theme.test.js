import { describe, expect, it } from "vitest";
import { getInitialTheme, saveTheme, THEME_STORAGE_KEY } from "./theme";

function createStorage(value = null) {
  const values = new Map(value ? [[THEME_STORAGE_KEY, value]] : []);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, next) => values.set(key, next) };
}

describe("theme preference", () => {
  it("uses the operating system preference when no choice is saved", () => {
    expect(getInitialTheme(createStorage(), true)).toBe("dark");
    expect(getInitialTheme(createStorage(), false)).toBe("light");
  });

  it("restores a saved choice over the operating system preference", () => {
    expect(getInitialTheme(createStorage("light"), true)).toBe("light");
  });

  it("only persists supported themes", () => {
    const storage = createStorage();
    saveTheme(storage, "dark");
    saveTheme(storage, "unexpected");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
