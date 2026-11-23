/**
 * showSeal(label) - the Seal for a completion whose own screen has already closed (docs/EXPERIENCE_DESIGN_BRIEF.md C3).
 * The attendance drawer closes the moment its save succeeds, so a Seal drawn inside it would never be seen. This
 * draws the same Seal in a small paper card at the top of the screen, outside any React tree, for about two
 * seconds, and takes itself away. Call it only AFTER a save that succeeded. It reads and writes no data, takes no
 * focus and never covers a tap (pointer-events none); the label is announced to a screen reader as it appears.
 */
import { createRoot } from "react-dom/client";
import { Seal } from "@/components/fx/Seal";

const SHOW_MS = 2200;

export function showSeal(label: string, options?: { sound?: boolean }) {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("data-hec-seal", "");
  host.className = "pointer-events-none fixed left-1/2 top-4 z-[80] whitespace-nowrap -translate-x-1/2 rounded-hec-lg border border-hec-line bg-hec-raised px-4 py-2 shadow-hec-3";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<Seal show label={label} visibleLabel size={36} sound={options?.sound !== false} />);
  window.setTimeout(() => {
    root.unmount();
    host.remove();
  }, SHOW_MS);
}
