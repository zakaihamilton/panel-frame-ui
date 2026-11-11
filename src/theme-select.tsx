import type { SelectHTMLAttributes } from "react";

export type ThemeChoice = "system" | "light" | "dark";

export function ThemeSelect({
  value,
  onChange,
  className = "",
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: ThemeChoice;
  onChange: (value: ThemeChoice) => void;
}) {
  return (
    <label className={`pf-theme-select ${className}`.trim()}>
      <span>Theme</span>
      <select
        aria-label="Color theme"
        className="pf-input"
        onChange={(event) => onChange(event.target.value as ThemeChoice)}
        value={value}
        {...props}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
