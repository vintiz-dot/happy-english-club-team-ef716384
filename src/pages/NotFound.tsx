import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useIvory } from "@/hooks/useIvory";

const NotFound = () => {
  const location = useLocation();
  // The 404 answers every unknown path, so no route list can name it: it keeps
  // today's look until its path is listed or the rollout is complete (R24).
  const ivory = useIvory();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className={ivory ? "flex min-h-screen items-center justify-center bg-hec-paper px-4 py-8 text-hec-ink" : "flex min-h-screen items-center justify-center bg-gray-100"}>
      <div className={ivory ? "w-full max-w-md rounded-hec-lg border border-hec-line bg-hec-surface p-6 text-center shadow-hec-1 sm:p-8" : "text-center"}>
        <h1 className={ivory ? "mb-2 font-display text-hec-display font-medium tabular-nums text-hec-ink" : "mb-4 text-4xl font-bold"}>404</h1>
        <p className={ivory ? "mb-6 text-hec-body text-hec-ink-soft" : "mb-4 text-xl text-gray-600"}>Oops! Page not found</p>
        <a href="/" className={ivory ? "inline-flex min-h-hec-target items-center justify-center rounded-hec-md bg-hec-action px-6 text-hec-body font-medium text-hec-on-action transition-colors duration-hec-1 ease-hec hover:bg-hec-action/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "text-blue-500 underline hover:text-blue-700"}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
