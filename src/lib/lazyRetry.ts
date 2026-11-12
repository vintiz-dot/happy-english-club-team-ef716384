/**
 * React.lazy with one retry and a quiet failure.
 *
 * The app deploys often. A tab left open across a deploy still asks for the
 * old chunk file names, and those files are gone. A lazy boundary behind a
 * click (a classroom tool, an admin tab, a PDF button) would then look like a
 * dead button. So a failed import is tried once more; if it fails again the
 * user gets the "new version" toast and the slot renders nothing. Nothing is
 * thrown, so no error boundary swallows the page.
 */
import { lazy, type ComponentType } from "react";
import { toast } from "@/hooks/use-toast";

const RETRY_DELAY_MS = 400;

type Loader<T> = () => Promise<T>;

export function notifyNewVersion() {
  toast({
    title: "A new version is available",
    description: "Please reload the page to continue.",
  });
}

/** Run an import; on failure wait briefly and run it once more. Null = gave up (toast shown). */
export async function importWithRetry<T>(
  loader: Loader<T>,
  delayMs: number = RETRY_DELAY_MS,
): Promise<T | null> {
  try {
    return await loader();
  } catch {
    try {
      await new Promise((r) => setTimeout(r, delayMs));
      return await loader();
    } catch {
      notifyNewVersion();
      return null;
    }
  }
}

const Nothing = () => null;

export function lazyRetry<P extends object>(
  loader: Loader<{ default: ComponentType<P> }>,
) {
  return lazy(async () => {
    const mod = await importWithRetry(loader);
    return mod ?? { default: Nothing as ComponentType<P> };
  });
}
