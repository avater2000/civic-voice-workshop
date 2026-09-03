import { describe, expect, it } from "vitest";
import { removeSession, restoreSession, saveSession } from "./session";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("saved sessions", () => {
  it("restores a saved session", () => {
    const storage = createStorage();
    const session = { user: { name: "Aisha Rahman", role: "citizen" } };

    saveSession(storage, session);

    expect(restoreSession(storage)).toEqual(session);
  });

  it("clears the session on sign out", () => {
    const storage = createStorage();
    saveSession(storage, { user: { role: "admin" } });

    removeSession(storage);

    expect(restoreSession(storage)).toBeNull();
  });
});
