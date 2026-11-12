"use client";

import { createPortal } from "react-dom";
import {
  cloneElement,
  isValidElement,
  useId,
  useLayoutEffect,
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

type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TriggerProps = {
  "aria-describedby"?: string;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
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

type TooltipPosition = { left: number; top: number };

function mergeIds(...values: (string | undefined)[]) {
  const ids = values.flatMap((value) => value?.split(/\s+/) ?? []);
  return [...new Set(ids.filter(Boolean))].join(" ") || undefined;
}

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
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
  });
  const tooltipContent = content ?? label;
  const visible = Boolean(tooltipContent) && (hovered || focused);

  useLayoutEffect(() => {
    if (!visible) return;
    const updatePosition = () => {
      const target = triggerRef.current?.getBoundingClientRect();
      const bubble = tooltipRef.current?.getBoundingClientRect();
      if (!target || !bubble) return;
      const edge = 12;
      const gap = 8;
      let left = target.left + target.width / 2 - bubble.width / 2;
      let top = target.top - bubble.height - gap;
      if (placement === "bottom") top = target.bottom + gap;
      if (placement === "left") {
        left = target.left - bubble.width - gap;
        top = target.top + target.height / 2 - bubble.height / 2;
      }
      if (placement === "right") {
        left = target.right + gap;
        top = target.top + target.height / 2 - bubble.height / 2;
      }
      left = Math.max(
        edge,
        Math.min(left, window.innerWidth - bubble.width - edge),
      );
      top = Math.max(
        edge,
        Math.min(top, window.innerHeight - bubble.height - edge),
      );
      setPosition({ left, top });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [placement, visible]);

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setFocused(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") setFocused(false);
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
        aria-describedby={mergeIds(triggerDescribedBy, descriptionId)}
        onBlur={(event) => {
          onTriggerBlur?.(event);
          handlers.onBlur(event);
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
          if (event.pointerType === "touch") setHovered((current) => !current);
        }}
        onPointerEnter={(event: PointerEvent<HTMLButtonElement>) => {
          onTriggerPointerEnter?.(event);
          if (event.pointerType !== "touch") setHovered(true);
        }}
        onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
          onTriggerPointerLeave?.(event);
          if (event.pointerType !== "touch") setHovered(false);
        }}
        ref={(element) => {
          triggerRef.current = element;
          if (typeof triggerExternalRef === "function")
            triggerExternalRef(element);
          else if (triggerExternalRef) triggerExternalRef.current = element;
        }}
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
        {...handlers}
      >
        {children}
      </Trigger>
    );
  } else if (isValidElement<TriggerProps>(children)) {
    const child = children as ReactElement<TriggerProps>;
    const childRef = child.props.ref;
    trigger = cloneElement(child, {
      "aria-describedby": mergeIds(
        child.props["aria-describedby"],
        descriptionId,
      ),
      onBlur: (event) => {
        child.props.onBlur?.(event);
        handlers.onBlur(event);
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
      ref: (element: HTMLElement | null) => {
        triggerRef.current = element;
        if (typeof childRef === "function") childRef(element);
        else if (childRef) childRef.current = element;
      },
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
              data-placement={placement}
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
