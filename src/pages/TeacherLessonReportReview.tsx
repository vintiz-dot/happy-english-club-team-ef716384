import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Loader2, Lock, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LessonPhotoCapture from "@/components/lessonReports/LessonPhotoCapture";
import LessonPlanPicker from "@/components/lessonReports/LessonPlanPicker";
import { mmss } from "@/lib/lessonMonitor";
import {
  approvalProblems, buildApproval, readDraft, type Draft, type Met, type QuizKind, type QuizQuestion, type Review,
} from "@/lib/lessonReportApproval";
import {
  useApprovedReport, useApproveReport, useBuildDraft, useLessonDraft, useLessonInfo, useLessonPhotos,
  useLessonRecords, useLessonReportTeacherCan,
} from "@/hooks/useLessonReport";

/**
 * /teacher/lesson-report/:sessionId - stage A of lesson reports
 * (docs/LESSON_REPORTS.md). The teacher builds the AI's draft, checks and
 * edits every section, decides each name suggestion, picks the photos to
 * share, edits the review quiz and approves. Approval is the only way
 * anything reaches a family; what it sends is decided by
 * src/lib/lessonReportApproval.ts, which keeps staff-only parts out of what
 * families read. A TA sees the draft and adds photos but cannot build or approve.
 */
const card = "rounded-lg border bg-card p-4 space-y-3";
const MET: Met[] = ["yes", "partly", "no", "unknown"];

function StaffOnly() {
  return <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Staff only</Badge>;
}

function Section({ title, staff, children, action }: { title: string; staff?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {staff && <StaffOnly />}
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

type Field<T> = { key: keyof T & string; label: string; area?: boolean };
function ListEditor<T extends Record<string, any>>({ items, fields, blank, onChange, max = 30 }: {
  items: T[]; fields: Field<T>[]; blank: T; onChange: (items: T[]) => void; max?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-md border p-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {fields.map((f) => {
              const props = {
                value: String(it[f.key] ?? ""), placeholder: f.label, "aria-label": f.label,
                onChange: (e: { target: { value: string } }) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x))),
              };
              return f.area ? <Textarea key={f.key} rows={2} {...props} /> : <Input key={f.key} {...props} />;
            })}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      )}
    </div>
  );
}

const EN_VI: Field<{ en: string; vi: string }>[] = [{ key: "en", label: "English", area: true }, { key: "vi", label: "Tiếng Việt", area: true }];

export default function TeacherLessonReportReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const lesson = useLessonInfo(sessionId);
  const teacherCan = useLessonReportTeacherCan(sessionId);
  const draftRow = useLessonDraft(sessionId);
  const approved = useApprovedReport(sessionId);
  const photos = useLessonPhotos(sessionId);
  const buildDraft = useBuildDraft(sessionId ?? "");
  const approve = useApproveReport(sessionId ?? "");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [review, setReview] = useState<Review>({ comments: {}, excluded: [], quiz: { include: true, due_date: null, points: 10, body: null } });
  const row = draftRow.data;
  const loadedRun = row?.status === "ready" ? row.run : null;
  useEffect(() => {
    if (loadedRun === null || !row) return;
    const d = readDraft(row.body);
    setDraft(d);
    setReview((r) => ({ ...r, comments: {}, excluded: d.students.filter((s) => s.attendance === "Absent").map((s) => s.student_id) }));
    // Load a run's draft once; a refetch of the same run must not wipe the teacher's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedRun]);

  const workIds = useMemo(() => [...new Set((draft?.students ?? []).flatMap((s) => s.work_ids))], [draft]);
  const records = useLessonRecords(lesson.data, workIds);
  const names = records.data?.names ?? {};
  const photoUrl = useMemo(() => new Map((photos.data ?? []).map((p) => [p.id, p.url])), [photos.data]);

  const edit = (fn: (d: Draft) => void) => setDraft((d) => { if (!d) return d; const c = structuredClone(d); fn(c); return c; });
  const canEdit = teacherCan.data === true;
  const problems = draft ? approvalProblems(draft, review) : [];

  const onBuild = async () => {
    const redo = !!approved.data;
    if (draft && !window.confirm(redo
      ? "This lesson's report is already approved. Build a new draft? Families keep seeing the approved report until you approve again."
      : "Build a new draft? Your edits to this one will be lost.")) return;
    try {
      await buildDraft.mutateAsync(redo);
      toast.success("Building the draft. This takes a minute or two.");
    } catch (e: any) {
      toast.error(e?.message ?? "The draft could not be started");
    }
  };

  const onApprove = async () => {
    if (!draft || !sessionId || !records.data) return;
    if (problems.length) { toast.error(problems[0]); return; }
    if (!window.confirm("Approve this report? Each family will see the class part and their own child's part, and the review quiz is set as homework.")) return;
    const args = buildApproval(draft, review, {
      sessionId, enrolled: records.data.enrolled, workOwner: records.data.workOwner,
      lessonPhotoIds: (photos.data ?? []).map((p) => p.id), model: row?.model ?? null,
    });
    try {
      await approve.mutateAsync(args);
      toast.success("Report approved and shared with families");
    } catch (e: any) {
      toast.error(e?.message ?? "The report could not be approved");
    }
  };

  if (!sessionId) return null;
  const L = lesson.data;

  return (
    <Layout title="Lesson report">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <Link to="/teacher/attendance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Lessons
        </Link>
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="text-2xl font-semibold">Lesson report</h1>
            <p className="text-sm text-muted-foreground">
              {L ? `${L.class_name} · ${L.date} · ${String(L.start_time).slice(0, 5)}-${String(L.end_time).slice(0, 5)}` : lesson.isLoading ? "Loading…" : "Lesson not found"}
            </p>
          </div>
          {approved.data && (
            <Badge className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved {new Date(approved.data.approved_at).toLocaleString()}</Badge>
          )}
          {canEdit && (
            <Button onClick={() => onBuild()} disabled={buildDraft.isPending || row?.status === "building"}>
              {buildDraft.isPending || row?.status === "building" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : row ? <RefreshCw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {row ? "Rebuild" : "Build report"}
            </Button>
          )}
        </header>

        {L && (
          <Section title="What this lesson covered" staff>
            <LessonPlanPicker sessionId={sessionId} classId={L.class_id} date={L.date} canEdit={canEdit} />
          </Section>
        )}

        {L && (
          <Section title="Lesson photos" staff>
            <LessonPhotoCapture sessionId={sessionId} classId={L.class_id} />
          </Section>
        )}

        {draftRow.error ? (
          <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">Lesson reports are not switched on yet. Ask the school's admin to apply the latest database update.</p>
        ) : row?.status === "building" ? (
          <p className={card + " text-sm flex items-center gap-2"}><Loader2 className="h-4 w-4 animate-spin" /> The draft is being written from the lesson's transcript, photos, work and records…</p>
        ) : row?.status === "failed" && !draft ? (
          <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> The draft could not be built{row.error ? `: ${row.error}` : "."}</p>
        ) : !row ? (
          <p className={card + " text-sm text-muted-foreground"}>
            {canEdit ? "No draft yet. Add photos of the board and materials, then press Build report." : "No draft yet. The class's teacher builds and approves the report."}
          </p>
        ) : null}

        {draft && row?.status === "failed" && (
          <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> The last rebuild failed{row.error ? `: ${row.error}` : ""}. This is the earlier draft.</p>
        )}
        {draft && (
          <fieldset disabled={!canEdit || approve.isPending} className="space-y-4">
            <Sources draft={draft} model={row?.model ?? null} />

            <Section title="The lesson">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={draft.lesson.title} placeholder="Title" aria-label="Title" onChange={(e) => edit((d) => { d.lesson.title = e.target.value; })} />
                <Input value={draft.lesson.title_vi} placeholder="Tiêu đề" aria-label="Title in Vietnamese" onChange={(e) => edit((d) => { d.lesson.title_vi = e.target.value; })} />
                <Textarea rows={4} value={draft.lesson.summary} placeholder="Summary" aria-label="Summary" onChange={(e) => edit((d) => { d.lesson.summary = e.target.value; })} />
                <Textarea rows={4} value={draft.lesson.summary_vi} placeholder="Tóm tắt" aria-label="Summary in Vietnamese" onChange={(e) => edit((d) => { d.lesson.summary_vi = e.target.value; })} />
              </div>
            </Section>

            <Section title="Objectives (2-4)">
              {draft.objectives.map((o, i) => (
                <div key={i} className="rounded-md border p-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input value={o.text} placeholder="Objective" aria-label="Objective" onChange={(e) => edit((d) => { d.objectives[i].text = e.target.value; })} />
                      <Input value={o.text_vi} placeholder="Mục tiêu" aria-label="Objective in Vietnamese" onChange={(e) => edit((d) => { d.objectives[i].text_vi = e.target.value; })} />
                    </div>
                    <Select value={o.met} onValueChange={(v) => edit((d) => { d.objectives[i].met = v as Met; })}>
                      <SelectTrigger className="w-28" aria-label="Met"><SelectValue /></SelectTrigger>
                      <SelectContent>{MET.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove objective" onClick={() => edit((d) => { d.objectives.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {o.evidence && <p className="text-xs text-muted-foreground"><Lock className="inline h-3 w-3 mr-1" />Evidence (staff only): {o.evidence}</p>}
                </div>
              ))}
              {draft.objectives.length < 4 && (
                <Button type="button" variant="outline" size="sm" onClick={() => edit((d) => { d.objectives.push({ text: "", text_vi: "", met: "unknown", evidence: "" }); })}>
                  <Plus className="h-4 w-4 mr-1" /> Add objective
                </Button>
              )}
            </Section>

            <Section title="What was taught">
              <ListEditor items={draft.taught} blank={{ topic: "", detail: "", detail_vi: "" }}
                fields={[{ key: "topic", label: "Topic" }, { key: "detail", label: "Detail", area: true }, { key: "detail_vi", label: "Chi tiết", area: true }]}
                onChange={(v) => edit((d) => { d.taught = v; })} />
            </Section>
            <Section title="Words">
              <ListEditor items={draft.words} blank={{ en: "", vi: "", example: "" }}
                fields={[{ key: "en", label: "Word" }, { key: "vi", label: "Tiếng Việt" }, { key: "example", label: "Example" }]}
                onChange={(v) => edit((d) => { d.words = v; })} />
            </Section>
            <Section title="Structures">
              <ListEditor items={draft.structures} blank={{ pattern: "", example: "" }}
                fields={[{ key: "pattern", label: "Pattern" }, { key: "example", label: "Example" }]}
                onChange={(v) => edit((d) => { d.structures = v; })} />
            </Section>
            <Section title="Activities">
              <ListEditor items={draft.activities} blank={{ name: "", description: "", description_vi: "" }}
                fields={[{ key: "name", label: "Activity" }, { key: "description", label: "Description", area: true }, { key: "description_vi", label: "Mô tả", area: true }]}
                onChange={(v) => edit((d) => { d.activities = v; })} />
            </Section>

            <Section title="Gaps and misconceptions" staff>
              {draft.gaps.length === 0 && <p className="text-sm text-muted-foreground">None found in the evidence.</p>}
              {draft.gaps.map((g, i) => (
                <div key={i} className="rounded-md border p-2 space-y-2">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{g.kind}</Badge>
                    <Badge variant="outline">{g.who === "class" ? "most of the class" : "some children"}</Badge>
                    <Button type="button" className="ml-auto" variant="ghost" size="icon" aria-label="Remove gap" onClick={() => edit((d) => { d.gaps.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Input value={g.issue} aria-label="Issue" onChange={(e) => edit((d) => { d.gaps[i].issue = e.target.value; })} />
                  <ul className="space-y-1 text-sm">
                    {g.evidence.map((e, j) => (
                      <li key={j} className="rounded bg-muted px-2 py-1"><span className="font-mono text-xs mr-2">{e.t >= 0 ? mmss(e.t) : "work"}</span>“{e.quote}”</li>
                    ))}
                  </ul>
                  <Textarea rows={2} value={g.suggestion} placeholder="Suggestion for next time" aria-label="Suggestion" onChange={(e) => edit((d) => { d.gaps[i].suggestion = e.target.value; })} />
                </div>
              ))}
            </Section>

            <Section title="Class focus, for families">
              <ListEditor items={draft.class_focus} blank={{ en: "", vi: "" }} fields={EN_VI} onChange={(v) => edit((d) => { d.class_focus = v; })} max={6} />
            </Section>

            <Section title="Each child">
              <p className="text-xs text-muted-foreground">A family sees only their own child's card. Untick a child to leave them out.</p>
              {draft.students.map((s, i) => {
                const included = !review.excluded.includes(s.student_id);
                return (
                  <div key={s.student_id} className="rounded-md border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox checked={included} aria-label="Include this child"
                        onCheckedChange={(v) => setReview((r) => ({ ...r, excluded: v ? r.excluded.filter((x) => x !== s.student_id) : [...r.excluded, s.student_id] }))} />
                      <span className="font-medium">{names[s.student_id] || "Child"}</span>
                      <Badge variant="outline">{s.attendance}</Badge>
                      <Badge variant="outline">{s.points} pts</Badge>
                      {s.work_ids.length > 0 && <Badge variant="outline">{s.work_ids.length} work</Badge>}
                    </div>
                    {included && (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Textarea rows={2} value={s.highlight} placeholder="Highlight" aria-label="Highlight" onChange={(e) => edit((d) => { d.students[i].highlight = e.target.value; })} />
                          <Textarea rows={2} value={s.highlight_vi} placeholder="Điểm nổi bật" aria-label="Highlight in Vietnamese" onChange={(e) => edit((d) => { d.students[i].highlight_vi = e.target.value; })} />
                          <Textarea rows={2} value={s.focus_next} placeholder="Focus next" aria-label="Focus next" onChange={(e) => edit((d) => { d.students[i].focus_next = e.target.value; })} />
                          <Textarea rows={2} value={s.focus_next_vi} placeholder="Cần tập trung" aria-label="Focus next in Vietnamese" onChange={(e) => edit((d) => { d.students[i].focus_next_vi = e.target.value; })} />
                        </div>
                        <Textarea rows={2} value={review.comments[s.student_id] ?? ""} placeholder="Your comment for this family" aria-label="Teacher comment"
                          onChange={(e) => setReview((r) => ({ ...r, comments: { ...r.comments, [s.student_id]: e.target.value } }))} />
                        {s.name_moments.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">Name suggestions <StaffOnly /></div>
                            {s.name_moments.map((m, j) => (
                              <div key={j} className={"flex flex-wrap items-center gap-2 rounded bg-muted px-2 py-1 text-sm" + (m.decision === "deleted" ? " opacity-50 line-through" : "")}>
                                <span className="font-mono text-xs">{mmss(m.t)}</span>
                                <span className="flex-1">“{m.quote}”{m.why ? <span className="text-muted-foreground"> - {m.why}</span> : null}</span>
                                <Button type="button" size="sm" variant={m.decision === "accepted" ? "default" : "outline"}
                                  onClick={() => edit((d) => { d.students[i].name_moments[j].decision = "accepted"; })}><Check className="h-3.5 w-3.5 mr-1" />Accept</Button>
                                <Button type="button" size="sm" variant={m.decision === "deleted" ? "destructive" : "outline"}
                                  onClick={() => edit((d) => { d.students[i].name_moments[j].decision = "deleted"; })}><X className="h-3.5 w-3.5 mr-1" />Delete</Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </Section>

            <Section title="For parents">
              <h3 className="text-sm font-medium">Tips for home</h3>
              <ListEditor items={draft.parents.tips} blank={{ en: "", vi: "" }} fields={EN_VI} onChange={(v) => edit((d) => { d.parents.tips = v; })} max={4} />
              <h3 className="text-sm font-medium">Ask your child</h3>
              <ListEditor items={draft.parents.ask_your_child} blank={{ en: "", vi: "" }} fields={EN_VI} onChange={(v) => edit((d) => { d.parents.ask_your_child = v; })} max={4} />
              <h3 className="text-sm font-medium">Next lesson</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Textarea rows={2} value={draft.parents.next_lesson.en} aria-label="Next lesson" onChange={(e) => edit((d) => { d.parents.next_lesson.en = e.target.value; })} />
                <Textarea rows={2} value={draft.parents.next_lesson.vi} aria-label="Next lesson in Vietnamese" onChange={(e) => edit((d) => { d.parents.next_lesson.vi = e.target.value; })} />
              </div>
              {draft.homework.length > 0 && (
                <>
                  <h3 className="text-sm font-medium">Homework set today</h3>
                  <ul className="text-sm list-disc pl-5">{draft.homework.map((h, i) => <li key={i}>{h.title}{h.due_date ? ` (due ${h.due_date})` : ""}</li>)}</ul>
                </>
              )}
            </Section>

            <Section title="Photos to share">
              {draft.photos.length === 0 && <p className="text-sm text-muted-foreground">No photos were in this draft. Rebuild after adding photos to include them.</p>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {draft.photos.map((p, i) => (
                  <li key={p.photo_id} className="flex gap-2 rounded-md border p-2">
                    <Checkbox checked={p.share} aria-label="Share this photo" onCheckedChange={(v) => edit((d) => { d.photos[i].share = !!v; })} />
                    {photoUrl.get(p.photo_id) ? <img src={photoUrl.get(p.photo_id)!} alt="" className="h-16 w-16 rounded object-cover" />
                      : <div className="h-16 w-16 rounded bg-muted text-xs flex items-center justify-center text-center">deleted</div>}
                    <div className="flex-1 space-y-1">
                      <Input value={p.caption} placeholder="Caption" aria-label="Caption" onChange={(e) => edit((d) => { d.photos[i].caption = e.target.value; })} />
                      <Input value={p.caption_vi} placeholder="Chú thích" aria-label="Caption in Vietnamese" onChange={(e) => edit((d) => { d.photos[i].caption_vi = e.target.value; })} />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <QuizEditor draft={draft} review={review} setReview={setReview} edit={edit} objectives={draft.objectives.length} />

            {canEdit && (
              <section className={card}>
                {problems.length > 0 && (
                  <ul className="text-sm text-destructive list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
                )}
                <Button className="w-full" onClick={() => onApprove()} disabled={approve.isPending || problems.length > 0 || !records.data}>
                  {approve.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {approved.data ? "Approve again" : "Approve and share with families"}
                </Button>
              </section>
            )}
          </fieldset>
        )}
      </div>
    </Layout>
  );
}

function Sources({ draft, model }: { draft: Draft; model: string | null }) {
  const s = draft.sources as Record<string, unknown>;
  return (
    <section className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
      <div className="flex items-center gap-2"><StaffOnly /> Built from</div>
      <p>
        Transcript: {s.transcript ? `${s.transcript_lines ?? 0} lines` : "none"}
        {" · "}Photos: {String(s.photos ?? 0)} · Work: {String(s.works ?? 0)} · Attendance marks: {String(s.attendance ?? 0)} · Children with points: {String(s.points ?? 0)}
        {model ? ` · ${model}` : ""}
      </p>
      {typeof s.transcript_note === "string" && <p>{s.transcript_note}</p>}
      <p>The AI wrote this from the records. Check every line before approving.</p>
    </section>
  );
}

function QuizEditor({ draft, review, setReview, edit, objectives }: {
  draft: Draft; review: Review; setReview: (fn: (r: Review) => Review) => void; edit: (fn: (d: Draft) => void) => void; objectives: number;
}) {
  const q = review.quiz;
  const setQ = (patch: Partial<Review["quiz"]>) => setReview((r) => ({ ...r, quiz: { ...r.quiz, ...patch } }));
  const blank: QuizQuestion = { id: "", kind: "choice", prompt: "", prompt_vi: "", options: ["", ""], answer: "", explain: "", explain_vi: "", objective: 0 };
  return (
    <Section title="Review quiz (set as homework)" action={
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={q.include} onCheckedChange={(v) => setQ({ include: !!v })} /> Set it</label>
    }>
      {q.include && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input value={draft.quiz.title} aria-label="Quiz title" placeholder="Title" onChange={(e) => edit((d) => { d.quiz.title = e.target.value; })} />
            <Input type="date" value={q.due_date ?? ""} aria-label="Due date" onChange={(e) => setQ({ due_date: e.target.value || null })} />
            <Input type="number" min={0} max={50} value={q.points ?? ""} aria-label="Points" placeholder="Points"
              onChange={(e) => setQ({ points: e.target.value === "" ? null : Math.max(0, Math.min(50, Number(e.target.value))) })} />
          </div>
          {draft.quiz.questions.map((x, i) => (
            <div key={i} className="rounded-md border p-2 space-y-2">
              <div className="flex gap-2">
                <span className="text-sm font-medium self-center">Q{i + 1}</span>
                <Select value={x.kind} onValueChange={(v) => edit((d) => { d.quiz.questions[i].kind = v as QuizKind; })}>
                  <SelectTrigger className="w-32" aria-label="Kind"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choice">Choice</SelectItem><SelectItem value="gap">Fill the gap</SelectItem><SelectItem value="order">Put in order</SelectItem>
                  </SelectContent>
                </Select>
                {objectives > 0 && (
                  <Select value={String(x.objective)} onValueChange={(v) => edit((d) => { d.quiz.questions[i].objective = Number(v); })}>
                    <SelectTrigger className="w-32" aria-label="Objective"><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: objectives }, (_, k) => <SelectItem key={k} value={String(k)}>Objective {k + 1}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Button type="button" className="ml-auto" variant="ghost" size="icon" aria-label="Delete question" onClick={() => edit((d) => { d.quiz.questions.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={x.prompt} placeholder={x.kind === "gap" ? "Question with ___ for the gap" : "Question"} aria-label="Question" onChange={(e) => edit((d) => { d.quiz.questions[i].prompt = e.target.value; })} />
                <Input value={x.prompt_vi} placeholder="Gợi ý tiếng Việt" aria-label="Question in Vietnamese" onChange={(e) => edit((d) => { d.quiz.questions[i].prompt_vi = e.target.value; })} />
              </div>
              {x.kind !== "gap" && (
                <Textarea rows={3} value={x.options.join("\n")} aria-label={x.kind === "order" ? "Pieces, one per line (shuffled)" : "Choices, one per line"}
                  placeholder={x.kind === "order" ? "Pieces, one per line (shuffled)" : "Choices, one per line"}
                  onChange={(e) => edit((d) => { d.quiz.questions[i].options = e.target.value.split("\n"); })} />
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={x.answer} placeholder={x.kind === "order" ? "The sentence in order" : "Answer"} aria-label="Answer" onChange={(e) => edit((d) => { d.quiz.questions[i].answer = e.target.value; })} />
                {x.kind === "gap" && (
                  <Input value={(x.accept ?? []).join(", ")} placeholder="Also accept (comma separated)" aria-label="Also accept"
                    onChange={(e) => edit((d) => { d.quiz.questions[i].accept = e.target.value.split(",").map((a) => a.trim()).filter(Boolean); })} />
                )}
                <Input value={x.explain} placeholder="Explanation" aria-label="Explanation" onChange={(e) => edit((d) => { d.quiz.questions[i].explain = e.target.value; })} />
                <Input value={x.explain_vi} placeholder="Giải thích" aria-label="Explanation in Vietnamese" onChange={(e) => edit((d) => { d.quiz.questions[i].explain_vi = e.target.value; })} />
              </div>
            </div>
          ))}
          {draft.quiz.questions.length < 15 && (
            <Button type="button" variant="outline" size="sm" onClick={() => edit((d) => { d.quiz.questions.push({ ...blank, id: `q${d.quiz.questions.length + 1}` }); })}>
              <Plus className="h-4 w-4 mr-1" /> Add question
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
