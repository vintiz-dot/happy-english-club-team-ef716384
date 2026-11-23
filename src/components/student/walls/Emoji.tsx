import type { ReactNode } from "react";
import { useWallBand } from "./useWallBand";

/** A decorative emoji. A teenager's pages carry none (brief G5), so it draws nothing there. */
export function Emoji({ children }: { children: ReactNode }) {
  const { teen } = useWallBand();
  return teen ? null : <span aria-hidden="true">{children}</span>;
}
