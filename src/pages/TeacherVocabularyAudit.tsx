/**
 * Teacher Vocabulary Audit — monthly dashboard
 * =============================================
 * Read-only view for teachers to audit vocabulary engagement in the classes
 * they teach.
 *
 * Macro view ("Whole Class"):
 *   - Total saves, total practice answers, accuracy, total points awarded
 *   - Leaderboard of students by saves + practice points this month
 *
 * Micro view ("Individual Student"):
 *   - Picks a student from the class
 *   - Shows that student's saved words this month (with their own examples)
 *   - Shows their practice answer history
 *
 * Access control is enforced at the DB layer via RLS policies that check
 * `is_teacher_of_class(auth.uid(), class_id)`. The frontend additionally
 * gates the page to users with the "teacher" role.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, GraduationCap, Users, User, Trophy, BookCheck, BookX, BookOpen, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClassRow { id: string; name: string }
interface StudentRow { id: string; user_id: string | null; full_name: string }
interface ClassMember { studentId: string; userId: string | null; fullName: string }

interface ActivityRow {
  id: string;
  user_id: string;
  student_id: string | null;
  word: string | null;
  activity_type: "save" | "practice_correct" | "practice_incorrect" | "edit" | "delete";
  points_awarded: number;
  created_at: string;
}

interface EntryRow {
  id: string;
  user_id: string;
  student_id: string | null;
  word: string;
  root_word: string;
  cefr: string | null;
  definition_en: string | null;
  definition_vi: string | null;
  user_examples: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

function monthBounds(yyyymm: string): { start: string; end: string } {
  const [y, m] = yyyymm.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function currentYyyyMm(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function TeacherVocabularyAudit() {
  const { user, role, loading: authLoading } = useAuth();

  // Class + month state
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | "">("");
  const [month, setMonth] = useState<string>(currentYyyyMm());

  // View mode
  const [viewMode, setViewMode] = useState<"macro" | "micro">("macro");
  const [selectedStudent, setSelectedStudent] = useState<string | "">("");

  // Data state
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  // ── Load teacher's classes ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setLoadingClasses(false); return; }
      setLoadingClasses(true);

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacher) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      const { data: cls } = await supabase
        .from("classes")
        .select("id, name, is_active")
        .eq("default_teacher_id", teacher.id)
        .eq("is_active", true)
        .order("name");

      if (cancelled) return;
      const rows = (cls || []).map((c: any) => ({ id: c.id, name: c.name }));
      setClasses(rows);
      if (rows.length > 0 && !selectedClass) setSelectedClass(rows[0].id);
      setLoadingClasses(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Load class members ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedClass) { setMembers([]); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await (supabase as any)
        .from("enrollments")
        .select("students!inner(id, full_name, linked_user_id)")
        .eq("class_id", selectedClass)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (cancelled) return;
      const rows: ClassMember[] = (data || []).map((row: any) => ({
        studentId: row.students.id,
        userId: row.students.linked_user_id,
        fullName: row.students.full_name,
      }));
      setMembers(rows);
      if (rows.length > 0 && !selectedStudent) setSelectedStudent(rows[0].studentId);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  // ── Load activity + entries for the selected class+month ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedClass) { setActivity([]); setEntries([]); return; }
      setLoadingData(true);
      const { start, end } = monthBounds(month);

      const [{ data: actData }, { data: entryData }] = await Promise.all([
        (supabase as any)
          .from("vocab_activity_log")
          .select("id, user_id, student_id, word, activity_type, points_awarded, created_at")
          .eq("class_id", selectedClass)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("student_vocabulary_entries")
          .select("id, user_id, student_id, word, root_word, cefr, definition_en, definition_vi, user_examples, image_url, created_at, updated_at")
          .eq("class_id", selectedClass)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      setActivity((actData as ActivityRow[]) || []);
      setEntries((entryData as EntryRow[]) || []);
      setLoadingData(false);
    })();
    return () => { cancelled = true; };
  }, [selectedClass, month]);

  // ── Aggregations ──
  const macroStats = useMemo(() => {
    const totalSaves = activity.filter((a) => a.activity_type === "save").length;
    const totalCorrect = activity.filter((a) => a.activity_type === "practice_correct").length;
    const totalIncorrect = activity.filter((a) => a.activity_type === "practice_incorrect").length;
    const totalAnswers = totalCorrect + totalIncorrect;
    const accuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;
    const totalPoints = activity.reduce((sum, a) => sum + (a.points_awarded || 0), 0);

    // Per-student rollup
    const byStudent = new Map<string, { studentId: string; saves: number; correct: number; incorrect: number; points: number }>();
    for (const a of activity) {
      const sid = a.student_id ?? `user-${a.user_id}`;
      const cur = byStudent.get(sid) || { studentId: sid, saves: 0, correct: 0, incorrect: 0, points: 0 };
      if (a.activity_type === "save") cur.saves++;
      if (a.activity_type === "practice_correct") cur.correct++;
      if (a.activity_type === "practice_incorrect") cur.incorrect++;
      cur.points += a.points_awarded || 0;
      byStudent.set(sid, cur);
    }
    const leaderboard = Array.from(byStudent.values()).sort((a, b) => b.points - a.points);

    return { totalSaves, totalCorrect, totalIncorrect, totalAnswers, accuracy, totalPoints, leaderboard };
  }, [activity]);

  const microData = useMemo(() => {
    if (!selectedStudent) return { entries: [] as EntryRow[], activity: [] as ActivityRow[] };
    return {
      entries: entries.filter((e) => e.student_id === selectedStudent),
      activity: activity.filter((a) => a.student_id === selectedStudent),
    };
  }, [selectedStudent, entries, activity]);

  // ── Render guards ──
  if (authLoading) {
    return (
      <Layout title="Vocabulary Audit">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-hec-ink-soft" />
        </div>
      </Layout>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    return (
      <Layout title="Vocabulary Audit">
        <div className="text-center py-20 space-y-3">
          <h2 className="font-display text-hec-h2 font-medium text-hec-ink">Teachers only</h2>
          <p className="text-hec-body text-hec-ink-soft">This page is reserved for class teachers.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vocabulary Audit">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
              <GraduationCap className="w-6 h-6 text-hec-ink-soft" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Vocabulary Audit</h1>
              <p className="text-hec-small text-hec-ink-soft">Monthly view of your students' vocab activity.</p>
            </div>
          </div>

          {/* Class + month picker */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-48">
                <SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-hec-md border border-hec-line-strong bg-hec-raised px-1">
              <Button variant="ghost" size="icon" className="" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1 px-2 text-hec-small font-medium tabular-nums text-hec-ink">
                <Calendar className="w-3.5 h-3.5 text-hec-ink-soft" />
                {month}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className=""
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                disabled={month >= currentYyyyMm()}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* No classes */}
        {!loadingClasses && classes.length === 0 && (
          <div className="text-center py-20 space-y-2">
            <h3 className="font-display text-hec-h2 font-medium text-hec-ink">No classes assigned</h3>
            <p className="text-hec-body text-hec-ink-soft">You don't have any classes set up as their primary teacher yet.</p>
          </div>
        )}

        {/* Tabs: macro / micro */}
        {classes.length > 0 && (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "macro" | "micro")}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="macro" className="gap-1.5"><Users className="w-4 h-4" /> Whole Class</TabsTrigger>
              <TabsTrigger value="micro" className="gap-1.5"><User className="w-4 h-4" /> Individual Student</TabsTrigger>
            </TabsList>

            <TabsContent value="macro" className="mt-6">
              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-hec-ink-soft" /></div>
              ) : (
                <MacroView stats={macroStats} members={members} />
              )}
            </TabsContent>

            <TabsContent value="micro" className="mt-6">
              <div className="space-y-4">
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-72">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.studentId} value={m.studentId}>{m.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingData ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-hec-ink-soft" /></div>
                ) : (
                  <MicroView entries={microData.entries} activity={microData.activity} />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

// ─── Macro view ──────────────────────────────────────────────────────────

function MacroView({
  stats,
  members,
}: {
  stats: {
    totalSaves: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalAnswers: number;
    accuracy: number;
    totalPoints: number;
    leaderboard: Array<{ studentId: string; saves: number; correct: number; incorrect: number; points: number }>;
  };
  members: ClassMember[];
}) {
  const memberName = (sid: string) => members.find((m) => m.studentId === sid)?.fullName ?? "Unknown";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Saves" value={stats.totalSaves} accent="violet" />
        <StatCard icon={<BookCheck className="w-5 h-5" />} label="Correct" value={stats.totalCorrect} accent="emerald" />
        <StatCard icon={<BookX className="w-5 h-5" />} label="Incorrect" value={stats.totalIncorrect} accent="rose" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Points" value={stats.totalPoints} accent="amber" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-hec-h2 font-medium text-hec-ink">Monthly Leaderboard</h3>
            <Badge variant="outline" className="tabular-nums">
              Accuracy {stats.accuracy.toFixed(0)}%
            </Badge>
          </div>
          {stats.leaderboard.length === 0 ? (
            <p className="py-4 text-hec-small text-hec-ink-soft">No activity for this month yet.</p>
          ) : (
            <div className="space-y-1">
              {stats.leaderboard.map((row, i) => (
                <div key={row.studentId} className="flex min-h-hec-target flex-wrap items-center gap-x-3 gap-y-1 border-b border-hec-line py-2 last:border-b-0">
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-hec-caption font-semibold tabular-nums",
                    i === 0 ? "border border-hec-brass/40 text-hec-brass"
                      : i === 1 ? "bg-hec-sunken text-hec-ink"
                      : i === 2 ? "bg-hec-sunken text-hec-ink"
                      : "bg-hec-sunken text-hec-ink-soft",
                  )}>{i + 1}</span>
                  <span className="min-w-0 flex-1 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{memberName(row.studentId)}</span>
                  <span className="text-hec-caption tabular-nums text-hec-ink-soft">{row.saves} saves · {row.correct}/{row.correct + row.incorrect} correct</span>
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap tabular-nums">+{row.points} pts</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "violet" | "emerald" | "rose" | "amber";
}) {
  // The label and its icon carry the accent; the number is ink (DS s.14: a count is not a state).
  const colors: Record<string, string> = {
    violet: "text-hec-ink-soft",
    emerald: "text-hec-leaf",
    rose: "text-hec-danger",
    amber: "text-hec-brass",
  };
  return (
    <Card>
      <CardContent className="p-4 sm:p-4">
        <div className={cn("flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider", colors[accent])}>
          {icon}{label}
        </div>
        <p className="mt-1 text-hec-h1 font-semibold tabular-nums text-hec-ink">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Micro view ─────────────────────────────────────────────────────────

function MicroView({
  entries,
  activity,
}: {
  entries: EntryRow[];
  activity: ActivityRow[];
}) {
  const correctCount = activity.filter((a) => a.activity_type === "practice_correct").length;
  const incorrectCount = activity.filter((a) => a.activity_type === "practice_incorrect").length;
  const pointsTotal = activity.reduce((sum, a) => sum + (a.points_awarded || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Saves" value={entries.length} accent="violet" />
        <StatCard icon={<BookCheck className="w-5 h-5" />} label="Correct" value={correctCount} accent="emerald" />
        <StatCard icon={<BookX className="w-5 h-5" />} label="Incorrect" value={incorrectCount} accent="rose" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Points" value={pointsTotal} accent="amber" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-4">
          <h3 className="font-display text-hec-h2 font-medium text-hec-ink">Words Saved This Month</h3>
          {entries.length === 0 ? (
            <p className="py-4 text-hec-small text-hec-ink-soft">No words saved this month.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {entries.map((e) => (
                <div key={e.id} className="flex gap-3 rounded-hec-md border border-hec-line p-3">
                  {e.image_url && (
                    <img
                      src={e.image_url}
                      alt=""
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-hec-sm object-cover shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="min-w-0 break-words text-hec-body font-semibold capitalize text-hec-ink">{e.word}</h4>
                      {e.cefr && <Badge variant="outline">CEFR {e.cefr}</Badge>}
                      <span className="ml-auto text-hec-caption tabular-nums text-hec-ink-soft">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                    {e.definition_vi && <p className="mt-1 text-hec-small text-hec-ink-soft">🇻🇳 {e.definition_vi}</p>}
                    {Array.isArray(e.user_examples) && e.user_examples.length > 0 && (
                      <ul className="mt-2 space-y-1 text-hec-small">
                        {e.user_examples.map((ex, i) => (
                          <li key={i} className="italic text-hec-ink">"{ex}"</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
