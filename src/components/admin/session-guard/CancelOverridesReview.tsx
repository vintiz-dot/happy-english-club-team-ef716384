import { useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReasonField } from "./Fields";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  checkReason,
  cleanReason,
  ERROR_TEXT,
  REASON_MIN,
  describeEvidence,
  filterOverrides,
  formatClock,
  formatDay,
  formatVnd,
  longDate,
  TIER_WORDS,
  type OverrideRow,
  type ReviewFilters,
} from "@/lib/sessionGuard";
import { cn } from "@/lib/utils";

const LIMIT = 300;
const ALL = "all";
// The guard's tables and views are not in the generated types until the owner regenerates them.
const db = supabase as any;

interface Loaded {
  rows: OverrideRow[];
  hitLimit: boolean;
  names: Record<string, string>;
}

async function loadOverrides(): Promise<Loaded> {
  const [ov, queue, pending] = await Promise.all([
    db.from("session_cancel_overrides").select("*").order("created_at", { ascending: false }).limit(LIMIT),
    db.from("session_cancel_review_queue").select("override_id, tuition_state").limit(1000),
    db.from("session_cancel_tuition_pending").select("override_id").limit(1000),
  ]);
  if (ov.error) throw ov.error;
  if (queue.error) throw queue.error;
  // The pending view is a convenience: its failure must not hide the list.
  const inQueue = new Map<string, string>((queue.data ?? []).map((q: any) => [q.override_id, q.tuition_state]));
  const unrefreshed = new Set<string>((pending.data ?? []).map((q: any) => q.override_id));
  const raw: any[] = ov.data ?? [];
  const rows: OverrideRow[] = raw.map((r) => ({
    ...r,
    override_id: r.id,
    reviewed: !!r.review_required && !inQueue.has(r.id),
    tuition_state: unrefreshed.has(r.id) ? "failed" : inQueue.get(r.id) ?? undefined,
  }));
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
  const [profiles, teachers] = await Promise.all([
    actorIds.length ? db.from("profiles").select("id, display_name").in("id", actorIds) : { data: [] },
    teacherIds.length ? db.from("teachers").select("id, full_name").in("id", teacherIds) : { data: [] },
  ]);
  const names: Record<string, string> = {};
  for (const p of profiles.data ?? []) names[p.id] = p.display_name || "Admin";
  for (const t of teachers.data ?? []) names[t.id] = t.full_name;
  return { rows, hitLimit: raw.length >= LIMIT, names };
}

/**
 * Cancellations that went through the guard: who, when, why, what the system
 * knew at the time, and whether anyone still has to look at them. Reads the
 * append-only audit tables through the signed-in admin's own client (RLS
 * admits admins only). Its one write is the review sign-off (an appended
 * audit event, record_session_override_event 'reviewed'); it never changes
 * a lesson, a bill or pay.
 */
export default function CancelOverridesReview() {
  const [state, setState] = useState<ReviewFilters["state"]>("needs_review");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classId, setClassId] = useState(ALL);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["session-guard-overrides"], queryFn: loadOverrides, staleTime: 15_000 });
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
  const className = (id: string) => classes?.find((c) => c.id === id)?.name ?? "Class";

  const filters: ReviewFilters = { state, from: from || undefined, to: to || undefined, classId: classId === ALL ? undefined : classId };
  const rows = useMemo(() => (data ? filterOverrides(data.rows, filters) : []), [data, state, from, to, classId]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsReview = data ? data.rows.filter((r) => r.review_required && !r.reviewed).length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          Cancellation overrides
        </CardTitle>
        <CardDescription>
          Every cancel, delete, move or restore that went through the check, with the evidence the system had at that moment.
          {data ? ` ${needsReview} waiting for review.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="ov-view">Show</Label>
            <Select value={state} onValueChange={(v) => setState(v as ReviewFilters["state"])}>
              <SelectTrigger id="ov-view" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_review">Needs review</SelectItem>
                <SelectItem value="all">All overrides</SelectItem>
                <SelectItem value="digest">Weekly digest (last 7 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-from">Done from</Label>
            <Input id="ov-from" type="date" className="min-h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-to">Done until</Label>
            <Input id="ov-to" type="date" className="min-h-11" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-class">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="ov-class" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {state === "digest" && (
          <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm" role="status">
            Cancellations in the last 7 days that went through although the system had evidence the lesson took place:{" "}
            <strong>{rows.length}</strong>.
          </p>
        )}

        {isLoading && (
          <div role="status" className="space-y-2" aria-live="polite">
            <span className="sr-only">Loading overrides...</span>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="font-semibold">The override list could not be loaded.</p>
            <p className="break-words">
              {String((error as any)?.message ?? error)}. If the database update for checked cancellation has not been applied yet, there is nothing to show.
            </p>
            <button type="button" className="min-h-11 rounded-lg border border-border px-3 text-sm underline" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        )}

        {data && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>}

        {data && rows.length > 0 && (
          <ul className="space-y-2" aria-label="Overrides">
            {rows.map((r) => (
              <OverrideItem key={r.override_id} row={r} names={data.names} className={className(r.class_id)} onReviewed={() => void refetch()} />
            ))}
          </ul>
        )}
        {data?.hitLimit && <p className="text-xs text-muted-foreground">Showing the latest {LIMIT}. Narrow the dates to see older ones.</p>}
      </CardContent>
    </Card>
  );
}

const ACTION_WORD: Record<string, string> = { cancel: "Cancelled", delete: "Deleted", move: "Moved", uncancel: "Restored" };

function OverrideItem({ row, names, className, onReviewed }: { row: OverrideRow; names: Record<string, string>; className: string; onReviewed: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const items = row.evidence?.items ?? [];
  const when = `${formatDay(row.created_at) ?? row.created_at}${formatClock(row.created_at) ? `, ${formatClock(row.created_at)}` : ""}`;
  const invoices: any[] = Array.isArray(row.invoices_before) ? row.invoices_before : [];
  const queued = row.review_required && !row.reviewed;
  return (
    <li className="rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-start gap-3 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block break-words text-sm font-medium">
            {ACTION_WORD[row.action] ?? row.action}: {className}, lesson of {longDate(row.session_date)}
          </span>
          <span className="block break-words text-xs text-muted-foreground">
            {when} by {names[row.actor_user_id] ?? "an administrator"}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{row.level === "STRONG" ? "Strong evidence" : row.level === "SOFT" ? "Some evidence" : "No evidence"}</Badge>
            <Badge variant="outline">Tier {row.tier}</Badge>
            {row.correction_mode && <Badge variant="outline">Correction</Badge>}
            <Badge variant={queued ? "destructive" : "outline"}>{queued ? "Needs review" : row.review_required ? "Reviewed" : "No review needed"}</Badge>
            {row.tuition_state === "failed" && <Badge variant="destructive">Bills not refreshed</Badge>}
          </span>
        </span>
      </button>
      {open && (
        <div id={`${id}-body`} className="space-y-3 border-t border-border p-3 text-sm">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Who</dt>
            <dd className="break-words">{names[row.actor_user_id] ?? "an administrator"}</dd>
            <dt className="text-muted-foreground">When</dt>
            <dd>{when}</dd>
            <dt className="text-muted-foreground">Teacher</dt>
            <dd className="break-words">{names[row.teacher_id] ?? "-"}</dd>
            <dt className="text-muted-foreground">How</dt>
            <dd>{row.via === "bulk" ? "Part of a bulk cancellation" : "Single lesson"}{row.confirmed ? ", confirmed by the admin" : ""}</dd>
            <dt className="text-muted-foreground">Level of care</dt>
            <dd>{TIER_WORDS[row.tier] ?? `Tier ${row.tier}`}</dd>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="break-words">{row.reason}</dd>
            {row.correction_reason && (
              <>
                <dt className="text-muted-foreground">Correction reason</dt>
                <dd className="break-words">{row.correction_reason}</dd>
              </>
            )}
            {row.action === "move" && row.change && (
              <>
                <dt className="text-muted-foreground">Moved to</dt>
                <dd>
                  {row.change.date ? longDate(row.change.date) : ""} {row.change.start_time ? `${String(row.change.start_time).slice(0, 5)}-${String(row.change.end_time ?? "").slice(0, 5)}` : ""}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Children on it</dt>
            <dd>{row.affected?.length ?? 0}</dd>
          </dl>

          <section aria-label="Evidence the system had" className="space-y-1.5">
            <h4 className="font-semibold">Evidence at the time</h4>
            {items.length === 0 ? (
              <p className="text-muted-foreground">Nothing was recorded for this lesson.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {items.map((i, k) => (
                  <li key={`${i.type}-${k}`} className="break-words">
                    {describeEvidence(i)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {invoices.length > 0 && (
            <section aria-label="Bills at the time" className="space-y-1.5">
              <h4 className="font-semibold">Bills at the time (as stored)</h4>
              <ul className="space-y-1">
                {invoices.map((inv, k) => (
                  <li key={inv?.id ?? k} className={cn("break-words rounded-lg border border-border p-2")}>
                    {inv?.month ?? ""}: {inv?.total_amount !== undefined ? formatVnd(inv.total_amount) : "-"}
                    {inv?.status ? ` (${inv.status})` : ""}
                    {inv?.tuition_frozen ? ", frozen" : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {queued && <MarkReviewed overrideId={row.override_id} onDone={onReviewed} />}
        </div>
      )}
    </li>
  );
}

/**
 * Sign-off for one override: record_session_override_event(kind 'reviewed')
 * with a note that meets the same reason rule as a cancellation. It appends
 * an event to the audit log; it changes no lesson, bill or pay. Whether the
 * reviewer must be a different admin is the owner's decision; for now the
 * database accepts the admin's own review.
 */
function MarkReviewed({ overrideId, onDone }: { overrideId: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inFlight = useRef(false);
  const check = checkReason(note);
  const submit = async () => {
    if (!check.ok || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await db.rpc("record_session_override_event", {
        p_override_id: overrideId,
        p_kind: "reviewed",
        p_payload: { note: cleanReason(note) },
      });
      if (error) {
        setErr(`${error.code === "HC010" ? ERROR_TEXT.reason_too_short : "The review was not recorded."} (code: ${error.code ?? "unknown"})`);
        return;
      }
      onDone();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label="Review this override" className="space-y-3 rounded-xl border border-border p-3">
      <ReasonField label="Review note (required)" help="What you checked and what you found. At least 15 characters." value={note} onChange={setNote} min={REASON_MIN} disabled={busy} />
      {err && (
        <p role="alert" className="break-words text-sm font-medium">
          {err}
        </p>
      )}
      <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={!check.ok || busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        Mark as reviewed
      </Button>
    </section>
  );
}
