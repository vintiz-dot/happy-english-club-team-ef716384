/**
 * Admin > Voices: how far the lesson monitor's voice recognition has got and how accurate each
 * model is. Read only. The voiceprints stay on the school laptop; this page sees counts, rates and
 * each child's seconds of voice (see src/lib/voiceAdmin.ts and 20261126090000). Admin only.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dayjs } from "@/lib/date";
import {
  VOICE_RULES, childRows, headline, healthView, modelRows, nextSteps, readyToChoose, showPct, snapshotAge,
  type ChildState, type Overview, type Verdict,
} from "@/lib/voiceAdmin";

const db = supabase as any;
const KEY = ["voice-admin", "overview"] as const;

function useOverview() {
  return useQuery({
    queryKey: KEY,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<Overview> => {
      const { data, error } = await db.rpc("lesson_monitor_voice_overview");
      if (error) throw error;
      return data as Overview;
    },
  });
}

const VERDICT: Record<Verdict, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  usable: { label: "Usable", tone: "default" },
  "too-many-wrong": { label: "Names the wrong child too often", tone: "destructive" },
  "too-few": { label: "Too few answers to judge", tone: "secondary" },
  "no-answers": { label: "No answers yet", tone: "outline" },
};
const STATE: Record<ChildState, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  compared: { label: "Compared with", tone: "default" },
  learning: { label: "Learning", tone: "secondary" },
  "no-voice": { label: "No voice yet", tone: "outline" },
  withdrawn: { label: "Consent withdrawn", tone: "destructive" },
};

const Tile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-hec-md border border-hec-line bg-hec-surface p-4">
    <div className="text-2xl font-semibold tabular-nums">{value}</div>
    <div className="text-sm">{label}</div>
    {hint && <div className="mt-1 text-xs text-hec-ink-soft">{hint}</div>}
  </div>
);

/** The Lark mics engine (owner, 28 Nov 2026): last run, each recent lesson's mic tracks and how well they lined up,
 * processing time, and the shown model's precision by utterance length. Numbers only. */
function LarkHealth({ o }: { o: Overview }) {
  const h = healthView(o);
  if (!h) return null;
  const p = h.precision;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Four Lark mics: health</CardTitle>
        <CardDescription>
          Engine {h.engine ?? "–"}; last lesson worked {h.lastRun ? dayjs(h.lastRun).format("D MMM YYYY, HH:mm") : "never"}. A mic that lines up worse
          than {VOICE_RULES.residualMsLimit} ms, or is rejected, is left out of that lesson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {p && (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {p.meetsTarget ? <CheckCircle2 className="h-4 w-4 text-hec-leaf" aria-hidden /> : <AlertTriangle className="h-4 w-4 text-hec-brass" aria-hidden />}
              <span>
                {p.model ?? "Shown model"}: {p.precisionPct === null ? "no threshold reaches the target yet" : `${showPct(p.precisionPct)} right of what it names, covering ${showPct(p.coveragePct)} of child speech at ${p.threshold?.toFixed(2)}`}
                {" "}(target: at least {100 - VOICE_RULES.wrongPctLimit}% right; scored on {p.basis === "blind" ? "blind answers only" : "all answers"}).
              </span>
            </div>
            {p.buckets.length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-hec-ink-soft"><th className="py-1 pr-3">Length</th><th className="pr-3">Seconds</th><th className="pr-3">Right of named</th><th>Covered</th></tr></thead>
                <tbody>
                  {p.buckets.map((b) => (
                    <tr key={b.label} className="border-t border-hec-line">
                      <td className="py-1 pr-3">{b.label}</td><td className="pr-3 tabular-nums">{Math.round(b.seconds)}</td>
                      <td className="pr-3 tabular-nums">{showPct(b.precisionPct)}</td><td className="tabular-nums">{showPct(b.coveragePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {h.lessons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-hec-ink-soft"><th className="py-1 pr-3">Lesson</th><th className="pr-3">Mics lined up (ms)</th><th>Processing</th></tr></thead>
              <tbody>
                {h.lessons.map((l, i) => (
                  <tr key={`${l.date}-${i}`} className="border-t border-hec-line">
                    <td className="py-1 pr-3">{l.date ? dayjs(l.date).format("D MMM") : "–"}</td>
                    <td className="pr-3">
                      <div className="flex flex-wrap gap-1">
                        {l.residuals.map((r) => (
                          <Badge key={r.mic} variant={r.bad ? "destructive" : "secondary"}>
                            {r.mic}: {r.rejected ? r.rejected.replace(/_/g, " ") : r.ms === null ? "–" : `${r.ms.toFixed(1)}`}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="tabular-nums">{l.minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoicesTab() {
  const q = useOverview();
  const o = q.data;

  if (q.isLoading) {
    return <div className="flex items-center gap-2 p-6 text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading voice numbers...</div>;
  }
  if (q.isError || !o) {
    return (
      <Card>
        <CardHeader><CardTitle>Voices</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex gap-2 text-hec-danger"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> The voice numbers could not be read.</p>
          <p className="text-hec-ink-soft">
            Paste <code>supabase/migrations/20261126090000_voice_admin_overview.sql</code> in the Supabase SQL editor (after 20261124120000), then reload.
            {" "}{(q.error as any)?.message ? `The database said: ${(q.error as any).message}` : ""}
          </p>
          <Button size="sm" variant="outline" onClick={() => q.refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const h = headline(o);
  const models = modelRows(o);
  const kids = childRows(o);
  const age = snapshotAge(o, new Date());
  const choose = readyToChoose(o);
  const steps = nextSteps(o);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Voices</h1>
          <p className="text-sm text-hec-ink-soft max-w-2xl">
            How far the lesson monitor has got at telling children apart by voice, and how often it is right. Nothing here names a child to a
            family, and no voiceprint leaves the school laptop: this page shows counts and seconds only.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {age.stale && (
        <div className="flex gap-2 rounded-hec-md border border-hec-line bg-hec-surface p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-hec-danger" />
          <p>
            {o.snapshot
              ? `The laptop last sent its numbers ${Math.round(age.hours ?? 0)} hours ago, so each child's seconds and each model's accuracy may be out of date.`
              : "The laptop has not sent its numbers yet, so each child's seconds and each model's accuracy are not shown."}
            {" "}On the laptop, as <code>hec-pilot</code>: <code>voice_admin.py publish</code> (the overnight job also does it).
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Children with consent" value={String(h.consented)} hint={h.withdrawn ? `${h.withdrawn} withdrawn` : undefined} />
        <Tile label="Children known by voice" value={o.snapshot ? `${h.known} of ${h.consented}` : "–"} hint={`${VOICE_RULES.enrolMinS}+ seconds of voice on file`} />
        <Tile label="Voice groups made" value={String(h.groups)} hint={`${h.reportsWithVoices} of ${h.reportsTotal} reports have voices`} />
        <Tile label="Answered by teachers" value={String(h.answered)} hint={`${h.learned} taught the laptop`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it stands</CardTitle>
          <CardDescription>In the order things have to happen.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {steps.map((s) => (
              <li key={s.text} className="flex gap-2">
                {s.done ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-hec-success" /> : <Circle className="h-4 w-4 mt-0.5 shrink-0 text-hec-ink-soft" />}
                <span className={s.done ? "text-hec-ink-soft" : ""}>{s.text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accuracy by model</CardTitle>
          <CardDescription>
            Each model is scored in secret against the teachers' answers, over groups answered as one child. "Wrong" means it would have named the
            wrong child; more than {VOICE_RULES.wrongPctLimit}% is too many to show teachers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {models.length === 0 ? (
            <p className="text-sm text-hec-ink-soft">No scored answers yet. Teachers answer voice groups on a lesson report; each answer scores every model.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-hec-ink-soft">
                    <th className="py-1 pr-3">Model</th><th className="pr-3">Answers</th><th className="pr-3">Right</th><th className="pr-3">Wrong</th>
                    <th className="pr-3">Not sure</th><th className="pr-3">Threshold</th><th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.model} className="border-t border-hec-line align-top">
                      <td className="py-2 pr-3 font-medium">
                        {m.model}{m.shown && <Badge variant="outline" className="ml-2">shown to teachers</Badge>}
                      </td>
                      <td className="pr-3 tabular-nums">{m.n}</td>
                      <td className="pr-3 tabular-nums">{showPct(m.right)}</td>
                      <td className="pr-3 tabular-nums">{showPct(m.wrong)}</td>
                      <td className="pr-3 tabular-nums">{showPct(m.notSure)}</td>
                      <td className="pr-3 tabular-nums">{m.threshold.toFixed(3)}</td>
                      <td>
                        <Badge variant={VERDICT[m.verdict].tone}>{VERDICT[m.verdict].label}</Badge>
                        {m.verdict === "too-many-wrong" && m.saferThreshold !== null && (
                          <div className="mt-1 text-xs text-hec-ink-soft">Wrong stays within 1 in 50 from threshold {m.saferThreshold.toFixed(2)}.</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm">
            {choose.ready
              ? <>Enough answers to choose. On the numbers so far, <b>{choose.best}</b> is the most often right among the models that are not wrong too often.</>
              : <>{choose.answers} of about {VOICE_RULES.judgeAfter} answered groups needed before the models can be compared fairly.</>}
          </p>
          <p className="text-xs text-hec-ink-soft">
            Changing the model teachers see, or a threshold, is one line in <code>scripts/lesson-monitor/voice.py</code> on the laptop (<code>shown_model</code>, <code>thresholds</code>).
          </p>
          {o.groups.suggested_answered_child > 0 && (
            <p className="text-sm">
              The guess teachers were actually shown matched their answer {o.groups.suggested_right} of {o.groups.suggested_answered_child} times ({showPct(h.shownPct)}).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Children</CardTitle>
          <CardDescription>
            Only children with a voiceprint consent record. A child is compared once the laptop holds {VOICE_RULES.enrolMinS} seconds of their voice; a minute or more is better.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kids.length === 0 ? (
            <p className="text-sm text-hec-ink-soft">No voiceprint consent has been recorded yet (<code>voice_admin.py consent-all</code>).</p>
          ) : (
            <ul className="divide-y divide-hec-line">
              {kids.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-48 font-medium">{k.name}</span>
                  <Badge variant={STATE[k.state].tone}>{STATE[k.state].label}</Badge>
                  <div className="flex min-w-40 flex-1 items-center gap-2">
                    <Progress value={k.fraction * 100} className="h-2" />
                    <span className="w-24 text-right tabular-nums text-hec-ink-soft">{k.seconds === null ? "–" : `${Math.round(k.seconds)} s`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LarkHealth o={o} />

      {o.by_class.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By class</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-hec-ink-soft"><th className="py-1 pr-3">Class</th><th className="pr-3">Groups</th><th className="pr-3">Answered</th><th className="pr-3">Shown guess right</th><th>Last lesson</th></tr>
              </thead>
              <tbody>
                {o.by_class.map((c) => (
                  <tr key={c.class_id} className="border-t border-hec-line">
                    <td className="py-2 pr-3 font-medium">{c.class_name ?? "Class"}</td>
                    <td className="pr-3 tabular-nums">{c.groups}</td>
                    <td className="pr-3 tabular-nums">{c.answered}</td>
                    <td className="pr-3 tabular-nums">{c.suggested_answered_child ? `${c.suggested_right} of ${c.suggested_answered_child}` : "–"}</td>
                    <td>{c.last_lesson ? dayjs(c.last_lesson).format("D MMM YYYY") : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {o.snapshot && (
        <p className="text-xs text-hec-ink-soft">Laptop numbers published {dayjs(o.snapshot.published_at).format("D MMM YYYY, HH:mm")}.</p>
      )}
    </div>
  );
}
