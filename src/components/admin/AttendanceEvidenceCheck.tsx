import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { functionRefusalText } from "@/lib/moneyGuard";
import {
  GAP_KINDS, GAP_LABEL, GAP_NEEDS_PERSON, firstRows, groupGaps, isNotInstalled, monthsOf, parseApplyResult, parseGapRows,
  type ApplyResult, type GapRow,
} from "@/lib/attendanceProof";

/**
 * Does the register agree with the evidence that a child was in the room? The database lists
 * (attendance_evidence_gaps) and fills in (attendance_apply_evidence); this card only shows.
 * Sits beside the bill check: a lesson without a mark is not billed.
 */
export function AttendanceEvidenceCheck() {
  const queryClient = useQueryClient();
  const [sinceStart, setSinceStart] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [plan, setPlan] = useState<ApplyResult | null>(null);
  const [done, setDone] = useState<ApplyResult | null>(null);
  const [showNoProof, setShowNoProof] = useState(false);
  const [shownPeople, setShownPeople] = useState(50);
  const [shownNoProof, setShownNoProof] = useState(50);
  // What happened to the bill after "Mark present" on an Excused mark, by row.
  const [billNote, setBillNote] = useState<Record<string, string>>({});

  const to = dayjs().tz().format("YYYY-MM-DD");
  const from = sinceStart ? "2020-01-01" : dayjs().tz().subtract(60, "day").format("YYYY-MM-DD");

  const gaps = useQuery({
    queryKey: ["attendance-evidence-gaps", from, to],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("attendance_evidence_gaps", { p_from: from, p_to: to });
      if (error) throw error;
      return parseGapRows(data);
    },
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["attendance-evidence-gaps"] });

  const markPresent = async (g: GapRow) => {
    setBusy(g.session_id + g.student_id);
    try {
      const { data, error } = await supabase.functions.invoke("mark-attendance", {
        body: { sessionId: g.session_id, studentId: g.student_id, status: "Present" },
      });
      if (error) throw new Error(await functionRefusalText(error, "The mark could not be saved"));
      if (data?.error) throw new Error(data.error);
      toast.success(`${g.student_name} marked present`);
      // An Excused lesson was not billed; Present is. Refresh that child's bill for that month, as the admin.
      if (g.current_status === "Excused" && g.lesson_date) {
        const key = g.session_id + g.student_id;
        const month = g.lesson_date.slice(0, 7);
        try {
          const { data: bill, error: billError } = await supabase.functions.invoke("calculate-tuition", {
            body: { studentId: g.student_id, month },
          });
          if (billError || bill?.error) throw new Error(billError?.message || bill?.error);
          setBillNote((p) => ({
            ...p,
            [key]: bill?.tuitionFrozen === true || bill?.held
              ? `${g.student_name}: the ${month} bill is held or frozen, so it was left as it is.`
              : `${g.student_name}: the ${month} bill was refreshed.`,
          }));
        } catch {
          setBillNote((p) => ({ ...p, [key]: `${g.student_name}: the ${month} bill could not be refreshed. Use the bill check to refresh it.` }));
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "The mark could not be saved");
    } finally {
      setBusy(null);
      await reload();
    }
  };

  const callApply = async (dryRun: boolean) => {
    const { data, error } = await (supabase.rpc as any)("attendance_apply_evidence", { p_from: from, p_to: to, p_dry_run: dryRun });
    if (error) throw error;
    return parseApplyResult(data);
  };

  const preview = async () => {
    setBusy("apply");
    setDone(null);
    try {
      setPlan(await callApply(true));
    } catch (e: any) {
      toast.error(e?.message || "The check could not run");
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    setBusy("apply");
    try {
      const r = await callApply(false);
      setDone(r);
      setPlan(null);
      toast.success(`${r?.inserted ?? 0} marks added, ${r?.corrected ?? 0} corrected.`);
    } catch (e: any) {
      toast.error(e?.message || "The marks could not be filled in");
    } finally {
      setBusy(null);
      await reload();
    }
  };

  const refreshMonth = async (month: string) => {
    setBusy("month" + month);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-month-bills", { body: { month } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Bills for ${month} refreshed.`);
    } catch (e: any) {
      toast.error(e?.message || `Bills for ${month} could not be refreshed`);
    } finally {
      setBusy(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tuition-bill-gaps"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] }),
      ]);
    }
  };

  if (gaps.isError) {
    const err = gaps.error as any;
    if (isNotInstalled(err, "attendance_evidence_gaps")) {
      return (
        <Card>
          <CardContent className="py-4 text-hec-small text-hec-ink-soft">This check is not installed yet.</CardContent>
        </Card>
      );
    }
    return (
      <Card role="alert" className="border-hec-warn/40">
        <CardContent className="flex items-start gap-3 py-4 text-hec-small">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" />
          <span>The attendance check could not run: {String(err?.message ?? "unknown error")}</span>
        </CardContent>
      </Card>
    );
  }

  if (gaps.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-hec-small text-hec-ink-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Checking the register against the evidence...
        </CardContent>
      </Card>
    );
  }

  const rows = gaps.data ?? [];
  const grouped = groupGaps(rows);
  const fixable = grouped.proof_no_mark.length + grouped.proof_contradicts_system.length;
  const needPerson = GAP_NEEDS_PERSON.flatMap((k) => grouped[k]);
  const current = dayjs().tz().format("YYYY-MM");
  const previous = dayjs().tz().subtract(1, "month").format("YYYY-MM");
  const months = monthsOf(done);

  const rangeControl = (
    <div className="flex flex-wrap items-center gap-2 text-hec-small text-hec-ink-soft">
      <span>{sinceStart ? "Since the start" : "Last 60 days"}</span>
      <Button variant="ghost" size="sm" onClick={() => { setSinceStart((v) => !v); setPlan(null); setDone(null); }}>
        {sinceStart ? "Show last 60 days" : "Show since the start"}
      </Button>
    </div>
  );

  if (rows.length === 0 && !done) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-hec-small">
          <CheckCircle2 aria-hidden className="h-4 w-4 text-hec-leaf" />
          <span>The register agrees with the evidence for every lesson in this range.</span>
          {rangeControl}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={needPerson.length ? "border-hec-warn/40" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-hec-warn" />
          Attendance and evidence
        </CardTitle>
        <CardDescription>
          A lesson is billed only when the child has a mark. This compares the marks with proof that a child was in
          the lesson, such as points given to them by their teacher. {rangeControl}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-hec-small">
          {GAP_KINDS.map((k) => (
            <li key={k} className="flex justify-between gap-3">
              <span>{GAP_LABEL[k]}</span>
              <span className="tabular-nums font-medium">{grouped[k].length}</span>
            </li>
          ))}
        </ul>

        {Object.keys(billNote).length > 0 && (
          <ul className="space-y-1 text-hec-small text-hec-ink-soft">
            {Object.values(billNote).map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}

        {needPerson.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-hec-small">
              <thead>
                <tr className="border-b border-hec-line text-left text-hec-ink-soft">
                  <th className="py-2 pr-3 font-medium">Child</th>
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Mark</th>
                  <th className="py-2 pr-3 font-medium">Evidence</th>
                  <th className="py-2 font-medium"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {firstRows(needPerson, shownPeople).map((g) => (
                  <tr key={g.kind + g.session_id + g.student_id} className="border-b border-hec-line/60 align-top">
                    <td className="py-2 pr-3">{g.student_name}</td>
                    <td className="py-2 pr-3">{g.class_name ?? "-"}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{g.lesson_date}</td>
                    <td className="py-2 pr-3">{g.current_status ?? "None"}</td>
                    <td className="py-2 pr-3">
                      {GAP_LABEL[g.kind]}
                      {g.summary && <div className="text-hec-ink-soft">{g.summary}</div>}
                    </td>
                    <td className="py-2 text-right">
                      {g.kind === "proof_contradicts_person" && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => markPresent(g)}>
                          {busy === g.session_id + g.student_id ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : "Mark present"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {needPerson.length > shownPeople && (
          <Button variant="ghost" size="sm" onClick={() => setShownPeople((n) => n + 50)}>
            Show more ({needPerson.length - shownPeople} left)
          </Button>
        )}

        {grouped.no_mark_no_proof.length > 0 && (
          <div className="text-hec-small">
            <Button variant="ghost" size="sm" onClick={() => setShowNoProof((v) => !v)}>
              {showNoProof ? "Hide" : "Show"} the {grouped.no_mark_no_proof.length} lessons with no mark and no proof
            </Button>
            {showNoProof && (
              <ul className="mt-2 space-y-1 text-hec-ink-soft">
                {firstRows(grouped.no_mark_no_proof, shownNoProof).map((g) => (
                  <li key={g.session_id + g.student_id}>
                    {g.student_name}, {g.class_name ?? "class"}, {g.lesson_date}
                  </li>
                ))}
                {grouped.no_mark_no_proof.length > shownNoProof && (
                  <li>
                    <Button variant="ghost" size="sm" onClick={() => setShownNoProof((n) => n + 50)}>
                      Show more ({grouped.no_mark_no_proof.length - shownNoProof} left)
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {fixable > 0 && !plan && (
          <Button onClick={preview} disabled={busy !== null} className="gap-2">
            {busy === "apply" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Fill in from proof
          </Button>
        )}

        {plan && (
          <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3 text-hec-small">
            <p>
              This would add {plan.inserted} {plan.inserted === 1 ? "mark" : "marks"} and correct {plan.corrected}.
              {plan.left_for_admin > 0 && ` ${plan.left_for_admin} would be left for you to check.`} Marks a person made
              are never changed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={apply} disabled={busy !== null || (plan.inserted + plan.corrected === 0)}>Confirm and fill in</Button>
              <Button variant="ghost" onClick={() => setPlan(null)} disabled={busy !== null}>Cancel</Button>
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3 text-hec-small">
            <p>Done: {done.inserted} marks added, {done.corrected} corrected.</p>
            {months.length > 0 ? (
              <>
                <p>The bills for these months need refreshing so they count the new marks: {months.join(", ")}.</p>
                <div className="flex flex-wrap gap-2">
                  {months.filter((m) => m === current || m === previous).map((m) => (
                    <Button key={m} size="sm" variant="outline" className="gap-2" disabled={busy !== null} onClick={() => refreshMonth(m)}>
                      {busy === "month" + m ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden className="h-4 w-4" />}
                      Refresh bills for {m}
                    </Button>
                  ))}
                </div>
                {months.some((m) => m !== current && m !== previous) && (
                  <p className="text-hec-ink-soft">
                    Earlier months are not refreshed automatically. Recalculate those children one by one
                    (Automation &gt; Manual Tuition Recalculation).
                  </p>
                )}
              </>
            ) : (
              <p>No bills are affected.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
