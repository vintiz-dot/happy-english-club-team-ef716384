import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  consequenceRows,
  NEW_BILL_LINE,
  payrollLine,
  totalsRow,
  type Consequences,
  type GuardPreview,
} from "@/lib/sessionGuard";

/**
 * What the change would touch. Every figure is a bill exactly as SAVED
 * (the preview is read-only and calls no calculator); nothing is
 * calculated here. The totals row counts bills; it never adds money up.
 * Teacher pay is never shown as a figure in a preview.
 */
export function useStudentNames(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["session-guard-student-names", key.join(",")],
    enabled: key.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name").in("id", key);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((s: any) => [s.id, s.full_name as string])) as Record<string, string>;
    },
  }).data;
}

export function ConsequenceTable({ preview, consequences }: { preview: GuardPreview; consequences: Consequences | null }) {
  const rows = consequenceRows(consequences, preview);
  const names = useStudentNames(rows.map((r) => r.studentId));
  const totals = totalsRow(rows);
  const pay = payrollLine(consequences);
  // Children, not (child, month) pairs: a move across months lists a child twice.
  const kids = new Set((consequences?.affected_students ?? preview.affected ?? []).map((a) => a.student_id)).size;
  const requested = consequences?.reason !== "not_requested";

  return (
    <section aria-labelledby="sg-conseq-h" className="space-y-3">
      <h3 id="sg-conseq-h" className="text-sm font-semibold text-foreground">
        What would change
      </h3>
      <p className="text-sm text-muted-foreground">
        {kids === 0 ? "No children are on this lesson's register." : `${kids} ${kids === 1 ? "child is" : "children are"} on this lesson.`}
        {preview.after_cancel && preview.after_cancel.marks_excused ? ` ${preview.after_cancel.marks_excused} attendance ${preview.after_cancel.marks_excused === 1 ? "mark" : "marks"} would be set to Excused.` : ""}
      </p>

      {requested && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Each affected child's saved bill as it stands</caption>
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Child and month</th>
                <th scope="col" className="px-3 py-2 font-medium">Bill as it stands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium break-words">
                    {names?.[r.studentId] ?? "Child"}
                    <span className="block text-xs font-normal text-muted-foreground">{r.month}</span>
                  </th>
                  <td className="px-3 py-2 break-words">
                    {r.nowText}
                    {r.notes.map((n) => (
                      <span key={n} className="mt-1 block text-xs text-muted-foreground">
                        {n}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <th scope="row" colSpan={2} className="px-3 py-2 text-left font-medium break-words">
                  Total: {totals.sentence}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {requested && rows.length > 0 && <p className="text-sm text-muted-foreground">{NEW_BILL_LINE}</p>}
      {requested && rows.length === 0 && <p className="text-sm text-muted-foreground">No family bill depends on this lesson.</p>}
      {!requested && <p className="text-sm text-muted-foreground">Bill figures were not requested for this check. Check Tuition after the change.</p>}

      <p className="text-sm text-muted-foreground">{pay.text}</p>

      {preview.action === "move" || preview.change ? <MoveNotes preview={preview} /> : null}
    </section>
  );
}

function MoveNotes({ preview }: { preview: GuardPreview }) {
  const dest = preview.destination;
  if (!dest) return null;
  const notes: string[] = [];
  if (dest.payroll_month_locked) notes.push("The month it moves into has closed payroll.");
  if (dest.tuition) notes.push("A bill in the month it moves into is already settled.");
  if (dest.day_evidence?.any) notes.push("Points, transcripts or homework recorded for the new day will stay with that day.");
  if (preview.settled_any) notes.push("The month it moves out of is already billed or paid.");
  if (!notes.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
