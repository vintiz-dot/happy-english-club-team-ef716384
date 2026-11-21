import { useEffect } from "react";
import { AppLoader } from "@/components/AppLoader";
import { navProgress } from "@/lib/navProgress";

/** The route-level Suspense fallback: the usual loader, and it tells the progress bar a page is still loading. */
export function RouteFallback() {
  useEffect(() => {
    navProgress.suspend();
    return () => navProgress.resume();
  }, []);
  return <AppLoader />;
}
