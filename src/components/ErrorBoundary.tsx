import { Component, type ErrorInfo, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { isChunkLoadError, recorderBusy, reloadForNewVersion } from "@/lib/chunkReload";

interface Props {
  children: ReactNode;
  /** A new value (the route) clears the error, so the side bar still works after one page failed. */
  resetKey?: string;
}

interface State {
  error: Error | null;
  /** A stale chunk: the same URL is being reloaded once. */
  reloading: boolean;
}

/**
 * 23 Nov 2026: this boundary used to send the browser to /dashboard (a full
 * page load that lands on Schedule) for ANY error - "Recovering... Redirecting
 * you to safety". The usual error was a lazy page chunk gone after a deploy,
 * and the full page load ended a lesson being recorded. Now it never leaves
 * the page by itself: a stale chunk reloads the same URL once (not while a
 * lesson is being recorded - then the teacher decides), anything else is
 * shown with Try again / Reload, and a change of route clears it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo.componentStack,
      buildHash: import.meta.env.VITE_BUILD_HASH || "unknown",
      chunk: isChunkLoadError(error),
      timestamp: new Date().toISOString(),
    });
    if (isChunkLoadError(error) && reloadForNewVersion()) this.setState({ reloading: true });
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, reloading: false });
  }

  private retry = () => this.setState({ error: null, reloading: false });

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    if (reloading) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center bg-background" role="status">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 motion-safe:animate-spin text-primary mx-auto" aria-hidden />
            <p className="text-lg font-semibold text-foreground">Loading the new version of this page...</p>
          </div>
        </div>
      );
    }
    const chunk = isChunkLoadError(error);
    const busy = recorderBusy();
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background p-4" role="alert">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {chunk ? "The app was updated: this page needs a reload" : "Something went wrong on this page"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {busy
              ? "A lesson is being recorded and it carries on. Reloading resumes the recording by itself after a few seconds; or press Back and reload after the lesson."
              : chunk ? "Reload to open it." : "Try again, or reload the page. You stay on this page."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!chunk ? <button type="button" className="h-10 rounded-md border px-4 text-sm font-semibold" onClick={this.retry}>Try again</button> : null}
            {this.props.resetKey !== undefined ? <button type="button" className="h-10 rounded-md border px-4 text-sm font-semibold" onClick={() => window.history.back()}>Back</button> : null}
            <button type="button" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => window.location.reload()}>
              {busy ? "Reload (the recording resumes)" : "Reload this page"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
