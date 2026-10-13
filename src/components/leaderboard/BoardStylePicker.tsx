/**
 * Choosing the class's leaderboard.
 *
 * Shown to an admin on the class settings page and to the teachers of
 * that class on theirs — the same component, because the choice is the
 * same choice and the database decides who may save it. A teacher who is
 * not on this class never reaches the screen this sits on, and if they
 * somehow did, the write is refused server-side and the refusal is shown.
 *
 * It saves on click rather than behind a Save button. The setting is one
 * value, instantly visible on the board, and trivially reversible; a save
 * button would only add a step and a way to lose the change by navigating
 * away.
 *
 * The recommendation is a nudge, never a rule. `classes.age_range` is
 * free text in this database — "6-8", "Primary", "Teens", anything — so
 * it is matched loosely and, when it matches nothing, no recommendation
 * is offered at all rather than a confident wrong one.
 */
import { useState } from "react";
import { Check, Loader2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BOARD_STYLES,
  BOARD_STYLE_INFO,
  isDisplayBoard,
  recommendedStyle,
  type BoardStyle,
} from "./types";
import { setClassBoardStyle, useClassBoardStyle, useInvalidateBoardStyle } from "./useClassBoardStyle";

const SWATCH: Record<BoardStyle, { bg: string; ink: string; chip: string }> = {
  podium: { bg: "#F2EDE4", ink: "#2A2418", chip: "#C8A45B" },
  star: { bg: "#BDE6FB", ink: "#2A2140", chip: "#FFC83D" },
  arcade: { bg: "#2430C9", ink: "#FFFFFF", chip: "#FFC21A" },
  night: { bg: "#070A12", ink: "#E6F7D9", chip: "#B6F24A" },
};

export function BoardStylePicker({
  classId,
  ageRange,
  /** Set false where the viewer may look but not change. */
  canEdit = true,
}: {
  classId: string;
  ageRange?: string | null;
  canEdit?: boolean;
}) {
  const { data: current, isLoading } = useClassBoardStyle(classId);
  const invalidate = useInvalidateBoardStyle();
  const [saving, setSaving] = useState<BoardStyle | null>(null);

  const suggested = recommendedStyle(ageRange);

  const choose = async (style: BoardStyle) => {
    if (!canEdit || style === current || saving) return;
    setSaving(style);
    try {
      await setClassBoardStyle(classId, style);
      invalidate(classId);
      toast.success(`Leaderboard set to ${BOARD_STYLE_INFO[style].name}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading the current board…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {BOARD_STYLES.map((style) => {
          const info = BOARD_STYLE_INFO[style];
          const sw = SWATCH[style];
          const active = current === style;
          const busy = saving === style;

          return (
            <button
              key={style}
              type="button"
              disabled={!canEdit || !!saving}
              aria-pressed={active}
              onClick={() => choose(style)}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
                !canEdit && "cursor-default opacity-90",
              )}
            >
              {/* A swatch rather than a screenshot: it survives a redesign,
                  costs no image, and is enough to tell them apart. */}
              <span
                className="mb-2.5 flex h-16 items-center justify-center rounded-lg"
                style={{ background: sw.bg }}
                aria-hidden
              >
                <span className="flex items-end gap-1">
                  <span className="h-5 w-4 rounded-sm" style={{ background: sw.chip, opacity: 0.6 }} />
                  <span className="h-8 w-5 rounded-sm" style={{ background: sw.chip }} />
                  <span className="h-4 w-4 rounded-sm" style={{ background: sw.chip, opacity: 0.45 }} />
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{info.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {suggested === style && !active && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    suggested
                  </span>
                )}
              </span>

              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                {isDisplayBoard(style) ? (
                  <Monitor className="h-3 w-3" aria-hidden />
                ) : (
                  <Smartphone className="h-3 w-3" aria-hidden />
                )}
                {info.audience}
              </span>

              <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">
                {info.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {/* The one thing a teacher needs to know before choosing, said once
          rather than repeated on all three cards. */}
      <p className="text-xs text-muted-foreground">
        The three picture boards are built for a big screen. On a phone — which is how
        most students check their points — the class automatically sees the Classic board
        instead, so nobody is left squinting at a projector layout.
        {!canEdit && " Only an admin or a teacher of this class can change this."}
      </p>
    </div>
  );
}
