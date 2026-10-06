/**
 * classColors — a stable colour per class, so a glance at the calendar tells
 * you WHICH class is running, not just that something is.
 *
 * The colour is derived from the class id, so it never changes between
 * sessions, views, renders or reloads, and no colour has to be stored in the
 * database. Renaming a class keeps its colour; two classes can only collide
 * once there are more classes than palette entries.
 *
 * Tailwind cannot build class names at runtime (it scans source text), so
 * every colour is written out literally here rather than interpolated.
 *
 * STATUS STILL HAS TO SURVIVE THIS. Colour now carries class identity, so it
 * can no longer carry status as well. Status is applied on top as a marker —
 * an amber ring and icon for the one actionable state, muting for held, a
 * strikethrough for canceled — see statusTreatment below.
 */

export interface ClassColor {
  key: string;
  /** Solid, for the identifying rail and legend dots. */
  rail: string;
  /** Faint fill for the chip or block body. */
  tint: string;
  border: string;
  text: string;
}

const PALETTE: ClassColor[] = [
  { key: "violet", rail: "bg-violet-500", tint: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800/60", text: "text-violet-950 dark:text-violet-100" },
  { key: "sky", rail: "bg-sky-500", tint: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-200 dark:border-sky-800/60", text: "text-sky-950 dark:text-sky-100" },
  { key: "emerald", rail: "bg-emerald-500", tint: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800/60", text: "text-emerald-950 dark:text-emerald-100" },
  { key: "rose", rail: "bg-rose-500", tint: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800/60", text: "text-rose-950 dark:text-rose-100" },
  { key: "amber", rail: "bg-amber-500", tint: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800/60", text: "text-amber-950 dark:text-amber-100" },
  { key: "indigo", rail: "bg-indigo-500", tint: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800/60", text: "text-indigo-950 dark:text-indigo-100" },
  { key: "teal", rail: "bg-teal-500", tint: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-800/60", text: "text-teal-950 dark:text-teal-100" },
  { key: "fuchsia", rail: "bg-fuchsia-500", tint: "bg-fuchsia-50 dark:bg-fuchsia-950/40", border: "border-fuchsia-200 dark:border-fuchsia-800/60", text: "text-fuchsia-950 dark:text-fuchsia-100" },
  { key: "cyan", rail: "bg-cyan-500", tint: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-800/60", text: "text-cyan-950 dark:text-cyan-100" },
  { key: "orange", rail: "bg-orange-500", tint: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800/60", text: "text-orange-950 dark:text-orange-100" },
  { key: "lime", rail: "bg-lime-500", tint: "bg-lime-50 dark:bg-lime-950/40", border: "border-lime-200 dark:border-lime-800/60", text: "text-lime-950 dark:text-lime-100" },
  { key: "blue", rail: "bg-blue-500", tint: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800/60", text: "text-blue-950 dark:text-blue-100" },
];

export const CLASS_PALETTE_SIZE = PALETTE.length;

/** FNV-1a: small, fast, and stable across runs — unlike String.hashCode-style
 *  sums it does not map anagrams or similar ids onto the same bucket. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Colour for a single class, with no knowledge of the others.
 *
 * Fine for a lone swatch, but two classes CAN land on the same colour: with
 * eight classes and twelve slots a collision is about 85% likely (birthday
 * problem), and "Stars" and "Sanrio Grade 6" genuinely did collide. Where
 * telling classes apart is the point, use buildClassColorMap instead.
 */
export function getClassColor(classKey: string | null | undefined): ClassColor {
  if (!classKey) return PALETTE[0];
  return PALETTE[hash(classKey) % PALETTE.length];
}

/**
 * Distinct colours for a known set of classes.
 *
 * Each class claims the slot its hash points at; if that slot is taken, it
 * probes forward to the next free one. So colours are guaranteed distinct
 * while there are no more classes than palette entries, most classes still
 * keep their natural hash colour, and the result depends only on the SET —
 * not on render order, fetch order or anything else that varies.
 *
 * Beyond CLASS_PALETTE_SIZE classes colours necessarily repeat; the probe
 * spreads the repeats out rather than doubling two up early.
 */
export function buildClassColorMap(keys: Iterable<string>): Map<string, ClassColor> {
  // Sorted so the assignment is stable regardless of the order they arrive in.
  const unique = [...new Set([...keys].filter(Boolean))].sort();
  let taken = new Array<boolean>(PALETTE.length).fill(false);
  const out = new Map<string, ClassColor>();

  unique.forEach((key, index) => {
    // Once the palette is exhausted, start a fresh round rather than letting
    // every further class pile onto whichever slot the probe gave up on.
    if (index > 0 && index % PALETTE.length === 0) {
      taken = new Array<boolean>(PALETTE.length).fill(false);
    }
    let slot = hash(key) % PALETTE.length;
    for (let probe = 0; probe < PALETTE.length && taken[slot]; probe++) {
      slot = (slot + 1) % PALETTE.length;
    }
    taken[slot] = true;
    out.set(key, PALETTE[slot]);
  });
  return out;
}

/**
 * How a status modifies a class-coloured chip.
 *
 * Deliberately NOT another set of fills: the fill is the class now. Status
 * reads as weight and decoration, which leaves exactly one thing shouting.
 */
export function statusTreatment(statusKey: string): {
  wrapper: string;
  label: string;
  showWarning: boolean;
} {
  switch (statusKey) {
    case "needsAttention":
      return {
        wrapper: "ring-2 ring-warning/70 ring-offset-1 ring-offset-background",
        label: "",
        showWarning: true,
      };
    case "canceled":
      return { wrapper: "opacity-55", label: "line-through decoration-2", showWarning: false };
    case "held":
      return { wrapper: "opacity-60 saturate-[0.5]", label: "", showWarning: false };
    case "holiday":
      return { wrapper: "opacity-70 saturate-[0.3]", label: "italic", showWarning: false };
    case "today":
      return { wrapper: "ring-1 ring-primary/40", label: "", showWarning: false };
    default:
      return { wrapper: "", label: "", showWarning: false };
  }
}
