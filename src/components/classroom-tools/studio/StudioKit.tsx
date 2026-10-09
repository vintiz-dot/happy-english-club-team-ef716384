/**
 * Studio kit — the shared parts every classroom tool is built from.
 *
 * One card shape, one segmented control, one stepper, one primary button.
 * Before this, each tool invented its own: eleven different button sizes,
 * eleven gradients, eleven ideas of what a heading looked like. A teacher
 * scanning the panel mid-lesson had to re-learn each tile. Now the only
 * thing that changes between cards is the thing the tool actually does.
 *
 * Colour here is semantic, never decorative: a tone marks which tool you
 * are in, and saturated colour inside a card means the colour is carrying
 * information (a team, a rank, a traffic light).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Minus, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClass, type StudioTone } from "./tokens";

/* ------------------------------------------------------------- tool card */

export interface ToolCardProps {
  icon: LucideIcon;
  tone: StudioTone;
  title: string;
  /** One line. If it needs two, the tool is doing too much. */
  description: string;
  /** Top-right slot — the projector button, a live badge, a count. */
  action?: ReactNode;
  /** Spans the full grid width. For tools that deal out results. */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

export function ToolCard({
  icon: Icon,
  tone,
  title,
  description,
  action,
  wide,
  className,
  children,
}: ToolCardProps) {
  return (
    <section
      className={cn(
        "studio-card flex flex-col overflow-hidden p-5",
        wide && "md:col-span-2 xl:col-span-3",
        className,
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            toneClass(tone),
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="studio-title text-[1.3rem] leading-tight">{title}</h3>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-soft">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------- stage */

export function Stage({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "studio-stage relative grid place-items-center overflow-hidden",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- segmented */

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Announced to screen readers when `label` is a glyph. */
  srLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "md",
  className,
  ariaLabel,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("studio-segment grid w-full gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.srLabel}
            disabled={disabled}
            data-active={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "studio-segment-item studio-focus truncate",
              size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- stepper */

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <div className="flex h-11 items-center rounded-2xl border border-studio bg-studio-stage">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          className="studio-focus grid h-full w-10 shrink-0 place-items-center rounded-l-2xl text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(clamp(next));
          }}
          aria-label={label}
          className="studio-focus w-full min-w-0 bg-transparent text-center text-base font-bold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          className="studio-focus grid h-full w-10 shrink-0 place-items-center rounded-r-2xl text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
};

export const ActionButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "lg", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "studio-action studio-focus inline-flex w-full items-center justify-center gap-2",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-[0.9375rem]",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      {...rest}
    />
  ),
);
ActionButton.displayName = "ActionButton";

export const QuietButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "sm", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "studio-quiet studio-focus inline-flex items-center justify-center gap-1.5",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      {...rest}
    />
  ),
);
QuietButton.displayName = "QuietButton";

/* ---------------------------------------------------------------- slider */

export function StudioSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-semibold text-ink-soft">{label}</span>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
        className="relative flex h-5 w-full flex-1 touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[hsl(var(--studio-ink)/0.12)]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[hsl(var(--studio-ink))]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="studio-focus block h-4 w-4 rounded-full border-2 border-[hsl(var(--studio-ink))] bg-[hsl(var(--studio-card))] shadow-sm transition-transform hover:scale-110" />
      </SliderPrimitive.Root>
      <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-ink">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- footnote */

/** The "ideas" line at the bottom of a card. Quiet by design. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">{children}</p>
  );
}
