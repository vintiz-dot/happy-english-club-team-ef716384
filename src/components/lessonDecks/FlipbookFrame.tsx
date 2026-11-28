import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The flipbook is another site's page in a frame, so the app cannot reach into it.
 * Two things keep its ads off the class's screen:
 *
 * 1. The sandbox. The frame may run its own scripts and storage (needed to turn
 *    pages) but may never open pop-ups or new windows, navigate this tab away,
 *    show alert boxes or start downloads: pop-up and redirect ads are stopped.
 * 2. The crop. FlipBuilder's free hosting (online.flipbuilder.com) floats three
 *    Google ad panels over the book at fixed places: 160 px wide, 58 px in from
 *    the left and right edges, and 90 px high, 5 px above the bottom (measured
 *    28 Nov 2026). The frame is drawn that much wider and taller than the box
 *    and the box clips it, so those strips fall outside the screen while the book,
 *    centred and scaled to fit, stays whole. Only on a screen wide enough for the
 *    spread to fit in what is left (CROP_MIN_RATIO); on a narrow one nothing is
 *    cropped, because cutting the book would be worse than the ad.
 * The site's own toolbar along the top (page numbers, arrows) is never cropped.
 */
export const FLIPBOOK_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation";
export const FLIPBOOK_ALLOW = "fullscreen; autoplay; encrypted-media; clipboard-write; accelerometer; gyroscope";

/** How far past each edge the frame is drawn, for hosts whose ad places are known. */
export const AD_CROP: Record<string, { side: number; bottom: number }> = {
  "online.flipbuilder.com": { side: 58 + 160, bottom: 5 + 90 },
};
/** Crop only when the box is at least this much wider than tall (a two-page spread is about 1.65:1). */
export const CROP_MIN_RATIO = 1.7;

export function adCropFor(src: string, width: number, height: number): { side: number; bottom: number } | null {
  let host = "";
  try { host = new URL(src).host; } catch { return null; }
  const c = AD_CROP[host];
  if (!c || !width || !height) return null;
  return width / height >= CROP_MIN_RATIO ? c : null;
}

type FrameProps = { src: string; title: string; className?: string };

/** The flipbook frame, sandboxed and with known ad strips cropped away. `className` sizes the box. */
export function FlipbookFrame({ src, title, className }: FrameProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const crop = adCropFor(src, size.w, size.h);
  return (
    <div ref={box} className={`relative min-h-0 overflow-hidden ${className ?? "w-full flex-1 bg-white"}`} data-ad-crop={crop ? "on" : "off"}>
      <iframe
        src={src}
        title={title}
        className="absolute border-0 bg-white"
        style={crop
          ? { left: -crop.side, top: 0, width: `calc(100% + ${crop.side * 2}px)`, height: `calc(100% + ${crop.bottom}px)` }
          : { left: 0, top: 0, width: "100%", height: "100%" }}
        sandbox={FLIPBOOK_SANDBOX}
        allow={FLIPBOOK_ALLOW}
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

/** Browser full screen. Callers track whether they entered it, so they leave only what they entered. */
export function useFullscreen() {
  const [active, setActive] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const enter = useCallback(async (el?: Element | null) => {
    const target = el ?? document.documentElement;
    if (document.fullscreenElement === target) return true;
    try {
      if (!target.requestFullscreen) return false;
      await target.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch {
      return false; // no user gesture, or the browser refused: the book still fills the window
    }
  }, []);
  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try { await document.exitFullscreen(); } catch { /* already left */ }
  }, []);
  return { active, enter, exit };
}
