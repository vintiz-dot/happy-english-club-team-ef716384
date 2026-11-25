import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useDecideMatch, useTranscriptMatching, type MatchRow } from "@/hooks/useTranscriptMatching";
import { dayjs } from "@/lib/date";

/**
 * /transcript-matching - the older transcripts (pasted meetings and audio uploads, none of
 * which carries a lesson) that could not be tied to a lesson for certain. For each one a
 * person picks the lesson, or says it belongs to none. The choice is kept on the transcript
 * (analysis.session_match) and the Class report page follows it. See useTranscriptMatching.
 */
const card = "rounded-hec-md border border-hec-line bg-hec-surface p-4 space-y-3";
const when = (s: { date: string; start_time: string | null }) => `${dayjs(s.date).format("ddd D MMM")} · ${String(s.start_time ?? "").slice(0, 5)}`;
const HOW: Record<string, string> = {
  meeting: "the meeting's own date", date: "the only lesson on the filing date", chosen: "your choice", stored: "the link in the database",
};

function Row({ r, lessonName }: { r: MatchRow; lessonName: (id: string | null) => string }) {
  const { user } = useAuth() as any;
  const decide = useDecideMatch();
  const [pick, setPick] = useState<string>(r.suggestion ?? "");
  const save = async (sessionId: string | null | undefined, done: string) => {
    try {
      await decide.mutateAsync({ id: r.t.id, analysis: r.t.analysis, sessionId, by: user?.id ?? "" });
      toast.success(done);
    } catch (e: any) {
      toast.error(e?.message ?? "That could not be saved");
    }
  };
  return (
    <li className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{r.className || "Class"}</span>
        <Badge variant="outline">filed {dayjs(r.t.transcript_date).format("D MMM YYYY")}</Badge>
        <Badge variant="outline">{r.t.source_format}</Badge>
        {r.t.status !== "analyzed" && <Badge variant="outline">{r.t.status}</Badge>}
        {r.stamp && <Badge variant="secondary">meeting date in the text</Badge>}
      </div>
      {(r.t.title || r.t.summary) && <p className="text-sm text-hec-ink-soft line-clamp-3">{r.t.title ? `${r.t.title}. ` : ""}{r.t.summary ?? ""}</p>}
      {r.twinOfClass !== null && (
        <p className="flex gap-2 text-sm text-hec-danger">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          The same recording (same length to the hundredth of a second) is also filed under {r.twinOfClass || "another class"}. It is filed wrongly under at least one of the two.
        </p>
      )}
      {r.sessionId ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Matched to <b>{lessonName(r.sessionId)}</b> by {HOW[r.how ?? ""] ?? ""}.</span>
          {r.how === "chosen" && <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => save(undefined, "Decision removed")}>Undo</Button>}
          {r.how !== "stored" && r.how !== "chosen" && <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => save(null, "Marked as no lesson of this class")}>Not this lesson</Button>}
        </div>
      ) : r.none ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>You said this is not a lesson of this class.</span>
          <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => save(undefined, "Decision removed")}>Undo</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="min-w-56 flex-1" aria-label="Lesson"><SelectValue placeholder="Which lesson was it?" /></SelectTrigger>
            <SelectContent>
              {r.candidates.map((s) => <SelectItem key={s.id} value={s.id}>{when(s)}{s.id === r.suggestion ? "  (the day before it was filed)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!pick || decide.isPending} onClick={() => save(pick, `Matched to ${lessonName(pick)}`)}>
            {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Match"}
          </Button>
          <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => save(null, "Marked as no lesson of this class")}>None of these</Button>
        </div>
      )}
    </li>
  );
}

export default function TranscriptMatching() {
  const q = useTranscriptMatching();
  const d = q.data;
  const names = new Map<string, string>();
  for (const r of [...(d?.needs ?? []), ...(d?.decided ?? []), ...(d?.auto ?? [])]) {
    for (const s of r.candidates) names.set(s.id, `${r.className} · ${when(s)}`);
  }
  const lessonName = (id: string | null) => (id ? names.get(id) ?? "that lesson" : "");
  return (
    <Layout title="Match transcripts">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <Link to="/schedule" className="inline-flex items-center gap-1 text-sm text-hec-ink-soft hover:underline"><ArrowLeft className="h-4 w-4" /> Schedule</Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Match transcripts to lessons</h1>
          <p className="text-sm text-hec-ink-soft">
            Older transcripts were saved without the lesson they belong to. The ones below could not be tied to a lesson for certain. Pick the lesson and its Class report fills in. This changes nothing about the lesson itself (attendance, pay, billing).
          </p>
        </header>
        {q.isLoading && <p className="flex items-center gap-2 text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
        {q.error && <p className="text-sm text-hec-danger">The transcripts could not be loaded. Reload to try again.</p>}
        {d && (
          <>
            <section className="space-y-2" aria-label="Needs a decision">
              <h2 className="font-semibold">Needs your decision ({d.needs.length})</h2>
              {d.needs.length === 0 && <p className="text-sm text-hec-ink-soft">Nothing left to match.</p>}
              <ul className="space-y-2">{d.needs.map((r) => <Row key={r.t.id} r={r} lessonName={lessonName} />)}</ul>
            </section>
            {d.decided.length > 0 && (
              <section className="space-y-2" aria-label="Decided">
                <h2 className="font-semibold">Decided ({d.decided.length})</h2>
                <ul className="space-y-2">{d.decided.map((r) => <Row key={r.t.id} r={r} lessonName={lessonName} />)}</ul>
              </section>
            )}
            {d.auto.length > 0 && (
              <details className="space-y-2">
                <summary className="cursor-pointer font-semibold">Matched automatically ({d.auto.length})</summary>
                <ul className="space-y-2 mt-2">{d.auto.map((r) => <Row key={r.t.id} r={r} lessonName={lessonName} />)}</ul>
              </details>
            )}
            {d.unusable > 0 && <p className="text-xs text-hec-ink-soft">{d.unusable} upload{d.unusable === 1 ? "" : "s"} still waiting for their text {d.unusable === 1 ? "was" : "were"} left out.</p>}
          </>
        )}
      </div>
    </Layout>
  );
}
