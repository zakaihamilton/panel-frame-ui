"use client";

import { createPortal } from "react-dom";
import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type SelectOption = {
  value: string;
  label: ReactNode;
  searchLabel?: string;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  kind?: "option" | "action";
};

export type SelectVariant = "default" | "compact" | "context";
export type SelectAlign = "start" | "end";

type PopupPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type SelectProps = {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: ReactNode;
  placeholder?: ReactNode;
  name?: string;
  form?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: SelectVariant;
  align?: SelectAlign;
  submitOnSelect?: boolean;
  footer?: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};

function optionText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(optionText).join("");
  if (isValidElement<{ children?: ReactNode }>(value))
    return optionText(value.props.children);
  return "";
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  placeholder = "Choose an option",
  name,
  form,
  id,
  required = false,
  disabled = false,
  className = "",
  variant = "default",
  align = "start",
  submitOnSelect = false,
  footer,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const labelId = `${triggerId}-label`;
  const valueId = `${triggerId}-value`;
  const listboxId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const typeaheadRef = useRef({ value: "", at: 0 });
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? options.find((option) => !option.disabled)?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const selectedValue = value ?? uncontrolledValue;
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );
  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isDisabled =
    disabled ||
    options.length === 0 ||
    options.every((option) => option.disabled);
  const invalidState =
    ariaInvalid === true || ariaInvalid === "true" || invalid;

  const findEnabledIndex = useCallback(
    (start: number, direction: 1 | -1) => {
      if (options.length === 0) return -1;
      for (let offset = 0; offset < options.length; offset += 1) {
        const index =
          (start + offset * direction + options.length) % options.length;
        if (!options[index]?.disabled) return index;
      }
      return -1;
    },
    [options],
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const edge = 12;
    const minWidth = variant === "context" ? 240 : 176;
    const width = Math.min(
      Math.max(rect.width, minWidth),
      window.innerWidth - edge * 2,
    );
    const below = window.innerHeight - rect.bottom - edge;
    const above = rect.top - edge;
    const desiredHeight = Math.min(Math.max(options.length * 48 + 8, 56), 320);
    const openAbove = below < desiredHeight && above > below;
    const maxHeight = Math.max(
      56,
      Math.min(desiredHeight, openAbove ? above : below),
    );
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const left = Math.max(
      edge,
      Math.min(preferredLeft, window.innerWidth - width - edge),
    );
    setPosition({
      left,
      top: openAbove
        ? Math.max(edge, rect.top - maxHeight - 6)
        : rect.bottom + 6,
      width,
      maxHeight,
    });
  }, [align, options.length, variant]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const update = () => updatePosition();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !rootRef.current?.contains(target) &&
        !document.getElementById(listboxId)?.parentElement?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [listboxId, open]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView?.({
        block: "nearest",
      });
  }, [activeIndex, listboxId, open]);

  function openMenu(
    startIndex = selectedIndex >= 0 ? selectedIndex : 0,
    direction: 1 | -1 = 1,
  ) {
    if (isDisabled) return;
    const nextIndex = findEnabledIndex(startIndex, direction);
    if (nextIndex < 0) return;
    setActiveIndex(nextIndex);
    setPosition(null);
    setOpen(true);
  }

  function chooseOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (value === undefined) setUncontrolledValue(option.value);
    setInvalid(false);
    setOpen(false);
    if (option.value !== selectedValue || option.kind === "action") {
      onValueChange?.(option.value);
    }
    if (submitOnSelect && option.value !== selectedValue) {
      if (nativeSelectRef.current) nativeSelectRef.current.value = option.value;
      rootRef.current?.closest("form")?.requestSubmit();
    }
    triggerRef.current?.focus();
  }

  function moveActive(direction: 1 | -1) {
    const nextIndex = findEnabledIndex(activeIndex + direction, direction);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (open) moveActive(direction);
      else
        openMenu(
          selectedIndex >= 0
            ? selectedIndex
            : direction === 1
              ? 0
              : options.length - 1,
          direction,
        );
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const start = event.key === "Home" ? 0 : options.length - 1;
      const direction = event.key === "Home" ? 1 : -1;
      const nextIndex = findEnabledIndex(start, direction);
      if (nextIndex >= 0) {
        setActiveIndex(nextIndex);
        setOpen(true);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) chooseOption(activeIndex);
      else openMenu();
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      typeaheadRef.current = { value: "", at: 0 };
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      typeaheadRef.current = { value: "", at: 0 };
      return;
    }
    if (
      event.key.length !== 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const now = Date.now();
    const previous = typeaheadRef.current;
    const key = event.key.toLocaleLowerCase();
    const previousValue = now - previous.at > 700 ? "" : previous.value;
    const repeated =
      previousValue.length > 0 &&
      [...previousValue].every((char) => char === key);
    const prefix = repeated ? key : previousValue + key;
    typeaheadRef.current = { value: prefix, at: now };
    const startIndex = open ? activeIndex : Math.max(selectedIndex, -1);
    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (startIndex + offset + options.length) % options.length;
      const option = options[index];
      const text = (
        option?.searchLabel ?? optionText(option?.label).trim()
      ).toLocaleLowerCase();
      if (option && !option.disabled && text.startsWith(prefix)) {
        event.preventDefault();
        setActiveIndex(index);
        setOpen(true);
        return;
      }
    }
  }

  const popup =
    open && position && typeof document !== "undefined" ? (
      <div
        aria-label={`${typeof label === "string" ? label : (ariaLabel ?? "Select")} options`}
        className="pf-select-popup"
        role="region"
        style={{
          left: position.left,
          maxHeight: position.maxHeight,
          top: position.top,
          width: position.width,
        }}
      >
        <div
          aria-label={typeof label === "string" ? label : ariaLabel}
          className="pf-select-listbox"
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => {
            const selected = option.value === selectedValue;
            const isActive = index === activeIndex;
            return (
              <div
                aria-disabled={option.disabled || undefined}
                aria-selected={selected}
                className={`pf-select-option${option.kind === "action" ? " pf-select-option-action" : ""}${isActive ? " is-active" : ""}`}
                id={`${listboxId}-option-${index}`}
                key={option.value}
                onClick={() => chooseOption(index)}
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
              >
                {option.icon ? (
                  <span className="pf-select-option-icon">{option.icon}</span>
                ) : null}
                <span className="pf-select-option-copy">
                  <span className="pf-select-option-label">{option.label}</span>
                  {option.description ? (
                    <span className="pf-select-option-description">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <span aria-hidden="true" className="pf-select-check">
                    ✓
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {footer ? <div className="pf-select-footer">{footer}</div> : null}
      </div>
    ) : null;

  return (
    <div className={`pf-select-field ${className}`.trim()}>
      {label ? (
        <label
          className={
            variant === "context"
              ? "pf-select-label pf-visually-hidden"
              : "pf-select-label"
          }
          htmlFor={triggerId}
          id={labelId}
        >
          {label}
        </label>
      ) : null}
      <div
        className={`pf-select pf-select-${variant}`}
        data-invalid={invalidState ? "true" : undefined}
        ref={rootRef}
      >
        <button
          aria-activedescendant={
            open ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-controls={open ? listboxId : undefined}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalidState || undefined}
          aria-label={ariaLabel}
          aria-labelledby={
            ariaLabel
              ? undefined
              : (ariaLabelledBy ??
                (label ? `${labelId} ${valueId}` : undefined))
          }
          aria-required={required || undefined}
          className="pf-select-trigger"
          disabled={isDisabled}
          id={triggerId}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="none"
          ref={triggerRef}
          type="button"
        >
          {variant === "context" ? (
            <span className="pf-select-context-value" id={valueId}>
              {selectedOption?.icon ? (
                <span aria-hidden="true" className="pf-select-current-icon">
                  {selectedOption.icon}
                </span>
              ) : null}
              <span className="pf-select-current-copy">
                <strong>{selectedOption?.label ?? placeholder}</strong>
                {selectedOption?.description ? (
                  <small>{selectedOption.description}</small>
                ) : null}
              </span>
            </span>
          ) : (
            <span className="pf-select-current-value" id={valueId}>
              {selectedOption?.icon ? (
                <span aria-hidden="true" className="pf-select-current-icon">
                  {selectedOption.icon}
                </span>
              ) : null}
              <span>{selectedOption?.label ?? placeholder}</span>
            </span>
          )}
          <svg
            aria-hidden="true"
            className="pf-select-chevron"
            data-open={open ? "true" : "false"}
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        <select
          aria-hidden="true"
          className="pf-select-native"
          disabled={isDisabled}
          form={form}
          name={name}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus();
          }}
          ref={nativeSelectRef}
          required={required}
          tabIndex={-1}
          value={
            options.some((option) => option.value === selectedValue)
              ? selectedValue
              : ""
          }
          onChange={(event) => {
            if (value === undefined) setUncontrolledValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
        >
          <option value="">
            {typeof placeholder === "string" ? placeholder : ""}
          </option>
          {options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.searchLabel ?? optionText(option.label)}
            </option>
          ))}
        </select>
      </div>
      {popup && createPortal(popup, document.body)}
    </div>
  );
}
