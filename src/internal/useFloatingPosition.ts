"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

const VIEWPORT_EDGE = 12;

export type SelectPopupPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipPosition = {
  left: number;
  top: number;
  placement: TooltipPlacement;
};

function clampToViewport(
  value: number,
  size: number,
  viewportSize: number,
  edge = VIEWPORT_EDGE,
): number {
  return Math.max(edge, Math.min(value, viewportSize - size - edge));
}

function useFloatingLayoutSync({
  active,
  onUpdate,
  triggerRef,
  floatingRef,
  observeResize = false,
  trackTransitions = false,
}: {
  active: boolean;
  onUpdate: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  floatingRef?: RefObject<HTMLElement | null>;
  observeResize?: boolean;
  trackTransitions?: boolean;
}) {
  useLayoutEffect(() => {
    if (!active) return;

    let activeTransitions = 0;
    let animationFrame: number | null = null;
    const trackPosition = () => {
      onUpdate();
      if (activeTransitions > 0) {
        animationFrame = window.requestAnimationFrame(trackPosition);
      } else {
        animationFrame = null;
      }
    };
    const eventIncludesTrigger = (event: Event) => {
      const trigger = triggerRef?.current;
      if (!trigger) return false;
      return (
        event.target instanceof Element &&
        (event.target === trigger || event.target.contains(trigger))
      );
    };
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
      onUpdate();
      if (activeTransitions === 0 && animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    const resizeObserver =
      observeResize && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onUpdate)
        : null;
    if (triggerRef?.current) resizeObserver?.observe(triggerRef.current);
    if (floatingRef?.current) resizeObserver?.observe(floatingRef.current);

    onUpdate();
    window.addEventListener("resize", onUpdate);
    document.addEventListener("scroll", onUpdate, true);
    if (trackTransitions) {
      document.addEventListener("transitionrun", onTransitionRun, true);
      document.addEventListener("transitionend", onTransitionFinish, true);
      document.addEventListener("transitioncancel", onTransitionFinish, true);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onUpdate);
      document.removeEventListener("scroll", onUpdate, true);
      if (trackTransitions) {
        document.removeEventListener("transitionrun", onTransitionRun, true);
        document.removeEventListener("transitionend", onTransitionFinish, true);
        document.removeEventListener(
          "transitioncancel",
          onTransitionFinish,
          true,
        );
      }
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [
    active,
    floatingRef,
    observeResize,
    onUpdate,
    trackTransitions,
    triggerRef,
  ]);
}

/**
 * Tracks viewport-clamped popup coordinates and max height for an open Select menu.
 */
export function useSelectPosition({
  open,
  triggerRef,
  optionCount,
  minWidth,
  align,
}: {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  optionCount: number;
  minWidth: number;
  align: "start" | "end";
}): [SelectPopupPosition | null, () => void] {
  const [position, setPosition] = useState<SelectPopupPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      Math.max(rect.width, minWidth),
      window.innerWidth - VIEWPORT_EDGE * 2,
    );
    const below = window.innerHeight - rect.bottom - VIEWPORT_EDGE;
    const above = rect.top - VIEWPORT_EDGE;
    const desiredHeight = Math.min(Math.max(optionCount * 48 + 8, 56), 320);
    const openAbove = below < desiredHeight && above > below;
    const maxHeight = Math.max(
      56,
      Math.min(desiredHeight, openAbove ? above : below),
    );
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const left = clampToViewport(preferredLeft, width, window.innerWidth);
    setPosition({
      left,
      top: openAbove
        ? Math.max(VIEWPORT_EDGE, rect.top - maxHeight - 6)
        : rect.bottom + 6,
      width,
      maxHeight,
    });
  }, [align, minWidth, optionCount, triggerRef]);

  useFloatingLayoutSync({
    active: open,
    onUpdate: updatePosition,
  });

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return [position, resetPosition];
}

/**
 * Tracks placement flipping and viewport-clamped coordinates for a visible Tooltip.
 */
export function useTooltipPosition({
  visible,
  placement,
  triggerRef,
  tooltipRef,
}: {
  visible: boolean;
  placement: TooltipPlacement;
  triggerRef: RefObject<HTMLElement | null>;
  tooltipRef: RefObject<HTMLElement | null>;
}): TooltipPosition {
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
    placement,
  });

  const updatePosition = useCallback(() => {
    const target = triggerRef.current?.getBoundingClientRect();
    const bubble = tooltipRef.current?.getBoundingClientRect();
    if (!target || !bubble) return;
    const gap = 8;
    const availableSpace: Record<TooltipPlacement, number> = {
      top: target.top - VIEWPORT_EDGE - gap,
      bottom: window.innerHeight - target.bottom - VIEWPORT_EDGE - gap,
      left: target.left - VIEWPORT_EDGE - gap,
      right: window.innerWidth - target.right - VIEWPORT_EDGE - gap,
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
    left = clampToViewport(left, bubble.width, window.innerWidth);
    top = clampToViewport(top, bubble.height, window.innerHeight);
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
  }, [placement, tooltipRef, triggerRef]);

  useFloatingLayoutSync({
    active: visible,
    onUpdate: updatePosition,
    triggerRef,
    floatingRef: tooltipRef,
    observeResize: true,
    trackTransitions: true,
  });

  return position;
}
