/**
 * ReportDocument — the single source of truth for what a student report
 * LOOKS like.
 *
 * Extracted from AIReportDialog so that the dialog, the print copy and the
 * bulk PDF exporter all render byte-identical documents. If a section is
 * added here it appears everywhere at once; previously the bulk exporter
 * would have been a second, silently drifting copy.
 */
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Compass, ListChecks } from "lucide-react";

export const SKILLS = ["speaking", "listening", "reading", "writing", "grammar", "vocabulary"] as const;

/** The school letterhead — visible on screen, on paper and in exported PDFs. */
export function BrandHeader({ studentName, periodStart, periodEnd, title = "Progress Report" }: {
  studentName: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  /** What this document is. The letterhead is shared with the financial
      statement, which is emphatically not a progress report. */
  title?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b pb-3 print-avoid-break">
      <img
        src="/images/hec_logo.png"
        alt="Happy English Club"
        className="h-12 w-12 rounded-xl object-contain shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-base font-black leading-tight">Happy English Club</p>
        <p className="text-[11px] text-muted-foreground print-muted">
          Hanoi English · hanoienglish.com
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground print-muted">
          {studentName}
          {periodStart && periodEnd ? ` · ${periodStart} → ${periodEnd}` : ""}
        </p>
      </div>
    </div>
  );
}

type Bi = { en: string; vi?: string | null } | null | undefined;
function BiText({ t, className = "" }: { t: Bi; className?: string }) {
  if (!t?.en) return null;
  return (
    <div className={className}>
      <p className="text-sm">{t.en}</p>
      {t.vi && <p lang="vi" className="text-xs text-muted-foreground print-muted">{t.vi}</p>}
    </div>
  );
}

/**
 * The family page (report.parent, English with Vietnamese) as the Family PDF
 * prints it, so the teacher reads what parents will get before handing it out.
 */
export function FamilyPagePreview({ report }: { report: any }) {
  const p = report?.parent;
  const f = report?.facts;
  if (!p) return null;
  const list = (title: string, vi: string, items: any[] | undefined, render: (x: any, i: number) => React.ReactNode) =>
    items?.length ? (
      <div>
        <p className="text-sm font-bold">{title} <span lang="vi" className="font-normal text-muted-foreground">· {vi}</span></p>
        <ul className="mt-1 space-y-2">{items.map((x, i) => <li key={i}>{render(x, i)}</li>)}</ul>
      </div>
    ) : null;
  return (
    <div className="rounded-2xl border border-emerald-500/30 p-4 space-y-3 print-avoid-break">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Family page · what parents read</p>
      {p.headline && <BiText t={p.headline} className="rounded-xl bg-emerald-500/5 p-3" />}
      {f?.lessons_held > 0 && (
        <p className="text-xs text-muted-foreground">
          Lessons {f.lessons_attended}/{f.lessons_attended + f.lessons_absent} · {f.words_added} new words ·{" "}
          {f.homework_submitted} homework · {f.work_reviewed} work reviewed · {f.lesson_reports} lesson reports · {f.points_earned} points
        </p>
      )}
      {list("What your child can do now", "Những điều con đã làm được", p.can_do, (c) => (
        <><BiText t={c.text} />{c.evidence && <BiText t={c.evidence} className="opacity-70" />}</>
      ))}
      {list("Our next goals", "Mục tiêu tiếp theo", p.next_goals, (g) => (
        <><BiText t={g.goal} className="font-semibold" /><BiText t={g.why} />{g.in_class && <BiText t={g.in_class} className="opacity-80" />}</>
      ))}
      {list("How you can help at home", "Bố mẹ đồng hành cùng con", p.at_home, (t) => <BiText t={t} />)}
      {list("Ask your child", "Hỏi con", p.ask_your_child, (t) => <BiText t={t} />)}
      {p.next_period && <BiText t={p.next_period} />}
      {p.teacher_note && <BiText t={p.teacher_note} className="rounded-xl bg-emerald-500/5 p-3" />}
    </div>
  );
}

/** All report sections — shared by the on-screen dialog, print and PDF. */
export function ReportBody({ report, latest }: { report: any; latest: any }) {
  return (
    <div className="space-y-4">
      <FamilyPagePreview report={report} />
      {/* CEFR headline */}
      {report.cefr && (
        <div className="rounded-2xl border bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-4 flex items-center gap-4 print-avoid-break">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
            {report.cefr.level}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Estimated CEFR level
              {typeof report.cefr.confidence === "number" && (
                <span className="text-muted-foreground print-muted font-normal">
                  {" "}· {Math.round(report.cefr.confidence * 100)}% confidence
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground print-muted mt-1">{report.cefr.rationale}</p>
          </div>
        </div>
      )}

      {/* Skill matrix */}
      {report.skill_matrix && (
        <div className="rounded-2xl border p-4 print-avoid-break">
          <p className="text-sm font-bold mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-violet-500" />Skill matrix
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {SKILLS.map((skill) => {
              const s = report.skill_matrix[skill];
              if (!s) return null;
              return (
                <div key={skill}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold capitalize">{skill}</span>
                    <span className="text-muted-foreground print-muted">{s.score}/5</span>
                  </div>
                  <Progress value={(s.score / 5) * 100} className="h-1.5" />
                  {s.note && <p className="text-[11px] text-muted-foreground print-muted mt-1">{s.note}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths / weaknesses matrix */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 print-avoid-break">
          <p className="text-sm font-bold text-emerald-600 flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />Strengths
          </p>
          <div className="space-y-2">
            {(report.strengths || []).map((s: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold">{s.area}</p>
                <p className="text-xs text-muted-foreground print-muted">{s.evidence}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 print-avoid-break">
          <p className="text-sm font-bold text-amber-600 flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4" />Growth areas
          </p>
          <div className="space-y-2">
            {(report.weaknesses || []).map((w: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold">{w.area}</p>
                <p className="text-xs text-muted-foreground print-muted">{w.evidence}</p>
                {w.recommendation && (
                  <p className="text-xs text-amber-600 mt-0.5">→ {w.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning styles + recommendations */}
      {(report.learning_styles?.length || report.recommendations?.length) && (
        <div className="rounded-2xl border p-4 space-y-3 print-avoid-break">
          {report.learning_styles?.length > 0 && (
            <div>
              <p className="text-sm font-bold flex items-center gap-2 mb-1.5">
                <Compass className="h-4 w-4 text-blue-500" />Learning styles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {report.learning_styles.map((l: string, i: number) => (
                  <Badge key={i} variant="secondary" className="font-normal">{l}</Badge>
                ))}
              </div>
            </div>
          )}
          {report.recommendations?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-1.5">Next steps for the teacher</p>
              <ul className="space-y-1">
                {report.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground print-muted flex gap-2">
                    <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Narrative */}
      {latest?.narrative && (
        <div className="rounded-2xl border p-4">
          <p className="text-sm font-bold mb-2">Report narrative</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground print-muted">
            {latest.narrative}
          </p>
        </div>
      )}

      {latest?.source_counts && (
        <p className="text-[11px] text-muted-foreground print-muted text-center">
          Evidence: {latest.source_counts.transcript_metrics} transcript metrics ·{" "}
          {latest.source_counts.logged_errors} errors · {latest.source_counts.vocab_words} words ·{" "}
          {latest.source_counts.approved_work_samples} work samples ·{" "}
          {latest.source_counts.attendance_records} attendance records
        </p>
      )}
    </div>
  );
}

/**
 * A complete, self-contained report page: letterhead, body and footer.
 *
 * Used by the bulk PDF exporter, which renders this off-screen at a fixed
 * A4 content width and rasterises it. Theme is handled at capture time —
 * exportNodeToPdf strips the `dark` class from html2canvas's CLONE of the
 * document, so an admin working in dark mode still exports a white page
 * instead of white text on white paper, without the live UI flickering.
 */
export function ReportDocument({ studentName, report, latest, className }: {
  studentName: string;
  report: any;
  latest: any;
  className?: string;
}) {
  return (
    <div data-hec-document="" className={`bg-white text-black ${className ?? ""}`}>
      <div className="space-y-4">
        <BrandHeader
          studentName={studentName}
          periodStart={latest?.period_start}
          periodEnd={latest?.period_end}
        />
        <ReportBody report={report} latest={latest} />
        <p className="text-[10px] text-center print-muted">
          Generated by Happy English Club · hanoienglish.com · {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
