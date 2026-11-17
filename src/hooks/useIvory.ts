import { createContext, useContext } from "react";

/**
 * True while the current screen is in the "Ivory" design system
 * (src/lib/ivoryScope.ts decides; <IvoryScope> provides it). Since R24 that is
 * every route except OUTSIDE_ROUTES (the recorder and audit clips), so only
 * what those two pages can render still reads it: the shared primitives, the
 * staff shell, the classroom tools, the announcements. Outside a provider
 * (tests, the offline screen) and in print copies it is false and they keep
 * the old classes.
 */
export const IvoryContext = createContext(false);

export const useIvory = () => useContext(IvoryContext);
