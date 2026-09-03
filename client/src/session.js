export const SESSION_STORAGE_KEY = "civic-voice-session";

export function restoreSession(storage) {
  try {
    const storedSession = storage.getItem(SESSION_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(storage, session) {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function removeSession(storage) {
  storage.removeItem(SESSION_STORAGE_KEY);
}
