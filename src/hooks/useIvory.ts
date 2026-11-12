import { createContext, useContext } from "react";

/**
 * True while the current screen is in the "Ivory" design system
 * (src/lib/ivoryScope.ts decides; <IvoryScope> provides it). The shared
 * primitives and the shell read it to pick the new class strings; outside a
 * provider (tests, the offline screen) it is false and they keep the old ones.
 */
export const IvoryContext = createContext(false);

export const useIvory = () => useContext(IvoryContext);
