import { Select } from "./select.js";

export type ThemeChoice = "system" | "light" | "dark";

type ThemeSelectProps = {
  value: ThemeChoice;
  onChange: (value: ThemeChoice) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  form?: string;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function ThemeSelect({
  value,
  onChange,
  label = "Theme",
  className = "",
  disabled,
  form,
  id,
  name,
  required,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ThemeSelectProps) {
  return (
    <Select
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel ?? "Color theme"}
      aria-labelledby={ariaLabelledBy}
      className={`pf-component pf-theme-select ${className}`.trim()}
      disabled={disabled}
      form={form}
      id={id}
      label={label}
      name={name}
      onValueChange={(nextValue) => onChange(nextValue as ThemeChoice)}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      required={required}
      value={value}
      variant="compact"
    />
  );
}
