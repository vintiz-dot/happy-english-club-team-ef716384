/**
 * FamilyDashboard — the parents' home.
 *
 * Family-role users previously had NO landing page at all (Dashboard.tsx
 * redirected every other role and left family on a blank screen). This
 * gives parents a per-child progress overview — the teacher-approved CEFR
 * level, points, attendance, latest lessons, homework — plus the HEC
 * assistant for questions in their own words (English or Vietnamese).
 *
 * Every query here runs through the parent's own session, so RLS decides
 * what is visible: their children, and only their children (policies from
 * migration 20260730130000).
 */
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { PointsHistoryDialog } from "@/components/student/PointsHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { AssistantChat } from "@/components/chat/AssistantChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sparkles, GraduationCap, Star, CalendarCheck, BookOpen, NotebookPen,
  TrendingUp, Users, MessageCircleQuestion, RefreshCw,
} from "lucide-react";

interface ChildSummary {
  id: string;
  full_name: string;
  avatar_url: string | null;
  cefr: string | null;
  journey: string | null;
  total_points: number;
  /** The child's level (server), when the summary is available. */
  level?: number;
  attendance: { present: number; total: number };
  lessons: Array<{ lesson_date: string; title: string | null; summary: string | null; homework: string | null }>;
}

// BEGIN fetchChildren
interface Kid { id: string; full_name: string; avatar_url: string | null }
/** The one thing fetchChildren needs from a client: the caller's own supabase client. */
type Query = any; // PostgREST builder; the generated types do not list every table used here
interface Db { from(table: string): Query }

/** PostgREST returns at most this many rows per request unless told otherwise. */
const POSTGREST_ROW_CAP = 1000;

/** Original shape: five requests per child. Kept verbatim as the fallback. */
async function fetchChildrenPerChild(client: Db, children: Kid[], since: string): Promise<ChildSummary[]> {
  return Promise.all(
    children.map(async (kid): Promise<ChildSummary> => {
      const [profile, points, att, enr] = await Promise.all([
        client
          .from("student_learning_profiles")
          .select("summary, cefr_estimate")
          .eq("student_id", kid.id).maybeSingle(),
        client
          .from("student_points")
          .select("total_points").eq("student_id", kid.id).maybeSingle(),
        client
          .from("attendance")
          .select("status").eq("student_id", kid.id).gte("date", since),
        client
          .from("enrollments").select("class_id").eq("student_id", kid.id),
      ]);

      const classIds = [...new Set((enr.data || []).map((r: { class_id: string }) => r.class_id))];
      let lessons: ChildSummary["lessons"] = [];
      if (classIds.length) {
        const { data: ov } = await client
          .from("lesson_overviews")
          .select("lesson_date, title, summary, homework")
          .in("class_id", classIds)
          .order("lesson_date", { ascending: false })
          .limit(3);
        lessons = ov || [];
      }

      const attRows: Array<{ status: string }> = att.data || [];
      return {
        id: kid.id,
        full_name: kid.full_name,
        avatar_url: kid.avatar_url,
        cefr: profile.data?.cefr_estimate ?? null,
        journey: profile.data?.summary ?? null,
        total_points: points.data?.total_points ?? 0,
        attendance: {
          present: attRows.filter((a) => a.status === "Present" || a.status === "Late").length,
          total: attRows.length,
        },
        lessons,
      };
    }),
  );
}

/**
 * One request per table (.in("student_id", ids)) instead of one per child.
 * Same tables, same column lists, same caller client (RLS unchanged).
 * lesson_overviews stays one request per distinct class set: its .limit(3)
 * is per child, so it cannot be batched without changing which rows return.
 * Returns null (caller falls back to the per-child path) when a batched
 * request errored or came back as long as PostgREST's row cap allows.
 */
async function fetchChildrenBatched(client: Db, children: Kid[], since: string): Promise<ChildSummary[] | null> {
  const ids = children.map((k) => k.id);
  const [profiles, points, att, enr] = await Promise.all([
    client.from("student_learning_profiles").select("student_id, summary, cefr_estimate").in("student_id", ids),
    client.from("student_points").select("student_id, total_points").in("student_id", ids),
    client.from("attendance").select("student_id, status").in("student_id", ids).gte("date", since),
    client.from("enrollments").select("student_id, class_id").in("student_id", ids),
  ]);
  for (const r of [profiles, points, att, enr]) {
    if (r.error || !Array.isArray(r.data) || r.data.length >= POSTGREST_ROW_CAP) return null;
  }

  const group = <T extends { student_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const l = m.get(r.student_id);
      if (l) l.push(r); else m.set(r.student_id, [r]);
    }
    return m;
  };
  const profBy = group<{ student_id: string; summary: string | null; cefr_estimate: string | null }>(profiles.data);
  const ptsBy = group<{ student_id: string; total_points: number }>(points.data);
  const attBy = group<{ student_id: string; status: string }>(att.data);
  const enrBy = group<{ student_id: string; class_id: string }>(enr.data);
  // .maybeSingle() yields no data for zero rows AND for more than one row.
  const single = <T,>(m: Map<string, T[]>, id: string): T | null => {
    const l = m.get(id);
    return l && l.length === 1 ? l[0] : null;
  };

  // One lesson_overviews request per distinct class set, shared by children with that set.
  const lessonsBySet = new Map<string, Promise<ChildSummary["lessons"]>>();
  return Promise.all(
    children.map(async (kid): Promise<ChildSummary> => {
      const classIds = [...new Set((enrBy.get(kid.id) || []).map((r) => r.class_id))];
      let lessons: ChildSummary["lessons"] = [];
      if (classIds.length) {
        const key = JSON.stringify([...classIds].sort());
        let p = lessonsBySet.get(key);
        if (!p) {
          p = (async () => {
            const { data: ov } = await client
              .from("lesson_overviews")
              .select("lesson_date, title, summary, homework")
              .in("class_id", classIds)
              .order("lesson_date", { ascending: false })
              .limit(3);
            return ov || [];
          })();
          lessonsBySet.set(key, p);
        }
        lessons = [...(await p)];
      }
      const profile = single(profBy, kid.id);
      const pts = single(ptsBy, kid.id);
      const attRows = attBy.get(kid.id) || [];
      return {
        id: kid.id,
        full_name: kid.full_name,
        avatar_url: kid.avatar_url,
        cefr: profile?.cefr_estimate ?? null,
        journey: profile?.summary ?? null,
        total_points: pts?.total_points ?? 0,
        attendance: {
          present: attRows.filter((a) => a.status === "Present" || a.status === "Late").length,
          total: attRows.length,
        },
        lessons,
      };
    }),
  );
}

export async function fetchChildren(client: Db): Promise<ChildSummary[]> {
  // RLS: a family user's students select returns exactly their children.
  const { data: kids, error: kidsError } = await client
    .from("students")
    .select("id, full_name, avatar_url")
    .eq("is_active", true)
    .order("full_name");
  // A failed lookup is not "no children": let the page say it could not load.
  if (kidsError) throw new Error(kidsError.message || "Could not load the family's students");
  const children: Kid[] = kids || [];
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  if (!children.length) return [];
  return (await fetchChildrenBatched(client, children, since)) ?? fetchChildrenPerChild(client, children, since);
}
// END fetchChildren

/**
 * Each child's level: the latest APPROVED CEFR level (cefr_assessments holds
 * only published points - a teacher's own, or a model's once a teacher
 * approved it: 20261117151000), and no model-written summary. The learning
 * profile (an AI summary and estimate no teacher approves) is staff-only
 * since 20261117152000; fetchChildren still asks for it (its batching is
 * tested against the original) and now gets nothing, and whatever it returns
 * is dropped here so a stale policy could not put it back on the card.
 */
export async function withApprovedLevels(client: Db, children: ChildSummary[]): Promise<ChildSummary[]> {
  const cleared = children.map((c) => ({ ...c, cefr: null, journey: null }));
  if (!cleared.length) return cleared;
  const { data, error } = await client
    .from("cefr_assessments")
    .select("student_id, level, assessed_at, created_at")
    .in("student_id", cleared.map((c) => c.id))
    .order("assessed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(POSTGREST_ROW_CAP);
  if (error || !Array.isArray(data)) return cleared;
  const latest = new Map<string, string>();
  for (const r of data as Array<{ student_id: string; level: string }>) {
    if (!latest.has(r.student_id)) latest.set(r.student_id, r.level);
  }
  return cleared.map((c) => ({ ...c, cefr: latest.get(c.id) ?? null }));
}

/**
 * Each child's points: every point ever earned, every class, with the
 * level, from student_points_summary (20261117120000). fetchChildren read
 * "the" student_points row with maybeSingle, but there is one per class
 * per month, so any child with two came back as 0 - 51 of 57 children on
 * 17 Nov 2026. fetchChildren is left as it was (its batching is tested
 * against the original); the figure shown is replaced here.
 */
async function withPoints(children: ChildSummary[]): Promise<ChildSummary[]> {
  if (!children.length) return children;
  const { data, error } = await supabase.rpc("student_points_summary" as never, {
    p_students: children.map((c) => c.id),
  } as never);
  if (error || !data) return children;
  const byId = data as unknown as Record<string, { all_time: number; level: { level: number } }>;
  return children.map((c) => (byId[c.id] ? { ...c, total_points: Number(byId[c.id].all_time) || 0, level: byId[c.id].level?.level } : c));
}

function useChildren(userId?: string) {
  return useQuery<ChildSummary[]>({
    queryKey: ["family-children", userId],
    enabled: !!userId,
    queryFn: async () => withPoints(await withApprovedLevels(supabase, await fetchChildren(supabase))),
  });
}

/** The newest lesson first (lesson_overviews arrive newest first; sort anyway). */
function latestLessonOf(lessons: ChildSummary["lessons"]) {
  return [...lessons].sort((a, b) => (a.lesson_date < b.lesson_date ? 1 : a.lesson_date > b.lesson_date ? -1 : 0))[0] ?? null;
}

function LessonNote({ id, summary }: { id: string; summary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <p id={id} className={`whitespace-pre-line text-hec-small text-hec-ink-soft ${open ? "" : "line-clamp-2"}`}>{summary}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 inline-flex min-h-11 items-center rounded-hec-md px-1 text-hec-small font-medium text-hec-ink underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
      >
        {open ? "Show less" : "Read lesson note"}
      </button>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <Card><CardContent className="space-y-4 py-12 text-center text-hec-body text-hec-ink-soft sm:py-12">{children}</CardContent></Card>
  );
}

export default function FamilyDashboard() {
  const { user } = useAuth();
  const { data: children = [], isLoading, isError, refetch, isFetching } = useChildren(user?.id);
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string } | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <Layout title="Family Dashboard">
      {historyFor && (
        <PointsHistoryDialog
          studentId={historyFor.id}
          studentName={historyFor.name}
          open={!!historyFor}
          onOpenChange={(o) => !o && setHistoryFor(null)}
        />
      )}
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Hero */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-lg border border-hec-line bg-hec-sunken">
            <Users className="h-5 w-5 text-hec-ink-soft" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-balance font-display text-hec-display font-medium text-hec-ink">Your family at Happy English Club</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Progress, lessons and homework for your children — and an assistant for any question.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          {/* Children column */}
          <div className="space-y-4 lg:col-span-3">
            {isLoading && <Notice>Loading your children…</Notice>}
            {!isLoading && isError && (
              <Notice>
                <p role="alert">We couldn't load your family's records.</p>
                <Button type="button" className="min-h-11" onClick={() => void refetch()} disabled={isFetching}>
                  <RefreshCw className="h-4 w-4 shrink-0" />Try again
                </Button>
              </Notice>
            )}
            {!isLoading && !isError && children.length === 0 && (
              <Notice>
                <p>No children are linked to this account yet.</p>
                <p>The school links your account to your child. Please contact the school office and ask them to link it.</p>
              </Notice>
            )}
            {children.length > 1 && (
              <nav aria-label="Jump to a child" className="flex flex-wrap gap-2">
                {children.map((kid) => (
                  <a
                    key={kid.id}
                    href={`#child-${kid.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-hec-line bg-hec-surface px-4 text-hec-small font-medium text-hec-ink hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                  >
                    {kid.full_name}
                  </a>
                ))}
              </nav>
            )}
            {children.map((kid, i) => {
              const latest = latestLessonOf(kid.lessons);
              return (
              <motion.div
                key={kid.id}
                id={`child-${kid.id}`}
                className="scroll-mt-24"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: i * 0.06 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-4 sm:pb-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-full">
                        <Avatar className="h-12 w-12 border border-hec-line">
                          <AvatarImage src={kid.avatar_url || undefined} alt={kid.full_name} />
                          <AvatarFallback className="bg-hec-sunken text-hec-small font-medium text-hec-ink-soft">
                            {kid.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="whitespace-normal break-words hyphens-none text-balance">{kid.full_name}</CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {kid.cefr && (
                            <Badge variant="brass" className="gap-1">
                              <GraduationCap className="h-4 w-4 shrink-0" />{kid.cefr}
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => setHistoryFor({ id: kid.id, name: kid.full_name })}
                            className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                            aria-label={`${kid.full_name}: ${kid.total_points} points. Open the points history`}
                          >
                            <Badge variant="secondary" className="cursor-pointer gap-1 tabular-nums hover:bg-hec-sunken">
                              <Star className="h-4 w-4 shrink-0 text-hec-brass" />{kid.total_points} pts
                              {kid.level ? <span className="text-hec-ink-soft"> · Level {kid.level}</span> : null}
                            </Badge>
                          </button>
                          {kid.attendance.total > 0 && (
                            <Badge variant="secondary" className="gap-1 tabular-nums">
                              <CalendarCheck className="h-4 w-4 shrink-0 text-hec-leaf" />
                              {kid.attendance.present}/{kid.attendance.total} classes (30d)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-hec-md border border-hec-line bg-hec-surface p-4">
                      <p className="flex items-start gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 whitespace-normal break-words">
                          {latest ? `Latest lesson · ${latest.title || "Lesson"} · ${latest.lesson_date}` : "Latest lesson"}
                        </span>
                      </p>
                      {latest ? (
                        <>
                          {latest.summary && <LessonNote id={`note-${kid.id}`} summary={latest.summary} />}
                          {latest.homework && (
                            <div className="mt-3 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
                              <p className="mb-1 flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                                <NotebookPen className="h-4 w-4 shrink-0" />Practice at home
                              </p>
                              <p className="whitespace-pre-line text-hec-small text-hec-ink">{latest.homework}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 text-hec-small text-hec-ink-soft">No recent lesson note</p>
                      )}
                    </div>
                    {kid.journey && (
                      <div className="rounded-hec-md border border-hec-line bg-hec-sunken p-4">
                        <p className="mb-2 flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                          <TrendingUp className="h-4 w-4 shrink-0" />Learning journey
                        </p>
                        <p className="text-hec-small text-hec-ink">{kid.journey}</p>
                      </div>
                    )}
                    {kid.lessons.filter((l) => l !== latest).length > 0 && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                          <BookOpen className="h-4 w-4 shrink-0" />Earlier lessons
                        </p>
                        {kid.lessons.filter((l) => l !== latest).map((l, k) => (
                          <div key={k} className="rounded-hec-md border border-hec-line px-4 py-3">
                            <p className="text-hec-small font-semibold text-hec-ink">
                              {l.title || "Lesson"}{" "}
                              <span className="whitespace-nowrap font-normal tabular-nums text-hec-ink-soft">· {l.lesson_date}</span>
                            </p>
                            {l.summary && (
                              <p className="mt-1 line-clamp-2 text-hec-caption text-hec-ink-soft">{l.summary}</p>
                            )}
                            {l.homework && (
                              <p className="mt-2 flex items-start gap-2 text-hec-caption text-hec-ink">
                                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" />
                                <span className="min-w-0"><span className="font-semibold">Homework:</span> {l.homework}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              );
            })}
          </div>

          {/* Assistant column */}
          <div className="lg:sticky lg:top-24 lg:col-span-2">
            <Card className="flex flex-col h-[min(72vh,640px)]">
              <CardHeader className="pb-2 sm:pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                  Ask about your child
                </CardTitle>
                <CardDescription className="flex items-start gap-2">
                  <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0" />
                  English or Tiếng Việt — it only sees your own children's records.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pt-0">
                <AssistantChat className="h-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
