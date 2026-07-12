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
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    return (
      <Layout title="Vocabulary Audit">
        <div className="text-center py-20 space-y-3">
          <h2 className="text-xl font-bold">Teachers only</h2>
          <p className="text-muted-foreground">This page is reserved for class teachers.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vocabulary Audit">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vocabulary Audit</h1>
              <p className="text-muted-foreground text-sm">Monthly view of your students' vocab activity.</p>
            </div>
          </div>

          {/* Class + month picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl">
                <SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border rounded-xl px-1 h-10">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1 px-2 text-sm font-medium">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {month}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
            <h3 className="text-lg font-bold">No classes assigned</h3>
            <p className="text-muted-foreground">You don't have any classes set up as their primary teacher yet.</p>
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
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : (
                <MacroView stats={macroStats} members={members} />
              )}
            </TabsContent>

            <TabsContent value="micro" className="mt-6">
              <div className="space-y-4">
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full sm:w-[280px] h-10 rounded-xl">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.studentId} value={m.studentId}>{m.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingData ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
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
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Monthly Leaderboard</h3>
            <Badge variant="outline">
              Accuracy {stats.accuracy.toFixed(0)}%
            </Badge>
          </div>
          {stats.leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No activity for this month yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.leaderboard.map((row, i) => (
                <div key={row.studentId} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    i === 0 ? "bg-amber-100 text-amber-700"
                      : i === 1 ? "bg-slate-200 text-slate-700"
                      : i === 2 ? "bg-orange-100 text-orange-700"
                      : "bg-slate-50 text-slate-500",
                  )}>{i + 1}</span>
                  <span className="flex-1 font-medium">{memberName(row.studentId)}</span>
                  <span className="text-xs text-muted-foreground">{row.saves} saves · {row.correct}/{row.correct + row.incorrect} correct</span>
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white">+{row.points} pts</Badge>
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
  const colors: Record<string, string> = {
    violet: "bg-blue-50 text-blue-700 dark:bg-blue-950/30",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/30",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
  };
  return (
    <Card>
      <CardContent className={cn("p-4 rounded-lg", colors[accent])}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {icon}{label}
        </div>
        <p className="text-3xl font-black mt-1">{value}</p>
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
        <CardContent className="p-4 space-y-3">
          <h3 className="font-bold">Words Saved This Month</h3>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No words saved this month.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {entries.map((e) => (
                <div key={e.id} className="rounded-lg border p-3 flex gap-3">
                  {e.image_url && (
                    <img
                      src={e.image_url}
                      alt=""
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-md object-cover shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold capitalize">{e.word}</h4>
                      {e.cefr && <Badge variant="outline" className="text-[10px]">CEFR {e.cefr}</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                    {e.definition_vi && <p className="text-xs text-muted-foreground mt-0.5">🇻🇳 {e.definition_vi}</p>}
                    {Array.isArray(e.user_examples) && e.user_examples.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs">
                        {e.user_examples.map((ex, i) => (
                          <li key={i} className="text-foreground italic">"{ex}"</li>
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
