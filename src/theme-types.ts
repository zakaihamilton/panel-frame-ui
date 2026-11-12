export type ThemePersistence =
  | { type: "localStorage"; key: string }
  | { type: "cookie"; name: string; maxAge?: number }
  | { type: "none" };

export type ThemeSystemMode = "system" | "resolved";
