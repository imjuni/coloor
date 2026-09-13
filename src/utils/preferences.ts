export type Language = "ko" | "en";
export type Theme = "system" | "light" | "dark";

export const LANGUAGE_KEY = "coloor:language";
export const THEME_KEY = "coloor:theme";
export const PREFERENCE_EVENT = "coloor:preference-change";

export const getLanguage = (): Language => {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "ko" || saved === "en") {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
};

export const setLanguage = (language: Language): void => {
  localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: { language } }));
};

export const getTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
};

export const resolvedTheme = (theme = getTheme()): Exclude<Theme, "system"> => {
  if (theme !== "system") {
    return theme;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const applyTheme = (theme: Theme): void => {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = resolvedTheme(theme);
  document.documentElement.dataset.themePreference = theme;
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: { theme } }));
};
