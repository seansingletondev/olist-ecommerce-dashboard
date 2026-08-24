import { useEffect, useRef, useState } from "react";

/**
 * Tracks the rendered width of a container element via ResizeObserver, so
 * charts can size their SVG to fit the card responsively instead of using a
 * fixed pixel width (which would either overflow on small screens or waste
 * space on large ones).
 */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
