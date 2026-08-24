import { useCallback, useEffect, useState } from "react";

/**
 * Tracks the rendered width of a container element via ResizeObserver, so
 * charts can size their SVG to fit the card responsively instead of using a
 * fixed pixel width.
 *
 * Uses a CALLBACK ref (stored in state), not a plain useRef + one-time
 * useEffect. A plain ref combined with an empty-deps effect only sets up
 * the observer once, at first mount -- if the ref-bearing element isn't in
 * the tree yet on that very first render (e.g. it's behind a "still
 * loading" branch, which is the normal case for every chart here, since
 * data always starts as null while its fetch is in flight), the effect
 * finds `ref.current === null`, bails out, and never runs again: width
 * stays stuck at 0 forever even once the real element mounts later. A
 * callback ref re-fires this hook's effect (via the `node` state it
 * updates) every time the DOM node actually changes, however many renders
 * that takes.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [node]);

  return { ref, width };
}
