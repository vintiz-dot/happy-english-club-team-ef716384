/**
 * A browser DOM for bun tests: jsdom, which DOMPurify itself is tested on.
 * (happy-dom was tried first: its NodeIterator does not keep the iterator's
 * root when the root is detached, so DOMPurify drops the first element of
 * every input there. Browsers and jsdom follow the DOM spec.)
 *
 * jsdom runs no scripts and fetches nothing by default (no `runScripts`, no
 * `resources: "usable"`), so an attack fixture cannot reach the network.
 */
import { JSDOM } from "jsdom";

const FORCED = [
  "window", "document", "navigator", "Node", "Element", "HTMLElement", "Text", "Comment", "Document", "DocumentFragment",
  "DOMParser", "XMLSerializer", "NodeFilter", "NodeIterator", "TreeWalker", "MutationObserver", "Range", "Selection",
  "getSelection", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "HTMLTemplateElement",
  "NamedNodeMap", "Event", "KeyboardEvent", "MouseEvent", "FocusEvent", "InputEvent", "CustomEvent", "UIEvent",
  "HTMLInputElement", "HTMLAnchorElement", "HTMLImageElement", "HTMLParagraphElement", "ShadowRoot", "CharacterData",
];

export function installDom(): () => void {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const w = dom.window as unknown as Record<string, unknown>;
  const g = globalThis as Record<string, unknown>;
  const saved = new Map<string, unknown>();
  for (const key of FORCED) {
    saved.set(key, g[key]);
    Object.defineProperty(g, key, { value: key === "window" ? dom.window : w[key], configurable: true, writable: true });
  }
  for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (key in g || key.startsWith("_")) continue;
    try {
      saved.set(key, undefined);
      g[key] = w[key];
    } catch {
      /* read-only on the window: skip */
    }
  }
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete g[key];
      else Object.defineProperty(g, key, { value, configurable: true, writable: true });
    }
    dom.window.close();
  };
}
