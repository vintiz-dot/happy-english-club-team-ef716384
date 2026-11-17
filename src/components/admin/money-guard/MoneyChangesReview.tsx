import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay, formatClock } from "@/lib/sessionGuard";

/**
 * What the money guard asks a second look at (D4 step 1b): checked changes
 * that went to review (T3, T2 in bulk), and the writes the database let
 * through but recorded - an old billed mark changed on the service lane
 * (service_retro_mark: the Stars sync, or a function with the service key)
 * and passes from the SQL editor (owner_lane). Read-only; admins only by RLS.
 * Mounted in tabs/AutomationTab.tsx (the admin page).
 */
export function MoneyChangesReview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["money-changes-review"],
    queryFn: async () => {
      const db = supabase as any;
      const [queue, events] = await Promise.all([
        db.from("money_change_review_queue").select("override_id, created_at, entity, op, tier, reason, correction_reason, tuition_state")
          .order("created_at", { ascending: false }).limit(100),
        db.from("money_change_events").select("id, created_at, kind, payload")
          .in("kind", ["service_retro_mark", "owner_lane", "automation_refused"])
          .order("created_at", { ascending: false }).limit(100),
      ]);
      if (queue.error) throw queue.error;
      if (events.error) throw events.error;
      // D4 step 4 (review N-2): a change a second administrator approved was run by
      // the approver; who asked is read from the approval record (its "applied"
      // event lists the override ids), never from the row's own context. Missing
      // view (step 4 not installed): nobody is named.
      const approved = await db.from("change_approval_queue").select("requested_by, decided_by, override_ids")
        .eq("status", "applied").eq("kind", "money").limit(1000);
      const asked: Record<string, { by: string; decided: string | null }> = {};
      for (const a of approved.error ? [] : approved.data ?? []) {
        for (const oid of Array.isArray(a.override_ids) ? a.override_ids : []) asked[String(oid)] = { by: a.requested_by, decided: a.decided_by ?? null };
      }
      const ids = [...new Set(Object.values(asked).flatMap((x) => [x.by, x.decided]).filter(Boolean))] as string[];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
        for (const p of profiles ?? []) names[p.id] = p.display_name || "an administrator";
      }
      return { queue: queue.data ?? [], events: events.data ?? [], asked, names };
    },
  });

  const when = (iso: string) => `${formatDay(iso) ?? ""} ${formatClock(iso) ?? ""}`.trim();
  const eventText = (e: any) =>
    e.kind === "service_retro_mark"
      ? `An old billed mark was changed by an automatic process: ${e.payload?.old_status ?? "no mark"} -> ${e.payload?.new_status ?? "removed"} (lesson of ${e.payload?.lesson_date ?? "?"}).`
      : e.kind === "owner_lane"
        ? `A change was made from the database console that would have needed a reason: ${e.payload?.old_status ?? "no mark"} -> ${e.payload?.new_status ?? "removed"}.`
        : `An automatic process wanted to change something and the guard kept it (${e.payload?.source ?? "unknown"}).`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Money changes to look at</CardTitle>
        <CardDescription>Changes to billed months made with a reason, and changes the database recorded instead of refusing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p role="alert" className="text-sm">These lists could not be read. Reload the page; if it persists, the database update may not be applied yet.</p>}
        {data && (
          <>
            <section aria-labelledby="mcr-q" className="space-y-2">
              <h3 id="mcr-q" className="text-sm font-semibold">Waiting for review ({data.queue.length})</h3>
              {data.queue.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting.</p> : (
                <ul className="space-y-1.5">
                  {data.queue.map((q: any) => (
                    <li key={q.override_id} className="rounded-xl border border-border p-3 text-sm break-words">
                      <span className="font-medium">{when(q.created_at)}</span> - {q.entity} / {q.op}, level {q.tier}: {q.reason}
                      {q.correction_reason ? ` (correction: ${q.correction_reason})` : ""} - bills {q.tuition_state}
                      {data.asked[q.override_id] && (
                        <span className="block text-xs text-muted-foreground">
                          Asked by {data.names[data.asked[q.override_id].by] ?? "an administrator"}; approved and made by{" "}
                          {data.names[data.asked[q.override_id].decided ?? ""] ?? "another administrator"}.
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="mcr-e" className="space-y-2">
              <h3 id="mcr-e" className="text-sm font-semibold">Recorded instead of refused ({data.events.length})</h3>
              <p className="text-xs text-muted-foreground">These recorded entries cannot be marked as reviewed yet; that arrives with the approvals step.</p>
              {data.events.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded.</p> : (
                <ul className="space-y-1.5">
                  {data.events.map((e: any) => (
                    <li key={e.id} className="rounded-xl border border-border p-3 text-sm break-words">
                      <span className="font-medium">{when(e.created_at)}</span> - {eventText(e)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
