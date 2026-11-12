import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Ban, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { callFn } from "@/components/admin/session-guard/api";
import { ConfirmTick, ReasonField, TypedDateField } from "@/components/admin/session-guard/Fields";
import {
  bulkAckProblem,
  bulkAckReady,
  bulkCounts,
  buildBulkConfirm,
  checkReason,
  cleanReason,
  describeEvidence,
  emptyAck,
  errorText,
  isSessionRelatedQuery,
  longDate,
  normaliseBulkPreview,
  normaliseBulkResult,
  REASON_MIN,
  type BulkAck,
  type BulkPreview,
  type BulkResult,
  type BulkRow,
  type GuardErrorBody,
} from "@/lib/sessionGuard";

const hm = (t?: string) => (t ? t.slice(0, 5) : "");
const ALL = "all";

/**
 * Bulk cancel, in two steps (bulk-cancel-sessions `preview` then `confirm`).
 *
 * Lessons with no evidence go in one batch under one reason. Lessons with
 * evidence that they took place are listed SEPARATELY, unchecked, and each
 * needs its own tick, its own reason and (strong evidence) its own typed
 * date: there is no "apply to all" for them. Nothing is assumed done: the
 * result lists every lesson's outcome.
 */
export function BulkSessionDelete() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState(ALL);
  const [teacherId, setTeacherId] = useState(ALL);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState<"preview" | "confirm" | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [batchReason, setBatchReason] = useState("");
  const [acks, setAcks] = useState<Record<string, BulkAck>>({});
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<GuardErrorBody | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, full_name").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const className = (id?: string) => classes?.find((c) => c.id === id)?.name ?? "Class";
  const criteria = () => ({
    date_from: fromDate,
    date_to: toDate,
    class_id: classId !== ALL ? classId : undefined,
    teacher_id: teacherId !== ALL ? teacherId : undefined,
  });

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setBatchReason("");
    setAcks({});
  };

  const handlePreview = async () => {
    setError(null);
    setResult(null);
    setBusy("preview");
    const res = await callFn("bulk-cancel-sessions", { step: "preview", ...criteria() });
    setBusy(null);
    if (!res.ok) {
      setPreview(null);
      setError(res.error);
      return;
    }
    setPreview(normaliseBulkPreview(res.data));
    setAcks({});
    setBatchReason("");
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const body = buildBulkConfirm(preview, acks);
    if (body.items.length + body.held_items.length === 0) return;
    setError(null);
    setBusy("confirm");
    const res = await callFn("bulk-cancel-sessions", {
      step: "confirm",
      batch_id: preview.batch_id,
      reason: cleanReason(batchReason),
      items: body.items,
      ...(body.include_held ? { include_held: true, held_items: body.held_items } : {}),
      ...criteria(),
    });
    setBusy(null);
    void qc.invalidateQueries({ predicate: (q) => isSessionRelatedQuery(q.queryKey) });
    if (!res.ok) {
      // Nothing is assumed done: the error stays on screen, the review stays open.
      setError(res.error);
      return;
    }
    setResult(normaliseBulkResult(res.data));
    setPreview(null);
  };

  const setAck = (id: string, patch: Partial<BulkAck>) => setAcks((a) => ({ ...a, [id]: { ...emptyAck(), ...a[id], ...patch } }));

  const counts = preview ? bulkCounts(preview) : null;
  const body = preview ? buildBulkConfirm(preview, acks) : null;
  const goCount = body ? body.items.length + body.held_items.length : 0;
  const includedNotReady = preview ? preview.needs_ack.filter((r) => acks[r.id]?.included && !bulkAckReady(r, acks[r.id])).length : 0;
  const reasonOk = checkReason(batchReason).ok;
  const canGo = !!preview && goCount > 0 && reasonOk && includedNotReady === 0 && busy === null;
  const datesOk = !!fromDate && !!toDate && fromDate <= toDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Bulk Session Cancel
        </CardTitle>
        <CardDescription>
          Check a date range first, then cancel. Lessons that look like they were taught are listed separately and need you to look at each one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-class">Class (optional)</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); reset(); }}>
                <SelectTrigger id="bulk-class" className="min-h-11">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All classes</SelectItem>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-teacher">Teacher (optional)</Label>
              <Select value={teacherId} onValueChange={(v) => { setTeacherId(v); reset(); }}>
                <SelectTrigger id="bulk-teacher" className="min-h-11">
                  <SelectValue placeholder="All teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All teachers</SelectItem>
                  {teachers?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-date">From date</Label>
              <Input id="from-date" type="date" className="min-h-11" value={fromDate} onChange={(e) => { setFromDate(e.target.value); reset(); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To date</Label>
              <Input id="to-date" type="date" className="min-h-11" value={toDate} onChange={(e) => { setToDate(e.target.value); reset(); }} aria-describedby="bulk-range-help" />
            </div>
            <p id="bulk-range-help" className="text-xs text-muted-foreground sm:col-span-2">
              Both dates are required, at most 62 days apart. Lessons already cancelled are not listed.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-1 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Nothing was changed by this step
            </p>
            <p className="break-words">{errorText(error.code, error.message)}</p>
            <p className="text-xs text-muted-foreground">Code: {error.code}</p>
          </div>
        )}

        {busy === "preview" && (
          <div role="status" className="space-y-3" aria-live="polite">
            <span className="sr-only">Checking the lessons in this range...</span>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {preview && counts && busy !== "preview" && (
          <div className="space-y-5">
            <p className="text-sm" role="status">
              <strong>{counts.plain + counts.needsAck + counts.refused + counts.failed}</strong> lessons checked:{" "}
              {counts.plain} with nothing recorded, {counts.needsAck} with evidence they took place, {counts.refused} that cannot be cancelled here
              {counts.failed ? `, ${counts.failed} that could not be checked` : ""}.
            </p>

            {/* Plain lessons */}
            <section aria-labelledby="bulk-plain-h" className="space-y-2">
              <h3 id="bulk-plain-h" className="text-sm font-semibold">
                Nothing recorded ({counts.plain})
              </h3>
              {counts.plain === 0 ? (
                <p className="text-sm text-muted-foreground">No lessons in this group.</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2 text-sm">
                  {preview.plain.map((r) => (
                    <li key={r.id} className="break-words px-1 py-1">
                      {longDate(r.date)}, {hm(r.start_time)}-{hm(r.end_time)} - {className(r.class_id)}
                      {r.status ? <span className="text-muted-foreground"> ({r.status})</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Evidence lessons */}
            {counts.needsAck > 0 && (
              <section aria-labelledby="bulk-ack-h" className="space-y-3">
                <h3 id="bulk-ack-h" className="text-sm font-semibold">
                  Evidence they took place ({counts.needsAck}) - not included unless you tick them
                </h3>
                <p className="text-sm text-muted-foreground">
                  Each lesson here needs its own tick and its own reason. Strong evidence also needs its date typed.
                </p>
                <ul className="space-y-3">
                  {preview.needs_ack.map((r) => (
                    <AckRow key={r.id} row={r} ack={acks[r.id] ?? emptyAck()} className={className(r.class_id)} disabled={busy === "confirm"} onChange={(p) => setAck(r.id, p)} />
                  ))}
                </ul>
              </section>
            )}

            {/* Refused */}
            {(counts.refused > 0 || counts.failed > 0) && (
              <section aria-labelledby="bulk-refused-h" className="space-y-2">
                <h3 id="bulk-refused-h" className="text-sm font-semibold">
                  Cannot be cancelled here ({counts.refused + counts.failed})
                </h3>
                <ul className="space-y-1 text-sm">
                  {preview.refused.map((r) => (
                    <li key={r.id} className="break-words rounded-lg border border-border p-2">
                      {longDate(r.date)}, {hm(r.start_time)} - {className(r.class_id)}: {errorText(r.refuse_code)}
                    </li>
                  ))}
                  {preview.preview_failed.map((f) => (
                    <li key={f.id} className="break-words rounded-lg border border-border p-2">
                      A lesson could not be checked: {errorText(f.code)} (code: {f.code})
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ReasonField
              label="Reason for this batch (required)"
              help={`Applies to the lessons with nothing recorded. At least ${REASON_MIN} characters; stock phrases are not accepted.`}
              value={batchReason}
              onChange={setBatchReason}
              min={REASON_MIN}
              disabled={busy === "confirm"}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-44" onClick={reset} disabled={busy === "confirm"}>
                Keep all lessons
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-12 w-full border-destructive text-foreground hover:bg-destructive/10 hover:text-foreground [&_svg]:text-destructive sm:w-auto"
                disabled={!canGo}
                aria-describedby="bulk-go-help"
                onClick={() => void handleConfirm()}
              >
                {busy === "confirm" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Ban aria-hidden="true" />}
                {busy === "confirm" ? "Working..." : goCount === 1 ? "Cancel 1 lesson" : `Cancel ${goCount} lessons`}
              </Button>
            </div>
            <p id="bulk-go-help" className="text-xs text-muted-foreground">
              {goCount === 0
                ? "No lesson is selected to cancel."
                : !reasonOk
                  ? "Write the batch reason to enable the button."
                  : includedNotReady > 0
                    ? `${includedNotReady} ticked ${includedNotReady === 1 ? "lesson still needs" : "lessons still need"} a reason, a confirmation or a date.`
                    : "Ready. Each lesson is checked again by the server before it is cancelled."}
            </p>
          </div>
        )}

        {result && <BulkResultView result={result} className={className} onAgain={reset} />}

        {!preview && !result && (
          <Button size="lg" className="min-h-12 w-full sm:w-auto" onClick={() => void handlePreview()} disabled={!datesOk || busy !== null}>
            {busy === "preview" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Check these lessons
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AckRow({ row, ack, className, disabled, onChange }: { row: BulkRow; ack: BulkAck; className: string; disabled?: boolean; onChange: (p: Partial<BulkAck>) => void }) {
  const items = row.evidence?.items ?? [];
  const problem = bulkAckProblem(row, ack);
  const needsCorrection = !!(row.requires as any)?.correction_reason;
  const min = Number((row.requires as any)?.reason_min ?? REASON_MIN);
  const strong = row.level === "STRONG";
  return (
    <li className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex min-h-11 items-start gap-3">
        <Checkbox
          id={`inc-${row.id}`}
          className="mt-0.5 h-5 w-5"
          checked={ack.included}
          disabled={disabled}
          onCheckedChange={(v) => onChange({ included: v === true })}
        />
        <Label htmlFor={`inc-${row.id}`} className="cursor-pointer text-sm font-normal leading-snug break-words">
          <span className="font-medium">
            {longDate(row.date)}, {hm(row.start_time)}-{hm(row.end_time)} - {className}
          </span>{" "}
          <Badge variant="outline" className="ml-1 align-middle">{strong ? "Strong evidence" : "Some evidence"}</Badge>
          <span className="block text-muted-foreground">Include this lesson in the cancellation</span>
        </Label>
      </div>
      {items.length > 0 && (
        <ul className="list-disc space-y-1 pl-9 text-sm text-muted-foreground" aria-label="Evidence for this lesson">
          {items.map((i, k) => (
            <li key={`${i.type}-${k}`} className="break-words">
              {describeEvidence(i)}
            </li>
          ))}
        </ul>
      )}
      {row.settled_any && <p className="pl-9 text-sm">This lesson is already billed or paid: a correction reason is needed.</p>}
      {row.review_required && <p className="pl-9 text-sm font-medium">This one goes to review.</p>}
      {ack.included && (
        <div className="space-y-4 pl-0 sm:pl-9">
          <ReasonField label="Reason for this lesson (required)" value={ack.reason} onChange={(v) => onChange({ reason: v })} min={min} disabled={disabled} />
          {needsCorrection && (
            <ReasonField
              label="Correction reason (required)"
              help="Billed, paid or closed payroll: explain what is being corrected."
              value={ack.correctionReason}
              onChange={(v) => onChange({ correctionReason: v })}
              min={min}
              disabled={disabled}
            />
          )}
          <ConfirmTick checked={ack.confirm} onChange={(v) => onChange({ confirm: v })} disabled={disabled}>
            I have looked at the evidence and this lesson did not take place.
          </ConfirmTick>
          {strong && <TypedDateField lessonDate={row.date} value={ack.typedDate} onChange={(v) => onChange({ typedDate: v })} disabled={disabled} />}
          {problem && (
            <p role="status" className="text-xs text-muted-foreground">
              {problem}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function BulkResultView({ result, className, onAgain }: { result: BulkResult; className: (id?: string) => string; onAgain: () => void }) {
  return (
    <div className="space-y-4" role="status">
      <p className="flex items-start gap-2 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          <strong>{result.done.length}</strong> {result.done.length === 1 ? "lesson was" : "lessons were"} cancelled.
          {result.refused.length ? ` ${result.refused.length} ${result.refused.length === 1 ? "was" : "were"} refused and left as they are.` : ""}
          {result.notAttempted.length ? ` ${result.notAttempted.length} ${result.notAttempted.length === 1 ? "was" : "were"} not attempted.` : ""}
        </span>
      </p>
      {result.stopped && (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold">The batch stopped part-way.</p>
          <p className="break-words">{errorText(result.stopped.code, result.stopped.message)} Lessons already cancelled stay cancelled; the rest were not changed.</p>
        </div>
      )}
      {result.tuitionFailed.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold">
            {result.tuitionFailed.length} {result.tuitionFailed.length === 1 ? "bill was" : "bills were"} not recalculated.
          </p>
          <p>Open Tuition and recalculate those families, or cancel again from a single lesson to use its retry.</p>
        </div>
      )}
      {result.refused.length > 0 && (
        <section aria-labelledby="bulk-res-refused" className="space-y-1">
          <h3 id="bulk-res-refused" className="text-sm font-semibold">Refused</h3>
          <ul className="space-y-1 text-sm">
            {result.refused.map((r) => (
              <li key={r.id} className="break-words rounded-lg border border-border p-2">
                {errorText(r.code)} <span className="text-xs text-muted-foreground">(code: {r.code ?? "unknown"})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.done.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {result.done.filter((d) => d.review_required).length > 0 ? `${result.done.filter((d) => d.review_required).length} went to review. ` : ""}
          Every cancellation is recorded with your name and reason.
        </p>
      )}
      <Button size="lg" className="min-h-12 w-full sm:w-auto" onClick={onAgain}>
        Start another check
      </Button>
    </div>
  );
}
