import { CheckCircle2, ClipboardCheck, History, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY, evidenceList, evidenceMode, floorNote, guidanceFor, type GuardPreview } from "@/lib/sessionGuard";

/**
 * What the system found about whether this lesson took place, in plain
 * language, straight from the preview's evidence items. Wording lives in
 * src/lib/sessionGuard.ts. Colour is never the only signal: each card
 * carries a text tag, and the summary starts with a word, not a shade.
 *
 * D4 (floors): when evidence was removed after the lesson, the server
 * keeps what the lesson once had (preview.floor) and judges the change by
 * it. This card says so, and lists each removal under "Recorded, and later
 * removed". It decides nothing: the level, the tier and what is required
 * all come from the preview.
 */
export function EvidenceCards({ preview }: { preview: GuardPreview }) {
  const mode = evidenceMode(preview);
  const all = evidenceList(preview);
  const items = all.filter((e) => !e.removed);
  const removed = all.filter((e) => e.removed);
  const once = floorNote(preview);
  // The floor's own entries (source "floor") are listed in the block above;
  // this sentence counts the audit-log ones, as before D4.
  const erased = (preview.erased_recently ?? []).filter((x) => x?.source !== "floor");
  const strong = preview.level === "STRONG";
  const some = mode === "some";

  return (
    <section aria-labelledby="sg-evidence-h" className="space-y-3">
      <h3 id="sg-evidence-h" className="text-sm font-semibold text-foreground">
        What the system found
      </h3>

      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3 text-sm",
          strong ? "border-destructive/50 bg-destructive/10" : some ? "border-warning/50 bg-warning/10" : "border-border bg-muted/40",
        )}
      >
        {strong ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        ) : some ? (
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="min-w-0 break-words">
          <span className="font-semibold">{strong ? "Strong evidence. " : some ? "Some evidence. " : mode === "none_past" ? "Nobody marked this lesson. " : "Nothing recorded. "}</span>
          {guidanceFor(preview)}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Evidence items">
          {items.map((e) => (
            <li key={e.key} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-sm">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                  e.strength === "Strong" ? "border-destructive/50 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {e.strength}
              </span>
              <span className="min-w-0 break-words">{e.text}</span>
            </li>
          ))}
        </ul>
      )}

      {once && (
        <div className="space-y-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm" role="note" aria-labelledby="sg-floor-h">
          <p id="sg-floor-h" className="flex items-start gap-2 break-words">
            <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">{COPY.floorRemoved}. </span>
              {once}
            </span>
          </p>
          {removed.length > 0 && (
            <ul className="space-y-1.5" aria-label={COPY.floorRemoved}>
              {removed.map((e) => (
                <li key={e.key} className="flex items-start gap-2 break-words">
                  <span className="mt-0.5 shrink-0 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Removed
                  </span>
                  <span className="min-w-0">{e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {erased.length > 0 && (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm break-words">
          <span className="font-semibold">{COPY.erasedNote}. </span>
          {erased.length === 1 ? "One record about this lesson was removed shortly before this change." : `${erased.length} records about this lesson were removed shortly before this change.`}
        </p>
      )}
    </section>
  );
}
