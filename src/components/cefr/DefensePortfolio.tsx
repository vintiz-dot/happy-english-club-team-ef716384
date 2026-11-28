/**
 * DefensePortfolio - the evidence a child defends their level with: what
 * they have learnt at HEC (lessons, homework, skill scores, approved videos,
 * words, review cards, corrected mistakes, lesson and exam reports) and
 * their standardized test results.
 *
 * Facts only, worked out by cefr-defense (`_lib/level-defense-case.ts`
 * buildPortfolio): no model output, so the child's page shows it too.
 */
import { Award, BookOpen, CalendarCheck, FileText, GraduationCap, Layers, MessageSquareText, PenLine, Video } from "lucide-react";

export interface PortfolioData {
  lessons_attended: number;
  homework_done: number;
  homework_graded: number;
  skill_averages: Record<string, { average: number; count: number; latest: string }>;
  videos_approved: number;
  video_average: number | null;
  words_learned: number;
  words_mastered: number;
  words_by_level: Record<string, number>;
  review_cards: number;
  mistakes_corrected: number;
  lesson_reports: number;
  exam_reports: Array<{ title: string; date: string | null }>;
  standardized: Array<{ test_name: string; date: string; level: string; score: string | null }>;
  approved_levels: Array<{ level: string; date: string }>;
}

const SKILL_LABEL: Record<string, string> = {
  speaking: "Speaking", listening: "Listening", reading: "Reading", writing: "Writing", focus: "Focus", teamwork: "Teamwork",
};

function Fact({ icon: Icon, label, value, sub }: { icon: typeof Award; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-hec-md border border-hec-line p-3">
      <p className="flex items-center gap-1.5 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
        <Icon className="h-3.5 w-3.5" />{label}
      </p>
      <p className="mt-1 font-display text-hec-h3 font-medium text-hec-ink">{value}</p>
      {sub && <p className="text-hec-caption text-hec-ink-soft">{sub}</p>}
    </div>
  );
}

export function DefensePortfolio({ portfolio, compact = false }: { portfolio: PortfolioData | null | undefined; compact?: boolean }) {
  if (!portfolio) return null;
  const p = portfolio;
  const skills = Object.entries(p.skill_averages || {}).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="space-y-3">
      {(p.standardized || []).length > 0 && (
        <div className="rounded-hec-md border border-hec-brass/40 bg-hec-sunken p-3">
          <p className="flex items-center gap-1.5 text-hec-caption font-medium uppercase tracking-wider text-hec-brass">
            <Award className="h-3.5 w-3.5" />Standardized tests
          </p>
          <ul className="mt-2 space-y-1">
            {p.standardized.map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-hec-small text-hec-ink">
                <span>{t.test_name}{t.score ? ` · ${t.score}` : ""}</span>
                <span className="text-hec-ink-soft">{t.date} · <span className="font-semibold text-hec-ink">{t.level}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={compact ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        <Fact icon={CalendarCheck} label="Lessons" value={p.lessons_attended} sub="attended" />
        <Fact icon={PenLine} label="Homework" value={p.homework_done} sub={`${p.homework_graded} graded`} />
        <Fact icon={BookOpen} label="Words" value={p.words_learned} sub={`${p.words_mastered} mastered`} />
        <Fact icon={Video} label="Videos" value={p.videos_approved} sub={p.video_average !== null ? `average ${p.video_average}/100` : "approved by a teacher"} />
        <Fact icon={Layers} label="Review cards" value={p.review_cards} sub={`${p.mistakes_corrected} mistakes corrected`} />
        <Fact icon={MessageSquareText} label="Lesson reports" value={p.lesson_reports} sub={`${(p.exam_reports || []).length} exam reports`} />
      </div>
      {skills.length > 0 && (
        <div className="rounded-hec-md border border-hec-line p-3">
          <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Teacher skill scores (last 12 months)</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {skills.map(([k, v]) => (
              <p key={k} className="flex items-baseline justify-between text-hec-small text-hec-ink">
                <span>{SKILL_LABEL[k] ?? k}</span>
                <span className="text-hec-ink-soft"><span className="font-semibold text-hec-ink">{v.average}</span> · {v.count}</span>
              </p>
            ))}
          </div>
        </div>
      )}
      {!compact && (p.exam_reports || []).length > 0 && (
        <div className="rounded-hec-md border border-hec-line p-3">
          <p className="flex items-center gap-1.5 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft"><FileText className="h-3.5 w-3.5" />School exam reports</p>
          <ul className="mt-1 space-y-0.5">
            {p.exam_reports.map((e, i) => <li key={i} className="text-hec-small text-hec-ink">{e.title}{e.date ? ` · ${e.date}` : ""}</li>)}
          </ul>
        </div>
      )}
      {(p.approved_levels || []).length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-hec-small text-hec-ink-soft">
          <GraduationCap className="h-4 w-4" />Levels on the growth chart:
          {p.approved_levels.slice(0, 5).map((l, i) => (
            <span key={i} className="rounded-hec-sm border border-hec-line px-1.5 text-hec-caption text-hec-ink">{l.level} · {l.date}</span>
          ))}
        </p>
      )}
    </div>
  );
}
