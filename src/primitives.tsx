import {
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { mergeAriaDescriptionIds } from "./aria.js";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`pf-button pf-button-${variant} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={`pf-card ${className}`.trim()} {...props} />;
}

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  return (
    <span
      className={`pf-badge pf-badge-${tone} ${className}`.trim()}
      {...props}
    />
  );
}

export function Alert({
  tone = "info",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "success" | "warning" | "error";
}) {
  return (
    <div
      className={`pf-alert pf-alert-${tone} ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="pf-field" htmlFor={fieldId}>
      <span className="pf-field-label">{label}</span>
      {children({
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint ? (
        <span className="pf-field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="pf-field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextField({
  label,
  hint,
  error,
  id,
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(fieldProps) => (
        <input
          {...fieldProps}
          {...inputProps}
          aria-describedby={mergeAriaDescriptionIds(
            fieldProps["aria-describedby"],
            ariaDescribedBy,
          )}
          aria-invalid={error ? true : ariaInvalid}
          className={`pf-input ${className}`.trim()}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...selectProps
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(fieldProps) => (
        <select
          {...fieldProps}
          {...selectProps}
          aria-describedby={mergeAriaDescriptionIds(
            fieldProps["aria-describedby"],
            ariaDescribedBy,
          )}
          aria-invalid={error ? true : ariaInvalid}
          className={`pf-input pf-select ${className}`.trim()}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="pf-empty-state">
      <h2>{title}</h2>
      {description ? (
        <div className="pf-empty-description">{description}</div>
      ) : null}
      {action ? <div className="pf-empty-action">{action}</div> : null}
    </section>
  );
}

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`pf-skeleton ${className}`.trim()}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="pf-page-header">
      <div className="pf-page-heading">
        {eyebrow ? <p className="pf-page-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? (
          <p className="pf-page-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="pf-page-actions">{actions}</div> : null}
    </header>
  );
}
