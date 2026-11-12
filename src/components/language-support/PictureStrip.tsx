/**
 * A sentence as pictures over the words they came from. The same component
 * shows the teacher's draft (cells can be clicked to change, and the ones to
 * double-check are ringed) and the finished set a child reads (large, and a
 * tap says the word aloud).
 */
import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";
import type { Cell } from "@/lib/languageSupport/strip";

interface Props {
  cells: Cell[];
  /** "reader" is the child's view: bigger, no review marks. */
  mode?: "teacher" | "reader";
  onCellClick?: (cell: Cell, index: number) => void;
}

function Pictures({ cell, size }: { cell: Cell; size: number }) {
  const ivory = useIvory();
  const repeat = Math.max(1, cell.repeat ?? 1);
  // A plural with no count overlaps its copies: "several", not "exactly three".
  const overlap = cell.indefinite ? size * 0.38 : 0;
  const width = repeat > 1 ? size + (repeat - 1) * (size - overlap + 4) : size;
  return (
    <div className="relative" style={{ width, height: size }}>
      {Array.from({ length: repeat }, (_, i) => (
        <img
          key={i}
          src={cell.url}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute top-0 object-contain"
          style={{ width: size, height: size, left: i * (size - overlap + (cell.indefinite ? 0 : 4)) }}
        />
      ))}
      {cell.negated && (
        <svg viewBox="0 0 100 100" className={cn("absolute inset-0 h-full w-full opacity-90", ivory ? "text-hec-danger" : "text-red-600")} aria-label="not">
          <line x1="12" y1="12" x2="88" y2="88" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          <line x1="88" y1="12" x2="12" y2="88" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        </svg>
      )}
      {cell.count ? (
        <span className={cn("absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 font-bold", ivory ? "bg-hec-action text-hec-caption text-hec-on-action tabular-nums" : "bg-primary text-xs text-primary-foreground")}>
          {cell.count}
        </span>
      ) : null}
    </div>
  );
}

export function PictureStrip({ cells, mode = "teacher", onCellClick }: Props) {
  const reader = mode === "reader";
  const ivory = useIvory();
  const size = reader ? 96 : 64;
  return (
    <div className={cn("flex flex-wrap items-end", reader ? "gap-x-3 gap-y-5" : "gap-x-2 gap-y-3")}>
      {cells.map((cell, index) => {
        if (cell.continues) return null;
        const hasPicture = cell.kind !== "word" && !!cell.url;
        const needsLook =
          !reader && cell.kind !== "word" && (cell.match === "fuzzy" || cell.match === "unknown" || !cell.url || cell.uncertain);
        const clickable = !!onCellClick && (!reader || hasPicture);
        const body = (
          <>
            {hasPicture ? <Pictures cell={cell} size={size} /> : null}
            <span
              className={cn(
                "leading-tight",
                ivory
                  ? [reader ? "text-hec-h2 font-medium text-hec-ink" : "text-hec-small text-hec-ink", !hasPicture && "text-hec-ink-soft"]
                  : [reader ? "text-2xl font-semibold" : "text-sm", !hasPicture && (reader ? "text-2xl text-foreground/80" : "text-muted-foreground")],
              )}
            >
              {cell.text}
            </span>
          </>
        );
        const className = cn(
          "flex flex-col items-center gap-1 px-1.5 py-1",
          ivory ? "rounded-hec-md" : "rounded-xl",
          hasPicture && "min-w-[3rem]",
          needsLook && (ivory ? "ring-2 ring-hec-warn bg-hec-warn-tint" : "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30"),
          clickable && (ivory
            ? "min-h-hec-target cursor-pointer transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
            : "cursor-pointer transition hover:bg-accent focus-visible:outline focus-visible:outline-2"),
        );
        return clickable ? (
          <button
            key={`${cell.start}-${index}`}
            type="button"
            className={className}
            onClick={() => onCellClick!(cell, index)}
            title={reader ? `Hear "${cell.text}"` : needsLook ? "Check this picture" : "Change the picture"}
          >
            {body}
          </button>
        ) : (
          <div key={`${cell.start}-${index}`} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
