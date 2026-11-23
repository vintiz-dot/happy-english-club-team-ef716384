/**
 * LessonReports - the daily class reports a teacher approved, for one child:
 * what the class did and that child's own part. For the child's own login and
 * for a parent (the selected child of a shared login, or the child they open).
 *
 * The rows come from get_lesson_reports_for_student (20261121131000), which
 * returns the class part and THIS child's part only, never the staff part or
 * a classmate's. Pictures (shared lesson photos, the child's own work) arrive
 * only through the lesson-report-file function, which asks the database as
 * this person before it reads anything; no storage policy opens them.
 *
 * Rendering only: lessonReportView.ts reads the row and tolerates anything
 * missing, so an older or partial report loses a section, never the page.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BookOpen, CalendarDays, Camera, ChevronDown, HelpCircle, Home, Lightbulb, Loader2, NotebookPen,
  Sparkles, Star, Target, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAgeBand } from "@/hooks/useAgeBand";
import { pressable } from "@/components/fx/PaperPress";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { BiText } from "@/components/student/lessons/BiText";
import { Rise } from "@/components/student/lessons/Rise";
import {
  attendanceLabel, hasLearned, metChip, toLessonReportViews,
  type Bilingual, type LessonReportView,
} from "@/lib/lessonReportView";
import {
  BADGE_BRASS, BADGE_NEUTRAL, BADGE_SUCCESS, BADGE_WARN, BUTTON_SECONDARY, CARD, LABEL,
} from "@/components/student/nova/ivory";

const PAGE = 10;

/** YYYY-MM-DD of the day after, or null for a date it cannot read. */
function dayAfter(date: string | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function fetchReportFile(kind: "photo" | "work", id: string, studentId: string): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-report-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ kind, id, student_id: studentId }),
  });
  if (!res.ok) throw new Error(`file ${res.status}`);
  return await res.blob();
}

/** English, with the Vietnamese under it. */
function Bi({ text, className, viClassName }: { text: Bilingual | null; className?: string; viClassName?: string }) {
  if (!text) return null;
  return (
    <span className="block min-w-0">
      <span className={cn("block break-words", className)}>{text.en}</span>
      {text.vi && <span lang="vi" className={cn("block break-words text-hec-ink-soft", viClassName ?? "text-hec-small")}>{text.vi}</span>}
    </span>
  );
}

function SectionTitle({ icon: Icon, en, vi }: { icon: typeof BookOpen; en: string; vi: string }) {
  return (
    <h3 className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
      <span className="min-w-0">
        <span className={cn(LABEL, "block")}>{en}</span>
        <span lang="vi" className="block text-hec-caption text-hec-ink-faint">{vi}</span>
      </span>
    </h3>
  );
}

/** A picture fetched through the function only when it scrolls near (img loading=lazy cannot defer a fetch). */
function ReportPicture({ kind, id, studentId, alt, className }: {
  kind: "photo" | "work"; id: string; studentId: string; alt: string; className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  const { data: url, isError } = useQuery({
    queryKey: ["lesson-report-file", kind, id, studentId],
    enabled: visible,
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => URL.createObjectURL(await fetchReportFile(kind, id, studentId)),
  });
  return (
    <div ref={ref} className={cn("overflow-hidden rounded-hec-md border border-hec-line bg-hec-sunken", className)}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block h-full w-full">
          <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        </a>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {isError
            ? <Camera className="h-5 w-5 text-hec-ink-faint" aria-label="Picture unavailable" />
            : <Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" aria-label="Loading picture" />}
        </div>
      )}
    </div>
  );
}

function MetChip({ met }: { met: LessonReportView["objectives"][number]["met"] }) {
  const chip = metChip(met);
  const cls = chip.tone === "good" ? BADGE_SUCCESS : chip.tone === "partly" ? BADGE_BRASS : chip.tone === "next" ? BADGE_WARN : BADGE_NEUTRAL;
  return <span className={cn(cls, "shrink-0 whitespace-nowrap")} title={chip.label.vi ?? undefined}>{chip.label.en}</span>;
}

function LessonReportCard({ v, studentId, open, onToggle }: {
  v: LessonReportView; studentId: string; open: boolean; onToggle: () => void;
}) {
  const c = v.child;
  const { band } = useAgeBand();
  const { role } = useAuth();
  // The youngest child's own login never sees the word "late" (brief G2); a parent's view is unchanged.
  const hideLate = band === "early" && role === "student" && c?.attendance === "Late";
  return (
    <article className={cn(CARD, "p-0")}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className={cn("flex min-h-hec-target w-full items-start gap-3 rounded-hec-lg p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring sm:p-5", pressable)}>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-hec-caption text-hec-ink-soft tabular-nums">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />{v.className} · {v.date}{v.startTime ? ` · ${v.startTime}` : ""}
          </p>
          <Bi text={v.title} className="font-display text-hec-h3 font-medium text-hec-ink" />
          {v.summary && <Bi text={v.summary} className={cn("text-hec-small text-hec-ink", !open && "line-clamp-2")}
            viClassName={cn("text-hec-small", !open && "line-clamp-2")} />}
        </div>
        <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-hec-ink-faint transition-transform duration-hec-2 ease-hec", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-6 border-t border-hec-line p-4 sm:p-5">
          {v.objectives.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={Target} en="Today's goals" vi="Mục tiêu hôm nay" />
              <ul className="space-y-2">
                {v.objectives.map((o, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 rounded-hec-md border border-hec-line px-3 py-2">
                    <Bi text={o.text} className="text-hec-small text-hec-ink" viClassName="text-hec-caption" />
                    <MetChip met={o.met} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasLearned(v) && (
            <section className="space-y-3">
              <SectionTitle icon={BookOpen} en="What we learned" vi="Chúng con đã học" />
              {v.taught.length > 0 && (
                <ul className="space-y-1.5">
                  {v.taught.map((t, i) => (
                    <li key={i} className="text-hec-small text-hec-ink">
                      <span className="font-medium">{t.topic}</span>
                      {t.detail && <Bi text={t.detail} className="text-hec-small text-hec-ink-soft" viClassName="text-hec-caption" />}
                    </li>
                  ))}
                </ul>
              )}
              {v.words.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {v.words.map((w, i) => (
                    <span key={i} className="rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-1.5" title={w.example ?? undefined}>
                      <span className="block text-hec-small font-medium text-hec-ink">{w.en}</span>
                      {w.vi && <span lang="vi" className="block text-hec-caption text-hec-ink-soft">{w.vi}</span>}
                    </span>
                  ))}
                </div>
              )}
              {v.structures.length > 0 && (
                <ul className="space-y-1.5">
                  {v.structures.map((s, i) => (
                    <li key={i} className="rounded-hec-md border border-hec-line px-3 py-2">
                      <span className="block text-hec-small font-medium text-hec-ink">{s.pattern}</span>
                      {s.example && <span className="block text-hec-small italic text-hec-ink-soft">“{s.example}”</span>}
                    </li>
                  ))}
                </ul>
              )}
              {v.activities.length > 0 && (
                <ul className="space-y-1.5">
                  {v.activities.map((a, i) => (
                    <li key={i} className="text-hec-small text-hec-ink">
                      <span className="font-medium">{a.name}</span>
                      {a.description && <Bi text={a.description} className="text-hec-small text-hec-ink-soft" viClassName="text-hec-caption" />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {v.photos.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={Camera} en="Photos from class" vi="Hình ảnh buổi học" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {v.photos.map((p) => (
                  <figure key={p.id} className="space-y-1">
                    <ReportPicture kind="photo" id={p.id} studentId={studentId} alt={p.caption?.en ?? "Class photo"} className="aspect-[4/3]" />
                    {p.caption && <figcaption><Bi text={p.caption} className="text-hec-caption text-hec-ink" viClassName="text-hec-caption" /></figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {c && (
            <section className="space-y-3 rounded-hec-lg border border-hec-brass/40 bg-hec-sunken p-4">
              <SectionTitle icon={Star} en="Your child today" vi="Con hôm nay" />
              <div className="flex flex-wrap gap-2">
                {c.attendance && !hideLate && (
                  <span className={c.attendance === "Present" ? BADGE_SUCCESS : c.attendance === "Late" ? BADGE_WARN : BADGE_NEUTRAL}>
                    {attendanceLabel(c.attendance).en} · <span lang="vi">{attendanceLabel(c.attendance).vi}</span>
                  </span>
                )}
                {c.points !== null && c.points !== 0 && (
                  <span className={cn(BADGE_BRASS, "tabular-nums")}>
                    <Star className="h-3.5 w-3.5" aria-hidden />{c.points > 0 ? `+${c.points}` : c.points} points · <span lang="vi">điểm</span>
                  </span>
                )}
              </div>
              {c.highlight && <Bi text={c.highlight} className="text-hec-body text-hec-ink" />}
              {c.workIds.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {c.workIds.map((id) => (
                    <ReportPicture key={id} kind="work" id={id} studentId={studentId} alt="Your child's work" className="aspect-square" />
                  ))}
                </div>
              )}
              {c.teacherComment && (
                <div className="rounded-hec-md border border-hec-line bg-hec-surface px-3 py-2">
                  <p className={LABEL}>From the teacher · <span lang="vi" className="normal-case">Lời cô/thầy</span></p>
                  <Bi text={c.teacherComment} className="text-hec-small text-hec-ink" />
                </div>
              )}
              {c.focusNext && (
                <div>
                  <p className={LABEL}>Next focus · <span lang="vi" className="normal-case">Cần chú ý</span></p>
                  <Bi text={c.focusNext} className="text-hec-small text-hec-ink" />
                </div>
              )}
            </section>
          )}

          {v.classFocus.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={Sparkles} en="What the class is working on" vi="Cả lớp đang luyện" />
              <ul className="list-disc space-y-1 pl-5">
                {v.classFocus.map((f, i) => <li key={i}><Bi text={f} className="text-hec-small text-hec-ink" viClassName="text-hec-caption" /></li>)}
              </ul>
            </section>
          )}

          {v.tips.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={Home} en="Tips for home" vi="Gợi ý ở nhà" />
              <ul className="list-disc space-y-1 pl-5">
                {v.tips.map((t, i) => <li key={i}><Bi text={t} className="text-hec-small text-hec-ink" viClassName="text-hec-caption" /></li>)}
              </ul>
            </section>
          )}

          {v.askYourChild.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={HelpCircle} en="Ask your child" vi="Hỏi con" />
              <ul className="space-y-1.5">
                {v.askYourChild.map((t, i) => (
                  <li key={i} className="rounded-hec-md border border-hec-line px-3 py-2">
                    <Bi text={t} className="text-hec-small font-medium text-hec-ink" viClassName="text-hec-caption" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(v.homework.length > 0 || v.reviewHomeworkId) && (
            <section className="space-y-2">
              <SectionTitle icon={NotebookPen} en="Homework" vi="Bài tập về nhà" />
              {v.homework.length > 0 && (
                <ul className="space-y-1">
                  {v.homework.map((h, i) => (
                    <li key={i} className="text-hec-small text-hec-ink">
                      {h.title}{h.dueDate && <span className="text-hec-ink-soft tabular-nums"> · due {h.dueDate}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {v.reviewHomeworkId && (
                <Link to={`/student/assignments?homework=${v.reviewHomeworkId}`} className={cn(BUTTON_SECONDARY, "gap-2")}>
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  <span>Review quiz · <span lang="vi">Bài ôn tập</span></span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </section>
          )}

          {v.nextLesson && (
            <section className="space-y-2">
              <SectionTitle icon={ArrowRight} en="Next lesson" vi="Buổi học tới" />
              <Bi text={v.nextLesson} className="text-hec-small text-hec-ink" viClassName="text-hec-caption" />
            </section>
          )}
        </div>
      )}
    </article>
  );
}

export function LessonReports({ studentId }: { studentId?: string }) {
  const { band } = useAgeBand();
  const little = band === "early" || band === "young";
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useInfiniteQuery({
    queryKey: ["lesson-reports-for-student", studentId],
    enabled: !!studentId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      // Not in the generated types yet (parallel stages): narrowed by lessonReportView.
      const { data, error } = await (supabase as any).rpc("get_lesson_reports_for_student", {
        p_student: studentId, p_limit: PAGE, p_before: pageParam,
      });
      if (error) throw error;
      return toLessonReportViews(data);
    },
    // p_before is exclusive by date, so the next page asks from the day after the oldest
    // date seen (two lessons on one day must not fall between pages); repeats are dropped
    // below, and a page that brings nothing new ends the list.
    getNextPageParam: (last, all) => {
      if (last.length < PAGE) return undefined;
      const earlier = new Set(all.slice(0, -1).flat().map((v) => v.reportId));
      if (!last.some((v) => !earlier.has(v.reportId))) return undefined;
      return dayAfter(last[last.length - 1]?.date) ?? undefined;
    },
  });

  if (!studentId || q.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" /></div>;
  }
  if (q.error) {
    return (
      <div className={cn(CARD, "py-10 text-center")}>
        <p className="mx-auto max-w-sm text-hec-body text-hec-ink-soft"><BiText k="reports.error" always /></p>
      </div>
    );
  }
  const seen = new Set<string>();
  const reports = (q.data?.pages ?? []).flat().filter((v) => (seen.has(v.reportId) ? false : (seen.add(v.reportId), true)));
  if (!reports.length) {
    return (
      <Rise index={0} className={cn(CARD, "space-y-2 py-12 text-center")}>
        {little ? (
          <div className="flex justify-center"><MascotCompanion pendingHomework={null} silent /></div>
        ) : band === "teen" ? null : (
          <BookOpen className="mx-auto h-10 w-10 text-hec-ink-faint" aria-hidden />
        )}
        <p className="text-hec-body font-medium text-hec-ink"><BiText k="reports.empty" always /></p>
        <p className="mx-auto max-w-sm text-hec-small text-hec-ink-soft">
          {little ? <BiText k="reports.emptyShort" always /> : <BiText k="reports.emptyHelp" always />}
        </p>
      </Rise>
    );
  }
  const first = openId ?? reports[0].reportId;
  return (
    <div className="space-y-3">
      {reports.map((v, i) => (
        <Rise key={v.reportId} index={i}>
          <LessonReportCard v={v} studentId={studentId}
            open={first === v.reportId} onToggle={() => setOpenId(first === v.reportId ? "" : v.reportId)} />
        </Rise>
      ))}
      {q.hasNextPage && (
        <div className="flex justify-center pt-2">
          <button type="button" className={BUTTON_SECONDARY} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            {q.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <BiText k="reports.older" always />}
          </button>
        </div>
      )}
    </div>
  );
}
