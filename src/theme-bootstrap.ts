import type { ThemeChoice } from "./theme-select.js";
import type { ThemePersistence, ThemeSystemMode } from "./theme-types.js";

export function getThemeBootstrapScript(
  persistence: ThemePersistence,
  options: { initialTheme?: ThemeChoice; systemMode?: ThemeSystemMode } = {},
): string {
  const config = JSON.stringify({
    initialTheme: options.initialTheme ?? "system",
    persistence,
    systemMode: options.systemMode ?? "system",
  }).replaceAll("<", "\\u003c");

  return `(() => {
  const config = ${config};
  const valid = ["system", "light", "dark"];
  let choice = config.initialTheme;
  try {
    if (config.persistence.type === "localStorage") {
      const stored = localStorage.getItem(config.persistence.key);
      if (stored && valid.includes(stored)) choice = stored;
    } else if (config.persistence.type === "cookie") {
      const prefix = encodeURIComponent(config.persistence.name) + "=";
      const entry = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
      const stored = entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
      if (stored && valid.includes(stored)) choice = stored;
    }
  } catch {}
  let applied = choice;
  if (choice === "system" && config.systemMode === "resolved") {
    applied = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = applied;
})();`;
}
