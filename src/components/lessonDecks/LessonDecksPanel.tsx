import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UNITS, unitKey, unitLabel } from "@/content/lessonDecks";
import type { Deck, Slide, Unit } from "@/lib/lessonDecks/types";
import { paceLessons, type WeeklySlot } from "@/lib/lessonDecks/pacing";
import { checksIn, classBook, grammarDeck, unitInterests, unitPlan, type PlanItem } from "@/lib/lessonDecks/views";
import { useClassRoster } from "./useClassRoster";
import { useClassDeckState } from "./useClassDeckState";
import { DeckPlayer, printAssessment, printDeck, printHomeworkSheets, printIeltsTracker, printWorksheet, type ClassFlipbook } from "./DeckPlayer";
import { TERMS } from "@/content/lessonDecks/hec-ielts/programme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Printer, Users, BookOpen, CalendarDays, ExternalLink, FileText, ClipboardCheck, Trophy, Lightbulb, PenLine, RotateCcw, Send, Heart } from "lucide-react";
import { toast } from "sonner";
import { pickSession } from "@/lib/lessonDecks/covered";

type ClassLite = { id: string; name: string };
type FlipbookRow = ClassFlipbook & { class_id: string | null };


const todayHanoi = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const nowHanoi = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
// curriculum_lessons / session_lesson_plans (20261121150000) are not in the generated types yet.
const db = supabase as any;

/** Every deck a class can resume into: the unit decks and their grammar-only views. */
function findDeck(id: string | null | undefined): { deck: Deck; unit: Unit } | null {
  if (!id) return null;
  for (const unit of UNITS) for (const d of unit.decks) {
    if (d.id === id) return { deck: d, unit };
    const g = grammarDeck(d);
    if (g && g.id === id) return { deck: g, unit };
  }
  return null;
}

const slideTitle = (s: Slide) => ("title" in s && s.title ? s.title : s.kind);

/**
 * Presenting a deck to a class marks its book lesson as covered in that class's
 * lesson today, so the lesson report starts from the book's objectives. Quiet
 * when there is no lesson today or it is already marked; the teacher can undo.
 */
async function markCovered(deck: Deck, classId: string, className: string) {
  if (!deck.covers) return;
  const { data: sessions } = await db.from("sessions").select("id, start_time, end_time, status")
    .eq("class_id", classId).eq("date", todayHanoi());
  const session = pickSession(sessions ?? [], nowHanoi());
  if (!session) return;
  const { data: lesson } = await db.from("curriculum_lessons").select("id")
    .eq("curriculum", deck.curriculum).eq("level", deck.level).eq("unit_from", deck.covers.unitFrom)
    .eq("lesson", deck.covers.lesson).maybeSingle();
  if (!lesson) return;
  const { data: had } = await db.from("session_lesson_plans").select("position").eq("session_id", session.id);
  const position = (had ?? []).reduce((m: number, p: { position: number }) => Math.max(m, p.position), 0) + 1;
  const { data: row, error } = await db.from("session_lesson_plans")
    .insert({ session_id: session.id, lesson_id: lesson.id, position }).select("id").maybeSingle();
  if (error) {
    if (error.code !== "23505") toast.error("Could not mark this lesson as covered", { description: error.message });
    return;
  }
  toast.success(`Marked for today's ${className} lesson`, {
    description: `${deck.title} will be the starting point of the lesson report.`,
    action: { label: "Undo", onClick: () => { void db.from("session_lesson_plans").delete().eq("id", row?.id); } },
  });
}

/** The homework text for the app: the class task, and each interest edition as an option. No names. */
function homeworkBody(deck: Deck): { title: string; body: string } | null {
  const c = deck.slides.find((s): s is Extract<Slide, { kind: "creative" }> => s.kind === "creative");
  if (!c) return null;
  const part = (t: typeof c.base) => [
    t.task, "", ...t.steps.map((s, i) => `${i + 1}. ${s}`), "",
    "Sentence starters:", ...t.frames.map((f) => `- ${f}`), "",
    "Check your writing:", ...t.success.map((f) => `- ${f}`), "",
    `Challenge: ${t.challenge}`,
  ].join("\n");
  const body = [
    `Thinking: ${c.thinking}. Use these words: ${c.uses.words.join(", ")}.`, "",
    `CLASS VERSION: ${c.base.title}`, part(c.base),
    ...(c.variants ?? []).flatMap((v) => ["", `${v.label.toUpperCase()} (if your teacher gave you this one): ${v.task.title}`, part(v.task)]),
  ].join("\n");
  return { title: `Unit ${deck.unit} Lesson ${deck.lesson}: ${c.base.title}`, body };
}

export function LessonDecksPanel({ classes, flipbooks = [] }: { classes: ClassLite[]; flipbooks?: FlipbookRow[] }) {
  const [classId, setClassId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string>(UNITS[0] ? unitKey(UNITS[0]) : "");
  const [start, setStart] = useState(todayHanoi());
  const [holidays, setHolidays] = useState("");
  const [playing, setPlaying] = useState<{ deck: Deck; unit: Unit; at: number } | null>(null);

  const unit = UNITS.find((u) => unitKey(u) === unitId) ?? null;
  const roster = useClassRoster(classId);
  const names = roster.data?.names ?? [];
  // Homework is for the children who were in the lesson: today's Present and Late marks.
  const presentKids = roster.data?.from === "present" ? roster.data.students : null;
  const place = useClassDeckState(classId);
  const flipbook = flipbooks.find((b) => b.class_id === classId) ?? null;
  const className = classes.find((c) => c.id === classId)?.name ?? "class";

  const { data: cls } = useQuery({
    queryKey: ["lesson-deck-class", classId],
    enabled: !!classId,
    queryFn: async (): Promise<{ slots: WeeklySlot[]; curriculum: string | null }> => {
      const { data, error } = await supabase.from("classes").select("schedule_template, curriculum").eq("id", classId!).maybeSingle();
      if (error) throw error;
      const t = data?.schedule_template as { weeklySlots?: WeeklySlot[] } | null;
      return { slots: Array.isArray(t?.weeklySlots) ? t!.weeklySlots! : [], curriculum: (data as any)?.curriculum ?? null };
    },
  });
  const book = classBook(cls?.curriculum);

  // Open on the class's own book: the unit it last used, else the first unit of its level.
  useEffect(() => {
    const last = findDeck(place.state?.deck_id)?.unit;
    const own = last ?? (book ? UNITS.find((u) => u.curriculum === book.curriculum && u.level === book.level) : undefined);
    if (own) setUnitId(unitKey(own));
  }, [classId, place.state?.deck_id, book?.level]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = useMemo(() => (unit ? unitPlan(unit) : []), [unit]);
  const skip = holidays.split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const paced = useMemo(() => (unit && cls ? paceLessons(plan, cls.slots, start, skip) : []), [plan, cls, start, holidays]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosterNote = !classId
    ? "No class chosen: names show as Student A, B…"
    : roster.isLoading
      ? "Loading names…"
      : `${names.length} names from ${roster.data?.from === "present" ? "today's attendance" : "the class roster"}`;

  const present = (deck: Deck, u: Unit, at = 0) => {
    setPlaying({ deck, unit: u, at });
    if (classId && !deck.id.endsWith("-grammar")) void markCovered(deck, classId, className);
  };
  const resume = findDeck(place.state?.deck_id);

  if (UNITS.length === 0) {
    return (
      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-8 text-center">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-hec-ink-soft" />
        <p className="font-medium text-hec-ink">No lesson decks yet</p>
        <p className="text-hec-small text-hec-ink-soft">Decks are added unit by unit (src/content/lessonDecks).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Class (for names, dates and its place)</Label>
          <Select value={classId ?? ""} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <p className="flex items-center gap-1 text-xs text-hec-ink-soft"><Users className="h-3 w-3" />{rosterNote}</p>
          {classId && (
            <p className="text-xs text-hec-ink-soft">
              Book: {cls?.curriculum ? cls.curriculum : "not set (Admin > class > Settings)"} · Flipbook: {flipbook ? `${flipbook.title}${flipbook.edition === "1e" ? " (1st ed.)" : ""}` : "none for this class"}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={unitKey(u)} value={unitKey(u)}>{unitLabel(u)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="deck-start">First lesson on or after</Label>
          <Input id="deck-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="deck-skip">Days off (YYYY-MM-DD, comma separated)</Label>
          <Input id="deck-skip" value={holidays} onChange={(e) => setHolidays(e.target.value)} placeholder="2026-12-25" />
        </div>
      </div>

      {classId && resume && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-hec-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
          <p className="text-hec-ink">
            <strong>{className} left off at</strong> {resume.deck.title}, slide {(place.state?.slide_index ?? 0) + 1} of {resume.deck.slides.length}
            {place.state?.flipbook_page ? ` · flipbook page ${place.state.flipbook_page}` : ""}.
          </p>
          <Button onClick={() => present(resume.deck, resume.unit, place.state?.slide_index ?? 0)}><RotateCcw className="h-4 w-4" />Continue where we left off</Button>
        </div>
      )}

      {unit && (
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-hec-h3 text-hec-ink flex items-center gap-2"><CalendarDays className="h-5 w-5" />Pacing guide · {unit.title}</h3>
            <p className="text-hec-small text-hec-ink-soft">Big Question: {unit.bigQuestion}</p>
            {unit.curriculum === "hec-ielts-sl" && (
              <Button size="sm" variant="outline" title="A row per student for this term's mocks; names are printed, never saved"
                onClick={() => printIeltsTracker(unit, names, TERMS.find((t) => t.year === unit.level && t.term === unit.unit))}>
                <Printer className="h-4 w-4" />Progress tracker
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Book pages</TableHead>
                <TableHead>Inquiry phase</TableHead>
                <TableHead className="text-right">Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((item: PlanItem, k) => {
                const p = paced[k];
                const date = p ? `Wk ${p.week} · ${p.weekday} ${p.date}` : classId ? "—" : "choose a class";
                if (item.kind === "test") {
                  const a = item.assessment;
                  return (
                    <TableRow key={a.id} className="bg-rose-50/50 dark:bg-rose-950/20">
                      <TableCell><Trophy className="h-4 w-4 text-rose-700" /></TableCell>
                      <TableCell className="whitespace-nowrap">{date}</TableCell>
                      <TableCell className="font-medium">{a.title} <span className="font-normal text-hec-ink-soft">({a.minutes} min, then start the next unit)</span></TableCell>
                      <TableCell className="text-hec-small">{a.covers.slice(0, 3).join(" · ")}…</TableCell>
                      <TableCell className="text-hec-small">Assess</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => printAssessment(a, "teacher")} title="The paper, then the answer key, scripts and marking rubric"><Printer className="h-4 w-4" />Teacher copy</Button>
                        <Button size="sm" variant="outline" className="ml-1" onClick={() => printAssessment(a, "student")} title="The paper only: no answers"><Printer className="h-4 w-4" />Student copy</Button>
                      </TableCell>
                    </TableRow>
                  );
                }
                const d = item.deck;
                const g = grammarDeck(d);
                const checks = checksIn(d).map((id) => unit.assessments?.find((a) => a.id === id)).filter(Boolean);
                const hw = homeworkBody(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.lesson}</TableCell>
                    <TableCell className="whitespace-nowrap">{date}</TableCell>
                    <TableCell className="font-medium">
                      {d.title}
                      {checks.map((a) => <Badge key={a!.id} variant="secondary" className="ml-2 gap-1"><ClipboardCheck className="h-3 w-3" />{a!.title} ({a!.minutes} min)</Badge>)}
                    </TableCell>
                    <TableCell className="text-hec-small">{d.book.length ? d.book.map((b) => `${b.book} ${b.pages}`).join(" · ") : d.slides.flatMap((s) => (s.kind === "listening" ? [`Listening Part ${s.section}`] : s.kind === "speaking" && s.ielts ? [`Speaking Part ${s.ielts.part}`] : [])).join(" · ")}</TableCell>
                    <TableCell className="text-hec-small">{d.inquiryPhases.join(", ")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" onClick={() => present(d, unit)}><Play className="h-4 w-4" />Present</Button>
                        {g && <Button size="sm" variant="outline" onClick={() => present(g, unit)} title="The grammar of this lesson on its own"><Lightbulb className="h-4 w-4" />Grammar only</Button>}
                        <Button size="sm" variant="outline" onClick={() => printDeck(d, names, unit, "teacher")} title="Teacher copy: answers, scripts and teacher notes printed open"><Printer className="h-4 w-4" />Teacher</Button>
                        <Button size="sm" variant="outline" onClick={() => printDeck(d, names, unit, "student")} title="Student copy: no answers, scripts or teacher notes"><Printer className="h-4 w-4" />Student</Button>
                        {hw && (
                          <Button size="sm" variant="outline" title="One sheet per child present today, each with their own version"
                            onClick={() => {
                              if (!presentKids) { toast.error(NO_ATTENDANCE); return; }
                              printHomeworkSheets(d, presentKids, place.state?.interests ?? {}, "student");
                            }}>
                            <PenLine className="h-4 w-4" />Homework sheets
                          </Button>
                        )}
                        {hw && (
                          <Button size="sm" variant="outline" title="Who gets which version, and one copy of each version"
                            onClick={() => {
                              if (!presentKids) { toast.error(NO_ATTENDANCE); return; }
                              printHomeworkSheets(d, presentKids, place.state?.interests ?? {}, "teacher");
                            }}>
                            <PenLine className="h-4 w-4" />Homework (teacher)
                          </Button>
                        )}
                        {hw && classId && <SetHomework classId={classId} title={hw.title} body={hw.body} due={paced[k + 1]?.date ?? null}
                          present={presentKids} enrolled={roster.data?.enrolled.length ?? 0} />}
                      </div>
                      {checks.map((a) => (
                        <span key={a!.id} className="mt-1 inline-flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => printAssessment(a!, "teacher")}><ClipboardCheck className="h-4 w-4" />Check: teacher copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => printAssessment(a!, "student")}><ClipboardCheck className="h-4 w-4" />Check: student copy</Button>
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {unit && classId && <InterestGroups unit={unit} students={roster.data?.enrolled ?? []} interests={place.state?.interests ?? {}}
        onSave={async (interests) => {
          const error = await place.save({ interests }, true);
          if (error) toast.error("Could not save the homework groups", { description: (error as any).message });
          else toast.success("Homework groups saved for this class");
        }} />}

      {unit && (unit.worksheets?.length ?? 0) > 0 && (
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
          <h3 className="mb-1 font-display text-hec-h3 text-hec-ink flex items-center gap-2"><FileText className="h-5 w-5" />Grammar worksheets (ours, printable)</h3>
          <p className="mb-3 text-hec-small text-hec-ink-soft">Support ★, Core ★★ and Challenge ★★★ on one sheet. The teacher copy adds the answer key; the student copy has none.</p>
          <ul className="space-y-2">
            {unit.worksheets!.map((w) => {
              const d = unit.decks.find((x) => x.id === w.deckId);
              const at = d ? d.slides.findIndex((s) => slideTitle(s) === w.slide) : -1;
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-hec-ink">{w.title}</span>
                  <Button size="sm" variant="outline" onClick={() => printWorksheet(w, "teacher")} title="Pupil pages, then the answer key"><Printer className="h-4 w-4" />Teacher copy</Button>
                  <Button size="sm" variant="outline" onClick={() => printWorksheet(w, "student")} title="Pupil pages only: no answer key"><Printer className="h-4 w-4" />Student copy</Button>
                  <span className="text-hec-small text-hec-ink-soft">Used in Lesson {d?.lesson}, slide {at + 1}: {w.slide}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {unit && unit.decks.some((d) => d.resources?.length) && (
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
          <h3 className="mb-1 font-display text-hec-h3 text-hec-ink flex items-center gap-2"><ExternalLink className="h-5 w-5" />Supplementary worksheets (Twinkl)</h3>
          <p className="mb-3 text-hec-small text-hec-ink-soft">Links open on Twinkl; sign in there with the school's account to download. Each one also shows on the slide it supports.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {unit.decks.filter((d) => d.resources?.length).map((d) => (
              <div key={d.id}>
                <p className="font-medium text-hec-ink">Lesson {d.lesson}: {d.title}</p>
                <ul className="mt-1 space-y-1">
                  {d.resources!.map((r) => {
                    const at = r.slide ? d.slides.findIndex((s) => slideTitle(s) === r.slide) : -1;
                    return (
                      <li key={r.url} className="text-hec-small">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-hec-ink underline underline-offset-2 hover:no-underline">{r.title}</a>
                        <span className="text-hec-ink-soft"> · {r.use}</span>
                        {r.slide && at >= 0 && (
                          <button type="button" className="ml-1 text-amber-700 underline underline-offset-2 hover:no-underline" onClick={() => present(d, unit, at)}>
                            slide {at + 1}: {r.slide}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {playing && (
        <DeckPlayer
          key={playing.deck.id}
          deck={playing.deck}
          unit={playing.unit}
          roster={names}
          rosterNote={rosterNote}
          startAt={playing.at}
          flipbook={flipbook}
          onSlide={(i) => { if (classId) void place.save({ deck_id: playing.deck.id, slide_index: i }); }}
          onBookPage={(index) => { if (classId) void place.save({ flipbook_page: index, flipbook_id: flipbook?.id ?? null }, true); }}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

/**
 * Which children get an interest edition of the creative homework, per class.
 * Saved as student ids only; the names on screen come from the live roster.
 */
function InterestGroups({ unit, students, interests, onSave }: {
  unit: Unit; students: { id: string; name: string }[]; interests: Record<string, string[]>;
  onSave: (next: Record<string, string[]>) => Promise<void>;
}) {
  const kinds = unitInterests(unit);
  const [draft, setDraft] = useState(interests);
  useEffect(() => setDraft(interests), [JSON.stringify(interests)]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!kinds.length) return null;
  const toggle = (k: string, id: string, on: boolean) =>
    setDraft((d) => ({ ...d, [k]: on ? [...new Set([...(d[k] ?? []), id])] : (d[k] ?? []).filter((x) => x !== id) }));
  return (
    <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
      <h3 className="mb-1 font-display text-hec-h3 text-hec-ink flex items-center gap-2"><Heart className="h-5 w-5" />Personalised homework</h3>
      <p className="mb-3 text-hec-small text-hec-ink-soft">
        Tick the children who get an interest edition. Everyone else gets the class version. "Homework sheets" prints each child's own version; the projected slide shows both versions without names.
      </p>
      {kinds.map((k) => (
        <div key={k.interest} className="mb-3">
          <p className="mb-1 font-medium text-hec-ink">{k.label}</p>
          <div className="flex flex-wrap gap-3">
            {students.length === 0 && <span className="text-hec-small text-hec-ink-soft">No children enrolled now.</span>}
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-hec-small text-hec-ink">
                <Checkbox checked={(draft[k.interest] ?? []).includes(s.id)} onCheckedChange={(v) => toggle(k.interest, s.id, v === true)} />{s.name}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" onClick={() => void onSave(draft)}>Save groups</Button>
    </div>
  );
}

const NO_ATTENDANCE = "Take today's attendance first: homework goes only to the children marked Present or Late.";

/**
 * Post the lesson's creative homework to the app for the children present today
 * (`homeworks.student_ids`, 20261122150000): an absent child neither sees it nor
 * is told about it. Refuses until attendance is taken, and never falls back to
 * the whole class when the column is not there yet.
 */
function SetHomework({ classId, title, body, due, present, enrolled }: {
  classId: string; title: string; body: string; due: string | null; present: { id: string }[] | null; enrolled: number;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="outline" disabled={busy} title="Adds it in the app for the children present today, due the next class"
      onClick={async () => {
        if (!present || present.length === 0) { toast.error(NO_ATTENDANCE); return; }
        const away = Math.max(enrolled - present.length, 0);
        if (!confirm(`Post "${title}" for the ${present.length} children present today${away ? ` (${away} absent get nothing)` : ""}${due ? `, due ${due}` : ""}? The football edition is listed as an option, with no names.`)) return;
        setBusy(true);
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from("homeworks")
          .insert({ class_id: classId, title, body, due_date: due, created_by: auth.user?.id ?? null, student_ids: present.map((s) => s.id) } as any);
        setBusy(false);
        if (error && (error.code === "PGRST204" || error.code === "42703" || /student_ids/.test(error.message)))
          toast.error("Not posted: homework for present children needs migration 20261122150000_homework_for_present.sql", { description: "Print the homework sheets for now." });
        else if (error) toast.error("Could not post the homework", { description: error.message });
        else toast.success("Homework posted", { description: `${title} · ${present.length} children${due ? ` · due ${due}` : ""}` });
      }}>
      <Send className="h-4 w-4" />Set in app
    </Button>
  );
}
