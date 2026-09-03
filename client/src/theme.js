export const THEME_STORAGE_KEY = "civicvoice-theme";

const themes = new Set(["light", "dark"]);

export function getInitialTheme(storage, prefersDark) {
  const savedTheme = storage?.getItem(THEME_STORAGE_KEY);
  if (themes.has(savedTheme)) return savedTheme;
  return prefersDark ? "dark" : "light";
}

export function saveTheme(storage, theme) {
  if (themes.has(theme)) storage?.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(document, theme) {
  document.documentElement.dataset.theme = theme;
}
