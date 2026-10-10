/**
 * The app's loading language.
 *
 * There were around thirty different ways of saying "wait" in here: bare
 * `Loading...` text, a bordered circle, a graduation cap with a spinner
 * stuck to its corner. The dull ones were dull because they were an
 * afterthought at each call site rather than a decision made once.
 *
 * So this is the decision, made once. Four shapes, one motion:
 *
 *   Spinner   a mark on its own, for buttons and table cells
 *   Loading   a mark with a label, for a card or a section
 *   PageLoading  the whole screen, for a route that has not arrived
 *   Placeholder / PlaceholderText / PlaceholderCard
 *             content-shaped blocks, for when we know the shape already
 *
 * Prefer a placeholder over a spinner whenever the shape of what is
 * coming is known. A spinner says "something is happening somewhere"; a
 * placeholder says "a list of six things is about to appear here", and
 * the layout does not jump when it does.
 *
 * The motion lives in index.css under "Loading language", including the
 * reduced-motion handling, so every one of these honours that preference
 * without each call site thinking about it.
 */
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const MARK: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-20 w-20",
};

/* ------------------------------------------------------------------ mark */

/**
 * The sweep itself: a conic gradient on a rotating wrapper, masked into a
 * ring. A border-top circle is what every framework ships by default and
 * reads as exactly that, which is the whole complaint.
 */
export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: Size;
  className?: string;
  /** Announced to screen readers. Set it to something specific where you can. */
  label?: string;
}) {
  const ring = size === "sm" ? 2 : size === "md" ? 2.5 : 3;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("relative inline-block shrink-0", MARK[size], className)}
    >
      <span
        className="hec-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.12) 110deg, hsl(var(--primary)) 350deg)",
          // Punch the middle out, so it is a ring rather than a pie.
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
        }}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The emblem, for the two places big enough to carry it: the route
 * fallback and a full-section wait. The cap sits inside the ring and
 * breathes, instead of being pinned to the outside of it.
 */
function Emblem({ size = "xl" }: { size?: Size }) {
  const inner = size === "xl" ? "h-9 w-9" : "h-6 w-6";
  return (
    <span className={cn("relative grid place-items-center", MARK[size])}>
      <span
        className="absolute inset-0 rounded-full bg-primary/5"
        aria-hidden
      />
      <span
        className="hec-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.1) 120deg, hsl(var(--primary)) 350deg)",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
        }}
        aria-hidden
      />
      <GraduationCap className={cn("hec-breathe text-primary", inner)} aria-hidden />
    </span>
  );
}

/** Three dots that rise in sequence. Reads as "working", not "stuck". */
function Dots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="hec-rise h-1 w-1 rounded-full bg-current"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/* --------------------------------------------------------------- inline */

/**
 * A mark and a label, centred in whatever box it is given. The default
 * for a card or a panel.
 */
export function Loading({
  message,
  size = "md",
  className,
  emblem = false,
}: {
  message?: string;
  size?: Size;
  className?: string;
  /** Use the full emblem rather than the plain ring. For larger areas. */
  emblem?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-10", className)}
    >
      {emblem ? <Emblem size={size === "sm" ? "md" : "lg"} /> : <Spinner size={size} label={message ?? "Loading"} />}
      {message && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {message}
          <Dots />
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- page */

/**
 * The whole screen. This is the route-level fallback, so it is the first
 * thing anyone sees on a cold navigation — it should look like the app,
 * not like the app failing to start.
 */
export function PageLoading({
  message = "Loading",
  title,
}: {
  message?: string;
  title?: string;
}) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Emblem />
        <p className="mt-6 text-base font-semibold text-foreground">
          {title ?? "Happy English Club"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          {message}
          <Dots />
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- placeholders */

/** A single content-shaped block. */
export function Placeholder({ className }: { className?: string }) {
  return <div className={cn("hec-placeholder h-4 w-full", className)} aria-hidden />;
}

/**
 * Lines of text, the last one short — which is what a paragraph or a
 * label actually looks like, and why this reads as content rather than
 * as a grey box.
 */
export function PlaceholderText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Placeholder
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 && "w-2/5")}
        />
      ))}
    </div>
  );
}

/**
 * A stack of card-shaped placeholders, for a list whose rows all look
 * alike. `rows` should match what the screen usually shows, so the
 * eventual content lands roughly where the placeholder was.
 */
export function PlaceholderCard({
  rows = 3,
  className,
  children,
}: {
  rows?: number;
  className?: string;
  /** Replaces the default row shape, when a screen's rows look different. */
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn("space-y-3", className)}
    >
      {children ??
        Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <Placeholder className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Placeholder className="h-3.5 w-1/3" />
              <Placeholder className="h-3 w-1/2" />
            </div>
            <Placeholder className="h-7 w-16 shrink-0 rounded-full" />
          </div>
        ))}
    </div>
  );
}
