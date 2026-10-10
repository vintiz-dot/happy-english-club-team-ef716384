/**
 * The full-screen wait: route-level Suspense, the startup guard, and the
 * access check.
 *
 * This is the one people see most often without realising it — every
 * navigation to a lazily-loaded page passes through here — so it is the
 * one most worth getting right. The shape comes from the shared loading
 * language in components/ui/loading.tsx; this file only owns the fact
 * that it fills the viewport and paints the background, because it can
 * render before any layout does.
 */
import { PageLoading } from "@/components/ui/loading";

interface AppLoaderProps {
  message?: string;
}

export function AppLoader({ message = "Loading" }: AppLoaderProps) {
  return (
    <div className="grid min-h-screen w-full place-items-center bg-background">
      <PageLoading message={message} />
    </div>
  );
}
