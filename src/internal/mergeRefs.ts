import type { Ref, RefCallback } from "react";

/**
 * Combines multiple React refs (callback refs or ref objects) into one callback ref.
 */
export function mergeRefs<T, U = T>(
  ...refs: Array<Ref<T> | Ref<U> | undefined>
): RefCallback<T & U> {
  return (element: (T & U) | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(element);
      } else {
        ref.current = element;
      }
    }
  };
}
