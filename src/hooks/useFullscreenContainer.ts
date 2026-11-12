import { useCallback, useState, useSyncExternalStore, type MutableRefObject, type Ref } from "react";

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

/**
 * The container for one overlay's content, plus a ref to put on that content.
 *
 * Like useFullscreenContainer, with one difference: content that is OPEN in the
 * fullscreen element when fullscreen ends stays where it is (that element is
 * back in the normal page, so it is still visible) instead of being moved to
 * document.body. Moving it would unmount and remount it - losing what was typed
 * into a dialog and, for a tooltip, re-running its entry. The held element is
 * released when the content closes, so the next open goes to document.body.
 * With no fullscreen ever, this returns undefined, exactly as before.
 */
export function useOverlayContainer<T extends HTMLElement = HTMLElement>(
  forwardedRef?: Ref<T>,
): [HTMLElement | undefined, (node: T | null) => void] {
  const live = useFullscreenContainer();
  const [held, setHeld] = useState<HTMLElement | null>(null);
  const contentRef = useCallback(
    (node: T | null) => {
      // mounted: remember the fullscreen element it was mounted in (null outside fullscreen);
      // unmounted (closed): release it
      setHeld(node ? currentFullscreenElement() : null);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as MutableRefObject<T | null>).current = node;
    },
    [forwardedRef],
  );
  const container = live ?? (held && held.isConnected ? held : undefined);
  return [container, contentRef];
}
