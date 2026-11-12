"use client";

import { Select, type SelectOption } from "./select.js";
import type { ReactNode } from "react";

export type ContextSwitcherOption = SelectOption;

export type ContextSwitcherProps = {
  label: string;
  options: readonly ContextSwitcherOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  form?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  submitOnSelect?: boolean;
  footer?: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function ContextSwitcher(props: ContextSwitcherProps) {
  return <Select {...props} variant="context" />;
}
