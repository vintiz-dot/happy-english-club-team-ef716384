import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hec-paper px-4 py-8 text-hec-ink">
      <div className="w-full max-w-md rounded-hec-lg border border-hec-line bg-hec-surface p-6 text-center shadow-hec-1 sm:p-8">
        <h1 className="mb-2 font-display text-hec-display font-medium tabular-nums text-hec-ink">404</h1>
        <p className="mb-6 text-hec-body text-hec-ink-soft">Oops! Page not found</p>
        <a href="/" className="inline-flex min-h-hec-target items-center justify-center rounded-hec-md bg-hec-action px-6 text-hec-body font-medium text-hec-on-action transition-colors duration-hec-1 ease-hec hover:bg-hec-action/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
