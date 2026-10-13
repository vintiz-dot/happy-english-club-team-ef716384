/**
 * The canvas the three display boards are drawn on, and the fonts they
 * need.
 *
 * All three were designed at exactly 1920x1080 with absolute positioning
 * throughout, so rather than fight that into a fluid layout — which would
 * mean three separate responsive rewrites and three chances to get a
 * child's name clipped — the board is rendered at its true size and
 * scaled to fit whatever box it is given. One transform, no reflow, and
 * the design is pixel-for-pixel what was drawn.
 *
 * The trade is honest and bounded: below roughly a tablet the scale makes
 * text too small to read, so the caller falls back to the classic board.
 * That decision lives in StyledClassBoard, not here.
 *
 * Fonts are the other reason this file exists. Between them the three
 * styles want six Google fonts, and this app loads none today. Loading
 * all six on every page would be a real cost paid by every student on a
 * phone for a board they are not looking at, so each style's pair is
 * injected the first time that style actually renders, and then left in
 * place — removing it on unmount would re-flash the text on every
 * remount.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BoardStyle } from "./types";

export const BOARD_W = 1920;
export const BOARD_H = 1080;

/* --------------------------------------------------------------- fonts */

const FONT_HREF: Partial<Record<BoardStyle, string>> = {
  star: "https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Baloo+2:wght@600;700;800&display=swap",
  arcade: "https://fonts.googleapis.com/css2?family=Bungee&family=Lexend:wght@400;600;700;800&display=swap",
  night: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Saira+Condensed:wght@500;600;700;800&display=swap",
};

const loaded = new Set<BoardStyle>();

function useBoardFont(style: BoardStyle) {
  useEffect(() => {
    const href = FONT_HREF[style];
    if (!href || loaded.has(style)) return;
    loaded.add(style);

    // Preconnect once; without it the CSS round trip and the font round
    // trip are serial, which is the difference between a flash and a
    // visible wait on a classroom projector over school wifi.
    if (!document.querySelector('link[data-board-preconnect]')) {
      for (const origin of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
        const pre = document.createElement("link");
        pre.rel = "preconnect";
        pre.href = origin;
        if (origin.includes("gstatic")) pre.crossOrigin = "anonymous";
        pre.setAttribute("data-board-preconnect", "");
        document.head.appendChild(pre);
      }
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-board-font", style);
    document.head.appendChild(link);
  }, [style]);
}

/* --------------------------------------------------------------- frame */

/**
 * Scales a fixed 1920x1080 child to fit its container, keeping the
 * aspect ratio and centring what is left over.
 */
export function BoardFrame({
  style,
  children,
  className,
  /** Fills the viewport instead of sitting in the page flow. */
  fullscreen = false,
}: {
  style: BoardStyle;
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
}) {
  useBoardFont(style);

  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width <= 0) return;
      // Height is only a constraint in fullscreen; in the page flow the
      // frame takes whatever height the scaled board needs.
      const s = fullscreen
        ? Math.min(width / BOARD_W, height / BOARD_H)
        : width / BOARD_W;
      setScale(s);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [fullscreen]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative w-full overflow-hidden",
        fullscreen ? "h-full" : "",
        className,
      )}
      style={fullscreen ? undefined : { height: scale ? BOARD_H * scale : undefined }}
    >
      {/* Until the first measurement the board would render at full size
          and blow out the layout for a frame, so it waits. */}
      {scale > 0 && (
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
