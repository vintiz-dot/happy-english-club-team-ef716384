/**
 * BrassEdge - a 1 px brass sheen on a card's border (Brass material, s.9b).
 *
 * With a mouse the sheen follows the pointer along the border; on a touch
 * screen it sweeps once across the border when the card is pressed. It
 * extends SpotlightCard's technique: the pointer position goes into CSS
 * variables on the element (--mx / --my), never into React state, and only
 * `transform` and `opacity` move. It is light on the edge, not a halo and not
 * a gradient behind the content: a ring one pixel wide is cut from a moving
 * spot with a mask.
 *
 * Only at motion level "full": pointer-following light is dropped in "calm"
 * and "off", where the wrapper is a plain element.
 *
 * Wrap a card: `<BrassEdge className="rounded-hec-lg"><Card/></BrassEdge>`
 * (give it the same radius as the card).
 */
import { useRef, type HTMLAttributes, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { dur, useMotionLevel } from "./motion";

const SPOT = 140; // px, the lit spot that the 1 px ring is cut from

export function BrassEdge({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const full = useMotionLevel() === "full";
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const spot = useRef<HTMLSpanElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  // Touch has no hover: sweep once along the border on press.
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    const el = root.current;
    const r = ring.current;
    const s = spot.current;
    if (!el || !r || !s || typeof r.animate !== "function") return;
    const { width, height } = el.getBoundingClientRect();
    const y = height / 2 - SPOT / 2;
    const ms = dur.page * 1000;
    r.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms });
    s.animate(
      [{ transform: `translate(${-SPOT}px, ${y}px)` }, { transform: `translate(${width}px, ${y}px)` }],
      { duration: ms, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  };

  return (
    <div
      ref={root}
      onPointerMove={full ? onMove : undefined}
      onPointerDown={full ? onDown : undefined}
      className={cn("group/brass relative rounded-hec-lg", className)}
      {...rest}
    >
      {children}
      {full && (
        <span
          ref={ring}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-0 transition-opacity duration-hec-1 ease-hec group-hover/brass:opacity-100"
          style={{
            borderRadius: "inherit",
            padding: 1,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            maskComposite: "exclude",
          }}
        >
          <span
            ref={spot}
            className="absolute left-0 top-0 block rounded-full"
            style={{
              width: SPOT,
              height: SPOT,
              transform: `translate(calc(var(--mx, -999px) - ${SPOT / 2}px), calc(var(--my, -999px) - ${SPOT / 2}px))`,
              background: "radial-gradient(circle at center, hsl(var(--hec-brass)) 0%, hsl(var(--hec-brass) / 0) 70%)",
            }}
          />
        </span>
      )}
    </div>
  );
}
