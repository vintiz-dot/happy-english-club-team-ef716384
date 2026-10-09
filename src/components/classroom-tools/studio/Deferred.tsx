/**
 * Render a card's contents only once it is close to the viewport.
 *
 * The panel shows every tool on one scrolling canvas, which is what makes
 * it usable mid-lesson — no hunting through tabs. The cost is that the
 * data-backed tools (teams, attendance, the board, the assistant) would
 * otherwise all fire their queries the instant the panel opens, for cards
 * the teacher may never scroll to.
 *
 * So they wait. The placeholder is the same height as the real card, so
 * nothing jumps when it swaps in, and the margin means it has usually
 * loaded before it is on screen.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Deferred({
  minHeight = 260,
  wide,
  children,
}: {
  minHeight?: number;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (old Safari, jsdom): render immediately
    // rather than leaving a permanent placeholder.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [show]);

  if (show) return <>{children}</>;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "studio-card animate-pulse opacity-60",
        wide && "md:col-span-2 xl:col-span-3",
      )}
      style={{ minHeight }}
    />
  );
}
