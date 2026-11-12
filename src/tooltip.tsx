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
import { mergeAriaDescriptionIds } from "./aria.js";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

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

type TooltipPosition = {
  left: number;
  top: number;
  placement: TooltipPlacement;
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
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
    placement,
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
      const availableSpace: Record<TooltipPlacement, number> = {
        top: target.top - edge - gap,
        bottom: window.innerHeight - target.bottom - edge - gap,
        left: target.left - edge - gap,
        right: window.innerWidth - target.right - edge - gap,
      };
      const requiredSpace: Record<TooltipPlacement, number> = {
        top: bubble.height,
        bottom: bubble.height,
        left: bubble.width,
        right: bubble.width,
      };
      const opposite: Record<TooltipPlacement, TooltipPlacement> = {
        top: "bottom",
        bottom: "top",
        left: "right",
        right: "left",
      };
      const candidates = [
        placement,
        opposite[placement],
        ...(placement === "top" || placement === "bottom"
          ? (["right", "left"] as const)
          : (["top", "bottom"] as const)),
      ];
      const resolvedPlacement =
        candidates.find(
          (candidate) => availableSpace[candidate] >= requiredSpace[candidate],
        ) ??
        candidates.reduce((best, candidate) =>
          availableSpace[candidate] > availableSpace[best] ? candidate : best,
        );
      let left = target.left + target.width / 2 - bubble.width / 2;
      let top = target.top - bubble.height - gap;
      if (resolvedPlacement === "bottom") top = target.bottom + gap;
      if (resolvedPlacement === "left") {
        left = target.left - bubble.width - gap;
        top = target.top + target.height / 2 - bubble.height / 2;
      }
      if (resolvedPlacement === "right") {
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
      setPosition((current) => {
        if (
          current.placement === resolvedPlacement &&
          Math.abs(current.left - left) < 0.5 &&
          Math.abs(current.top - top) < 0.5
        ) {
          return current;
        }
        return { left, top, placement: resolvedPlacement };
      });
    };

    let activeTransitions = 0;
    let animationFrame: number | null = null;
    const trackPosition = () => {
      updatePosition();
      if (activeTransitions > 0) {
        animationFrame = window.requestAnimationFrame(trackPosition);
      } else {
        animationFrame = null;
      }
    };
    const eventIncludesTrigger = (event: Event) =>
      event.target instanceof Element &&
      (event.target === triggerRef.current ||
        event.target.contains(triggerRef.current));
    const onTransitionRun = (event: Event) => {
      if (!eventIncludesTrigger(event)) return;
      activeTransitions += 1;
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(trackPosition);
      }
    };
    const onTransitionFinish = (event: Event) => {
      if (!eventIncludesTrigger(event)) return;
      activeTransitions = Math.max(0, activeTransitions - 1);
      updatePosition();
      if (activeTransitions === 0 && animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePosition);
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    if (tooltipRef.current) resizeObserver?.observe(tooltipRef.current);
    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    document.addEventListener("transitionrun", onTransitionRun, true);
    document.addEventListener("transitionend", onTransitionFinish, true);
    document.addEventListener("transitioncancel", onTransitionFinish, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("transitionrun", onTransitionRun, true);
      document.removeEventListener("transitionend", onTransitionFinish, true);
      document.removeEventListener(
        "transitioncancel",
        onTransitionFinish,
        true,
      );
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [placement, visible]);

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
