import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UNITS, unitKey } from "@/content/lessonDecks";
import type { Deck } from "@/lib/lessonDecks/types";
import { paceLessons, type WeeklySlot } from "@/lib/lessonDecks/pacing";
import { useClassRoster } from "./useClassRoster";
import { DeckPlayer, printDeck } from "./DeckPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Printer, Users, BookOpen, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { pickSession } from "@/lib/lessonDecks/covered";

type ClassLite = { id: string; name: string };

const todayHanoi = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const nowHanoi = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
// curriculum_lessons / session_lesson_plans (20261121150000) are not in the generated types yet.
const db = supabase as any;

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

export function LessonDecksPanel({ classes }: { classes: ClassLite[] }) {
  const [classId, setClassId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string>(UNITS[0] ? unitKey(UNITS[0]) : "");
  const [start, setStart] = useState(todayHanoi());
  const [holidays, setHolidays] = useState("");
  const [playing, setPlaying] = useState<Deck | null>(null);

  const unit = UNITS.find((u) => unitKey(u) === unitId) ?? null;
  const roster = useClassRoster(classId);
  const names = roster.data?.names ?? [];

  const { data: slots } = useQuery({
    queryKey: ["lesson-deck-slots", classId],
    enabled: !!classId,
    queryFn: async (): Promise<WeeklySlot[]> => {
      const { data, error } = await supabase.from("classes").select("schedule_template").eq("id", classId!).maybeSingle();
      if (error) throw error;
      const t = data?.schedule_template as { weeklySlots?: WeeklySlot[] } | null;
      return Array.isArray(t?.weeklySlots) ? t!.weeklySlots! : [];
    },
  });

  const skip = holidays.split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const paced = useMemo(() => (unit && slots ? paceLessons(unit.decks, slots, start, skip) : []), [unit, slots, start, holidays]);
  const rosterNote = !classId
    ? "No class chosen: names show as Student A, B…"
    : roster.isLoading
      ? "Loading names…"
      : `${names.length} names from ${roster.data?.from === "present" ? "today's attendance" : "the class roster"}`;

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
          <Label>Class (for names and dates)</Label>
          <Select value={classId ?? ""} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <p className="flex items-center gap-1 text-xs text-hec-ink-soft"><Users className="h-3 w-3" />{rosterNote}</p>
        </div>
        <div className="space-y-1">
          <Label>Unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={unitKey(u)} value={unitKey(u)}>Oxford Discover {u.level} · Unit {u.unit}: {u.title}</SelectItem>)}
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

      {unit && (
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-hec-h3 text-hec-ink flex items-center gap-2"><CalendarDays className="h-5 w-5" />Pacing guide · {unit.title}</h3>
            <p className="text-hec-small text-hec-ink-soft">Big Question: {unit.bigQuestion}</p>
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
              {unit.decks.map((d, k) => {
                const p = paced[k];
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.lesson}</TableCell>
                    <TableCell className="whitespace-nowrap">{p ? `Wk ${p.week} · ${p.weekday} ${p.date}` : classId ? "—" : "choose a class"}</TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-hec-small">{d.book.map((b) => `${b.book} ${b.pages}`).join(" · ")}</TableCell>
                    <TableCell className="text-hec-small">{d.inquiryPhases.join(", ")}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" onClick={() => {
                        setPlaying(d);
                        if (classId) void markCovered(d, classId, classes.find((c) => c.id === classId)?.name ?? "class");
                      }}><Play className="h-4 w-4" />Present</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => printDeck(d, names)} title="Print or save as PDF"><Printer className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {playing && <DeckPlayer deck={playing} roster={names} rosterNote={rosterNote} onClose={() => setPlaying(null)} />}
    </div>
  );
}
