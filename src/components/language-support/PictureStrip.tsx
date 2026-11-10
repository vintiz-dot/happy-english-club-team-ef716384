/**
 * A sentence as pictures over the words they came from. The same component
 * shows the teacher's draft (cells can be clicked to change, and the ones to
 * double-check are ringed) and the finished set a child reads (large, and a
 * tap says the word aloud).
 */
import { cn } from "@/lib/utils";
import type { Cell } from "@/lib/languageSupport/strip";

interface Props {
  cells: Cell[];
  /** "reader" is the child's view: bigger, no review marks. */
  mode?: "teacher" | "reader";
  onCellClick?: (cell: Cell, index: number) => void;
}

function Pictures({ cell, size }: { cell: Cell; size: number }) {
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
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-red-600 opacity-90" aria-label="not">
          <line x1="12" y1="12" x2="88" y2="88" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          <line x1="88" y1="12" x2="12" y2="88" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        </svg>
      )}
      {cell.count ? (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          {cell.count}
        </span>
      ) : null}
    </div>
  );
}

export function PictureStrip({ cells, mode = "teacher", onCellClick }: Props) {
  const reader = mode === "reader";
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
                reader ? "text-2xl font-semibold" : "text-sm",
                !hasPicture && (reader ? "text-2xl text-foreground/80" : "text-muted-foreground"),
              )}
            >
              {cell.text}
            </span>
          </>
        );
        const className = cn(
          "flex flex-col items-center gap-1 rounded-xl px-1.5 py-1",
          hasPicture && "min-w-[3rem]",
          needsLook && "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30",
          clickable && "cursor-pointer transition hover:bg-accent focus-visible:outline focus-visible:outline-2",
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
