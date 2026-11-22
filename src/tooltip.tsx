"use client";

import { createPortal } from "react-dom";
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
  type ReactNode,
  type ComponentProps,
} from "react";
import { mergeAriaDescriptionIds } from "./aria.js";
import { mergeRefs } from "./internal/mergeRefs.js";
import {
  useTooltipPosition,
  type TooltipPlacement,
} from "./internal/useFloatingPosition.js";

type TriggerProps = {
  "aria-describedby"?: string;
  title?: string;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  ref?: Ref<HTMLElement>;
  tabIndex?: number;
};

type TooltipProps = {
  content?: ReactNode;
  label?: string;
  children?: ReactNode;
  placement?: TooltipPlacement;
  targetElement?: "span" | "div";
  targetClassName?: string;
  wrapperClassName?: string;
  targetRole?: "img";
  targetAriaLabel?: string;
  targetTabIndex?: number;
  triggerProps?: Omit<ComponentProps<"button">, "children">;
};

export function Tooltip({
  content,
  label,
  children,
  placement = "top",
  targetElement,
  targetClassName = "",
  wrapperClassName,
  targetRole,
  targetAriaLabel,
  targetTabIndex = 0,
  triggerProps,
}: TooltipProps) {
  const tooltipId = useId();
  const descriptionId = `${tooltipId}-description`;
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const tooltipContent = content ?? label;
  const visible = Boolean(tooltipContent) && (hovered || focused);
  const position = useTooltipPosition({
    visible,
    placement,
    triggerRef,
    tooltipRef,
  });

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setFocused(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") setFocused(false);
  }

  function handleClick() {
    setHovered(false);
    setFocused(false);
  }

  function handleMouseEnter() {
    setHovered(true);
  }

  function handleMouseLeave() {
    setHovered(false);
  }

  const handlers = {
    onBlur: handleBlur,
    onFocus: () => setFocused(true),
    onKeyDown: handleKeyDown,
    onMouseEnter: () => handleMouseEnter(),
    onMouseLeave: () => handleMouseLeave(),
  };

  let trigger: ReactNode;
  if (triggerProps) {
    const {
      "aria-describedby": triggerDescribedBy,
      onBlur: onTriggerBlur,
      onClick: onTriggerClick,
      onFocus: onTriggerFocus,
      onKeyDown: onTriggerKeyDown,
      onMouseEnter: onTriggerMouseEnter,
      onMouseLeave: onTriggerMouseLeave,
      onPointerDown: onTriggerPointerDown,
      onPointerEnter: onTriggerPointerEnter,
      onPointerLeave: onTriggerPointerLeave,
      ref: triggerExternalRef,
      ...buttonProps
    } = triggerProps;
    trigger = (
      <button
        {...buttonProps}
        aria-describedby={mergeAriaDescriptionIds(
          triggerDescribedBy,
          descriptionId,
        )}
        title={undefined}
        onBlur={(event) => {
          onTriggerBlur?.(event);
          handlers.onBlur(event);
        }}
        onClick={(event) => {
          onTriggerClick?.(event);
          handleClick();
        }}
        onFocus={(event) => {
          onTriggerFocus?.(event);
          handlers.onFocus();
        }}
        onKeyDown={(event) => {
          onTriggerKeyDown?.(event);
          handlers.onKeyDown(event);
        }}
        onMouseEnter={(event) => {
          onTriggerMouseEnter?.(event);
          handlers.onMouseEnter();
        }}
        onMouseLeave={(event) => {
          onTriggerMouseLeave?.(event);
          handlers.onMouseLeave();
        }}
        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
          onTriggerPointerDown?.(event);
        }}
        onPointerEnter={(event: PointerEvent<HTMLButtonElement>) => {
          onTriggerPointerEnter?.(event);
          if (event.pointerType !== "touch") setHovered(true);
        }}
        onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
          onTriggerPointerLeave?.(event);
          if (event.pointerType !== "touch") setHovered(false);
        }}
        ref={mergeRefs<HTMLElement, HTMLButtonElement>(
          triggerRef,
          triggerExternalRef,
        )}
      >
        {children ?? <span aria-hidden="true">i</span>}
      </button>
    );
  } else if (!children) {
    trigger = (
      <button
        aria-describedby={descriptionId}
        aria-label={`Help: ${label ?? (typeof tooltipContent === "string" ? tooltipContent : "More information")}`}
        className={`pf-tooltip-help ${targetClassName}`.trim()}
        onBlur={handlers.onBlur}
        onClick={handleClick}
        onFocus={handlers.onFocus}
        onKeyDown={handlers.onKeyDown}
        onMouseEnter={handlers.onMouseEnter}
        onMouseLeave={handlers.onMouseLeave}
        ref={(element) => {
          triggerRef.current = element;
        }}
        type="button"
      >
        <span aria-hidden="true">i</span>
      </button>
    );
  } else if (targetElement) {
    const Trigger = targetElement;
    trigger = (
      <Trigger
        aria-describedby={descriptionId}
        aria-label={targetAriaLabel}
        className={`pf-tooltip-trigger ${targetClassName}`.trim()}
        ref={(element: HTMLElement | null) => {
          triggerRef.current = element;
        }}
        role={targetRole}
        tabIndex={targetTabIndex}
        title={undefined}
        onClick={handleClick}
        {...handlers}
      >
        {children}
      </Trigger>
    );
  } else if (isValidElement<TriggerProps>(children)) {
    const child = children as ReactElement<TriggerProps>;
    const childRef = child.props.ref;
    trigger = cloneElement(child, {
      "aria-describedby": mergeAriaDescriptionIds(
        child.props["aria-describedby"],
        descriptionId,
      ),
      title: undefined,
      onBlur: (event) => {
        child.props.onBlur?.(event);
        handlers.onBlur(event);
      },
      onClick: (event) => {
        child.props.onClick?.(event);
        handleClick();
      },
      onFocus: (event) => {
        child.props.onFocus?.(event);
        handlers.onFocus();
      },
      onKeyDown: (event) => {
        child.props.onKeyDown?.(event);
        handlers.onKeyDown(event);
      },
      onMouseEnter: (event) => {
        child.props.onMouseEnter?.(event);
        handlers.onMouseEnter();
      },
      onMouseLeave: (event) => {
        child.props.onMouseLeave?.(event);
        handlers.onMouseLeave();
      },
      ref: mergeRefs(triggerRef, childRef),
    });
  } else {
    trigger = (
      <span
        aria-describedby={descriptionId}
        className={`pf-tooltip-trigger ${targetClassName}`.trim()}
        ref={(element) => {
          triggerRef.current = element;
        }}
        tabIndex={targetTabIndex}
        {...handlers}
      >
        {children}
      </span>
    );
  }

  const triggerContent = (
    <>
      {trigger}
      <span className="pf-visually-hidden" id={descriptionId}>
        {tooltipContent}
      </span>
    </>
  );

  return (
    <>
      {wrapperClassName ? (
        <span className={wrapperClassName}>{triggerContent}</span>
      ) : (
        triggerContent
      )}
      {visible && typeof document !== "undefined"
        ? createPortal(
            <span
              aria-hidden="true"
              className="pf-tooltip"
              data-placement={position.placement}
              ref={tooltipRef}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
            >
              {tooltipContent}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
