import { useSyncExternalStore } from "react";

/**
 * The element overlays must portal into so they stay visible in fullscreen.
 *
 * Only the fullscreen element and its descendants are painted while the page is
 * in fullscreen, so popovers, dialogs, menus, selects and tooltips portalled to
 * document.body are invisible there. Reading `document.fullscreenElement` while
 * a wrapper renders is not enough: opening an overlay re-renders Radix's
 * internals, not the wrapper, so the value was the one from before fullscreen
 * started. This hook SUBSCRIBES to `fullscreenchange`, so every wrapper using it
 * re-renders when fullscreen starts or ends.
 *
 * Returns undefined when nothing is fullscreen, and Radix then portals to
 * document.body exactly as it does without a container. Also undefined when the
 * fullscreen element cannot hold children (an iframe or a video went
 * fullscreen by itself): portalling into it would render nothing.
 */

type FsDocument = Document & { webkitFullscreenElement?: Element | null };

const CANNOT_HOLD_CHILDREN = new Set(["IFRAME", "VIDEO", "IMG", "CANVAS", "OBJECT", "EMBED", "AUDIO"]);

function currentFullscreenElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const d = document as FsDocument;
  const el = d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
  if (!(el instanceof HTMLElement) || CANNOT_HOLD_CHILDREN.has(el.tagName)) return null;
  return el;
}

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

const serverSnapshot = () => null;

export function useFullscreenContainer(): HTMLElement | undefined {
  return useSyncExternalStore(subscribe, currentFullscreenElement, serverSnapshot) ?? undefined;
}
