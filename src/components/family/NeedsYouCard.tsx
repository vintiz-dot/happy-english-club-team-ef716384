/**
 * The parent's one card at the top of the home (docs/EXPERIENCE_DESIGN_BRIEF.md H1, I1 row 14, I6).
 *
 * It says only what the page has READ. It never says "Everything is in order.": nothing on these pages can know
 * that, and a parent who owes tuition must not be told so. Nothing here calls calculate-tuition (it saves the bill
 * on every call), so the card never states a tuition amount or status either.
 *
 * The one narrower statement it may make comes from data already in the app: the signed-in person's notifications,
 * as the bell in the header reads them. The card VIEWS that query's cache (no request is made from here; it is the
 * way useAgeBand views the shell cache):
 *   - some unread   "You have {n} unread messages from the school. Open the bell at the top to read them."
 *   - none, known   "No new messages from the school." with the ink tick and Pip's 40 px badge (the only place either appears)
 *   - not known (the bell has not read them, the read failed, or the bell's 20-row window is full)  no sentence at all
 * There is no notifications page, so the sentence points to the bell. Below it: a plain link "This month's
 * tuition" with one neutral line, no status, no colour, no tick. No persuasion of any kind near money (I4).
 * Motion is design system section 9 only: the tick draws once; no pointer effects, no loops, no Tide.
 */
import { Link } from "react-router-dom";
import { skipToken, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InkCheck } from "@/components/fx/InkCheck";
import { FamilyBi } from "@/components/family/FamilyBi";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { cn } from "@/lib/utils";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

/** The bell reads at most this many rows; with a full window an older unread message could be missing. */
const BELL_WINDOW = 20;

export type Unread = { state: "unknown" } | { state: "some"; n: number } | { state: "none" };

/**
 * What the bell has already read, seen from its query cache (same key as NotificationBell). Never a request.
 * Unknown unless the rows are there: not loaded, failed, or (for "none") a full window.
 */
export function useUnreadFromBell(): Unread {
  const { role } = useAuth();
  const { studentId } = useStudentProfile();
  const { data, isError } = useQuery<any[]>({ queryKey: ["notifications", studentId, role], queryFn: skipToken });
  if (isError || !Array.isArray(data)) return { state: "unknown" };
  const n = data.filter((row) => !row.is_read).length;
  if (n > 0) return { state: "some", n };
  return data.length < BELL_WINDOW ? { state: "none" } : { state: "unknown" };
}

export function NeedsYouCard({ className }: { className?: string }) {
  const unread = useUnreadFromBell();
  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {unread.state === "some" && (
          <p className="text-hec-body text-hec-ink">
            <FamilyBi k={unread.n === 1 ? "needs.unreadOne" : "needs.unread"} vars={{ n: unread.n }} viClassName="text-hec-small" />
          </p>
        )}
        {unread.state === "none" && (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hec-leaf-tint text-hec-leaf">
              <InkCheck size={22} />
            </span>
            <p className="min-w-0 flex-1 font-display text-hec-h3 font-medium text-hec-ink">
              <FamilyBi k="needs.none" />
            </p>
            {/* Pip: once at most, the 40 px badge, beside the one statement that is known to be true */}
            <img src="/mascot/pip-badge.svg" width={40} height={40} alt="" draggable={false} className="shrink-0" />
          </div>
        )}

        {/* No amount and no status: the figure is not read on this page, so it is not guessed. A plain link. */}
        <Link
          to="/tuition"
          className={cn("flex min-h-hec-target items-center justify-between gap-3 rounded-hec-md text-hec-body text-hec-ink", unread.state !== "unknown" && "border-t border-hec-line pt-3", FOCUS)}
        >
          <span className="min-w-0">
            <FamilyBi k="needs.tuition" viClassName="text-hec-caption" />
            <span className="mt-1 block text-hec-small text-hec-ink-soft">
              <FamilyBi k="needs.tuitionNote" viClassName="text-hec-caption" />
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
