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
import { useIvory } from "@/hooks/useIvory";
import { toneClass, type StudioTone } from "./tokens";

/**
 * Ivory (DESIGN_SYSTEM s.15) for the frame of every tool, on a listed route
 * (src/lib/ivoryScope.ts); elsewhere the studio classes, unchanged. The
 * tones (tokens.ts) and what a tool draws inside its stage are the tools'
 * own colours and stay (A4.6 plan, section 3).
 */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

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
  const ivory = useIvory();
  return (
    <section
      className={cn(
        ivory
          ? "flex flex-col overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-hec-ink shadow-hec-1 sm:p-6"
          : "studio-card flex flex-col overflow-hidden p-5",
        wide && "md:col-span-2 xl:col-span-3",
        className,
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            ivory
              ? "grid h-11 w-11 shrink-0 place-items-center rounded-hec-md"
              : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            toneClass(tone),
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={ivory ? "font-display text-hec-h3 font-medium text-hec-ink" : "studio-title text-[1.3rem] leading-tight"}>{title}</h3>
          <p className={ivory ? "mt-1 text-hec-small text-hec-ink-soft" : "mt-0.5 text-[0.8125rem] leading-snug text-ink-soft"}>{description}</p>
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
  const ivory = useIvory();
  return (
    <div
      className={cn(
        ivory
          ? "relative grid place-items-center overflow-hidden rounded-hec-lg border border-hec-line bg-hec-sunken"
          : "studio-stage relative grid place-items-center overflow-hidden",
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
  const ivory = useIvory();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        ivory ? "grid w-full gap-1 rounded-hec-md border border-hec-line bg-hec-sunken p-1" : "studio-segment grid w-full gap-1",
        className,
      )}
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
            className={
              ivory
                ? cn(
                    "min-h-hec-target min-w-0 whitespace-normal break-words rounded-hec-sm py-1 font-medium leading-tight text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-raised hover:text-hec-ink data-[active=true]:bg-hec-action data-[active=true]:text-hec-on-action data-[active=true]:shadow-hec-1",
                    FOCUS,
                    size === "sm" ? "px-2 text-hec-small" : "px-3 text-hec-body",
                    disabled && "cursor-not-allowed opacity-50",
                  )
                : cn(
                    "studio-segment-item studio-focus truncate",
                    size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
                    disabled && "cursor-not-allowed opacity-50",
                  )
            }
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
  const ivory = useIvory();
  const ivoryStep = cn(
    "grid min-h-hec-target min-w-hec-target shrink-0 place-items-center rounded-hec-md text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken hover:text-hec-ink disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS,
  );
  return (
    <div className="min-w-0">
      <span className={ivory ? "mb-2 block text-hec-small font-medium text-hec-ink" : "mb-1.5 block text-xs font-semibold text-ink-soft"}>{label}</span>
      <div className={ivory ? "flex min-h-hec-target items-center rounded-hec-md border border-hec-line-strong bg-hec-raised" : "flex h-11 items-center rounded-2xl border border-studio bg-studio-stage"}>
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          className={ivory ? ivoryStep : "studio-focus grid h-full w-10 shrink-0 place-items-center rounded-l-2xl text-ink-soft transition-colors hover:text-ink disabled:opacity-30"}
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
          className={
            ivory
              ? cn("min-h-hec-target w-full min-w-0 rounded-hec-sm bg-transparent text-center text-hec-body font-semibold tabular-nums text-hec-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", FOCUS)
              : "studio-focus w-full min-w-0 bg-transparent text-center text-base font-bold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          }
        />
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          className={ivory ? ivoryStep : "studio-focus grid h-full w-10 shrink-0 place-items-center rounded-r-2xl text-ink-soft transition-colors hover:text-ink disabled:opacity-30"}
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
  ({ className, size = "lg", ...rest }, ref) => {
    const ivory = useIvory();
    return (
      <button
        ref={ref}
        type="button"
        className={
          ivory
            ? cn(
                "inline-flex min-h-hec-target w-full items-center justify-center gap-2 rounded-hec-md bg-hec-action font-medium text-hec-on-action transition-colors duration-hec-1 ease-hec hover:bg-hec-action/90 active:bg-hec-action/80 disabled:cursor-not-allowed disabled:opacity-50",
                FOCUS,
                size === "sm" && "px-4 text-hec-small",
                size === "md" && "px-5 text-hec-body",
                size === "lg" && "min-h-12 px-6 text-hec-body",
                className,
              )
            : cn(
                "studio-action studio-focus inline-flex w-full items-center justify-center gap-2",
                size === "sm" && "h-9 px-4 text-sm",
                size === "md" && "h-11 px-5 text-[0.9375rem]",
                size === "lg" && "h-12 px-6 text-base",
                className,
              )
        }
        {...rest}
      />
    );
  },
);
ActionButton.displayName = "ActionButton";

export const QuietButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "sm", ...rest }, ref) => {
    const ivory = useIvory();
    return (
      <button
        ref={ref}
        type="button"
        className={
          ivory
            ? cn(
                "inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised font-medium text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken disabled:cursor-not-allowed disabled:opacity-50",
                FOCUS,
                size === "sm" && "px-3 text-hec-small",
                size === "md" && "px-4 text-hec-body",
                size === "lg" && "min-h-12 px-6 text-hec-body",
                className,
              )
            : cn(
                "studio-quiet studio-focus inline-flex items-center justify-center gap-1.5",
                size === "sm" && "h-9 px-3 text-xs",
                size === "md" && "h-10 px-4 text-sm",
                size === "lg" && "h-12 px-6 text-base",
                className,
              )
        }
        {...rest}
      />
    );
  },
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
  const ivory = useIvory();
  if (ivory) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-hec-small font-medium text-hec-ink-soft">{label}</span>
        <SliderPrimitive.Root
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
          aria-label={label}
          className="relative flex min-h-hec-target w-full flex-1 touch-none select-none items-center"
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-hec-sunken">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-hec-action" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className={cn("block h-5 w-5 rounded-full border-2 border-hec-action bg-hec-raised shadow-hec-1", FOCUS)} />
        </SliderPrimitive.Root>
        <span className="w-10 shrink-0 text-right text-hec-small font-semibold tabular-nums text-hec-ink">
          {format ? format(value) : value}
        </span>
      </div>
    );
  }
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
  const ivory = useIvory();
  return (
    <p className={ivory ? "mt-3 text-hec-caption text-hec-ink-soft" : "mt-3 text-[0.75rem] leading-relaxed text-ink-faint"}>{children}</p>
  );
}
