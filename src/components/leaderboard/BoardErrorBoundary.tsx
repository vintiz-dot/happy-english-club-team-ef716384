import { Component, type ReactNode } from "react";

/**
 * Keeps a board failure inside the board. Without it, an error in one of
 * the display styles takes down the whole page (and the toolkit with it).
 */
export class BoardErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Class board failed to render:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      this.props.fallback ?? (
        <div className="grid h-full min-h-[200px] place-items-center p-6 text-center text-sm text-muted-foreground">
          <div className="space-y-3">
            <p>The board couldn't be shown.</p>
            <button
              type="button"
              className="rounded-full border px-4 py-1.5 text-foreground"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    );
  }
}
