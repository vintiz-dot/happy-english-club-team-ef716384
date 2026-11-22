/**
 * ClassReportDownload - for the staff of a lesson (teacher, TA, admin):
 * one PDF per child of an approved lesson report, exactly the family's view
 * (the class part plus that child's own part), downloaded together as one zip.
 * One child downloads as a bare PDF.
 *
 * Reads as the caller: lesson_reports / lesson_report_students under their
 * staff RLS, pictures through lesson-report-file, which asks the database as
 * the caller. staff_part is never read. Each child is fault-isolated: one
 * picture or one PDF failing never drops the others, and the toast says who.
 *
 * Rendering: the browser rasteriser (src/lib/reportPdf.ts) keeps Vietnamese
 * exact. There is no HEC Docs template for this document yet.
 */
import { useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { attendanceLabel, hasLearned, metChip, type Bilingual, type LessonReportView } from "@/lib/lessonReportView";
import { childReports, reportFileNames, zipName, type ChildReport, type LessonMeta } from "@/lib/lessonReportBatch";
import { A4_CONTENT_WIDTH_PX, downloadBlob, nodeToPdfBlob } from "@/lib/reportPdf";

const db = supabase as any;

async function fileDataUrl(kind: "photo" | "work", id: string, studentId: string | null): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-report-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(studentId ? { kind, id, student_id: studentId } : { kind, id }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Everything the batch needs, read as the caller. Null when the lesson has no approved report. */
async function loadBatch(sessionId: string): Promise<{ lesson: LessonMeta; reports: ChildReport[] } | null> {
  const [{ data: report, error }, { data: s, error: sErr }] = await Promise.all([
    db.from("lesson_reports").select("id, session_id, class_part, photo_ids, review_homework_id").eq("session_id", sessionId).maybeSingle(),
    db.from("sessions").select("date, start_time, classes(name)").eq("id", sessionId).maybeSingle(),
  ]);
  if (error) throw error;
  if (sErr) throw sErr;
  if (!report) return null;
  const { data: parts, error: pErr } = await db.from("lesson_report_students").select("student_id, part").eq("report_id", report.id);
  if (pErr) throw pErr;
  const ids = (parts ?? []).map((p: any) => p.student_id);
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: st } = await db.from("students").select("id, full_name").in("id", ids);
    for (const x of st ?? []) names[x.id] = x.full_name ?? "";
  }
  const lesson: LessonMeta = { date: String(s?.date ?? "").slice(0, 10), start_time: s?.start_time ?? null, class_name: s?.classes?.name ?? "" };
  return { lesson, reports: childReports(report, parts ?? [], names, lesson) };
}

// ------------------------------------------------------------------ the printed page

function Bi({ text, big }: { text: Bilingual | null; big?: boolean }) {
  if (!text) return null;
  return (
    <div>
      <div style={{ fontSize: big ? 15 : 13, color: "#1f2328" }}>{text.en}</div>
      {text.vi && <div lang="vi" style={{ fontSize: 12, color: "#5b616b" }}>{text.vi}</div>}
    </div>
  );
}

function Heading({ en, vi }: { en: string; vi: string }) {
  return (
    <div style={{ marginTop: 18, marginBottom: 6, borderBottom: "1px solid #e3ddd0", paddingBottom: 3 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#7a5a1e" }}>{en}</span>
      <span lang="vi" style={{ fontSize: 12, color: "#8a8f98" }}> · {vi}</span>
    </div>
  );
}

const box = { border: "1px solid #e3ddd0", borderRadius: 6, padding: "6px 10px", marginBottom: 6 } as const;

function List({ items }: { items: Bilingual[] }) {
  return <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((t, i) => <li key={i} style={{ marginBottom: 4 }}><Bi text={t} /></li>)}</ul>;
}

export function LessonReportPrint({ name, v, pictures }: { name: string; v: LessonReportView; pictures: Record<string, string | null> }) {
  const c = v.child;
  const img = (id: string, h: number): ReactNode => pictures[id]
    ? <img src={pictures[id]!} alt="" style={{ width: "100%", height: h, objectFit: "cover", borderRadius: 6, border: "1px solid #e3ddd0" }} />
    : null;
  const photos = v.photos.filter((p) => pictures[p.id]);
  const works = (c?.workIds ?? []).filter((id) => pictures[id]);
  return (
    <div style={{ width: A4_CONTENT_WIDTH_PX, padding: 32, background: "#fff", fontFamily: "Inter, Arial, sans-serif", color: "#1f2328", lineHeight: 1.4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #7a5a1e", paddingBottom: 10 }}>
        <img src="/images/hec_logo.png" alt="" style={{ height: 40 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#5b616b" }}>Happy English Club · Class report · <span lang="vi">Báo cáo buổi học</span></div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#5b616b" }}>{v.className} · {v.date}{v.startTime ? ` · ${v.startTime}` : ""}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{v.title.en}</div>
        {v.title.vi && <div lang="vi" style={{ fontSize: 13, color: "#5b616b" }}>{v.title.vi}</div>}
        {v.summary && <div style={{ marginTop: 6 }}><Bi text={v.summary} /></div>}
      </div>

      {c && (
        <div style={{ marginTop: 16, border: "1px solid #d9c49a", background: "#faf6ee", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#7a5a1e" }}>
            Your child today <span lang="vi" style={{ fontWeight: 400, textTransform: "none", color: "#8a8f98" }}>· Con hôm nay</span>
          </div>
          <div style={{ fontSize: 12, color: "#5b616b", margin: "4px 0 6px" }}>
            {c.attendance && <>{attendanceLabel(c.attendance).en} · <span lang="vi">{attendanceLabel(c.attendance).vi}</span></>}
            {c.points !== null && c.points !== 0 && <>{c.attendance ? "   ·   " : ""}{c.points > 0 ? `+${c.points}` : c.points} points</>}
          </div>
          {c.highlight && <Bi text={c.highlight} big />}
          {works.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 8 }}>
              {works.map((id) => <div key={id}>{img(id, 120)}</div>)}
            </div>
          )}
          {c.teacherComment && (
            <div style={{ ...box, background: "#fff", marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#7a5a1e", fontWeight: 600 }}>From the teacher · <span lang="vi">Lời cô/thầy</span></div>
              <Bi text={c.teacherComment} />
            </div>
          )}
          {c.focusNext && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: "#7a5a1e", fontWeight: 600 }}>Next focus · <span lang="vi">Cần chú ý</span></div>
              <Bi text={c.focusNext} />
            </div>
          )}
        </div>
      )}

      {v.objectives.length > 0 && (
        <>
          <Heading en="Today's goals" vi="Mục tiêu hôm nay" />
          {v.objectives.map((o, i) => (
            <div key={i} style={{ ...box, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}><Bi text={o.text} /></div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7a5a1e", whiteSpace: "nowrap" }}>{metChip(o.met).label.en}</div>
            </div>
          ))}
        </>
      )}

      {hasLearned(v) && (
        <>
          <Heading en="What we learned" vi="Chúng con đã học" />
          {v.taught.map((t, i) => <div key={i} style={{ marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{t.topic}</div><Bi text={t.detail} /></div>)}
          {v.words.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
              {v.words.map((w, i) => (
                <div key={i} style={{ border: "1px solid #e3ddd0", background: "#f6f4ef", borderRadius: 6, padding: "3px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.en}</div>
                  {w.vi && <div lang="vi" style={{ fontSize: 11, color: "#5b616b" }}>{w.vi}</div>}
                </div>
              ))}
            </div>
          )}
          {v.structures.map((s, i) => (
            <div key={i} style={box}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.pattern}</div>
              {s.example && <div style={{ fontSize: 12, fontStyle: "italic", color: "#5b616b" }}>“{s.example}”</div>}
            </div>
          ))}
          {v.activities.map((a, i) => <div key={i} style={{ marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div><Bi text={a.description} /></div>)}
        </>
      )}

      {photos.length > 0 && (
        <>
          <Heading en="Photos from class" vi="Hình ảnh buổi học" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {photos.map((p) => <div key={p.id}>{img(p.id, 150)}{p.caption && <div style={{ marginTop: 2 }}><Bi text={p.caption} /></div>}</div>)}
          </div>
        </>
      )}

      {v.classFocus.length > 0 && <><Heading en="What the class is working on" vi="Cả lớp đang luyện" /><List items={v.classFocus} /></>}
      {v.tips.length > 0 && <><Heading en="Tips for home" vi="Gợi ý ở nhà" /><List items={v.tips} /></>}
      {v.askYourChild.length > 0 && <><Heading en="Ask your child" vi="Hỏi con" /><List items={v.askYourChild} /></>}
      {(v.homework.length > 0 || v.reviewHomeworkId) && (
        <>
          <Heading en="Homework" vi="Bài tập về nhà" />
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {v.homework.map((h, i) => <li key={i}>{h.title}{h.dueDate ? ` · due ${h.dueDate}` : ""}</li>)}
            {v.reviewHomeworkId && <li>Review quiz in the app · <span lang="vi">Bài ôn tập trong ứng dụng</span></li>}
          </ul>
        </>
      )}
      {v.nextLesson && <><Heading en="Next lesson" vi="Buổi học tới" /><Bi text={v.nextLesson} /></>}
    </div>
  );
}

// ------------------------------------------------------------------ the batch

export type BatchProgress = { done: number; total: number; current: string };

/**
 * Builds and downloads every child's report for one lesson. Returns how many
 * files went out and who failed. Throws only when nothing could be read.
 */
export async function downloadClassReports(
  sessionId: string,
  stage: HTMLElement,
  onProgress?: (p: BatchProgress) => void,
): Promise<{ files: number; failed: string[] }> {
  const batch = await loadBatch(sessionId);
  if (!batch) throw new Error("This lesson has no approved report yet");
  const { lesson, reports } = batch;
  if (!reports.length) throw new Error("The approved report has no child parts");

  // Class photos are the same for every child: fetch each once.
  const pictures: Record<string, string | null> = {};
  const photoIds = [...new Set(reports.flatMap((r) => r.view.photos.map((p) => p.id)))];
  await Promise.all(photoIds.map(async (id) => { pictures[id] = await fileDataUrl("photo", id, null); }));

  const names = reportFileNames(reports, lesson);
  const files: { name: string; blob: Blob }[] = [];
  const failed: string[] = [];
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    onProgress?.({ done: i, total: reports.length, current: r.name });
    const own: Record<string, string | null> = { ...pictures };
    await Promise.all((r.view.child?.workIds ?? []).map(async (id) => { own[id] = await fileDataUrl("work", id, r.studentId); }));
    const host = document.createElement("div");
    stage.appendChild(host);
    const root = createRoot(host);
    try {
      flushSync(() => root.render(<LessonReportPrint name={r.name} v={r.view} pictures={own} />));
      await new Promise((res) => setTimeout(res, 120));
      await (document as any).fonts?.ready?.catch?.(() => {});
      files.push({ name: names[i], blob: await nodeToPdfBlob(host) });
    } catch {
      failed.push(r.name);
    } finally {
      root.unmount();
      host.remove();
    }
  }
  onProgress?.({ done: reports.length, total: reports.length, current: "" });

  if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
  else if (files.length > 1) {
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, f.blob);
    downloadBlob(await zip.generateAsync({ type: "blob" }), zipName(lesson));
  }
  return { files: files.length, failed };
}

/** Off-screen stage: html2canvas cannot measure a display:none subtree. */
export function ReportStage({ stageRef }: { stageRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={stageRef} aria-hidden
      style={{ position: "fixed", left: -10000, top: 0, width: A4_CONTENT_WIDTH_PX, pointerEvents: "none" }} />
  );
}

/** The run, with its toasts, for a button or an automatic start after approval. */
export function useClassReportDownload() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const run = async (sessionId: string) => {
    if (progress || !stageRef.current) return;
    setProgress({ done: 0, total: 0, current: "" });
    try {
      const { files, failed } = await downloadClassReports(sessionId, stageRef.current, setProgress);
      if (!files) toast.error("No report could be made", { description: failed.join(", ") });
      else toast.success(`Downloaded ${files} child report${files === 1 ? "" : "s"}`,
        failed.length ? { description: `Not included: ${failed.join(", ")}` } : undefined);
    } catch (e: any) {
      toast.error(e?.message ?? "The reports could not be downloaded");
    } finally {
      setProgress(null);
    }
  };
  return { stageRef, progress, run, busy: progress !== null };
}

export default function ClassReportDownloadButton({ sessionId, size = "default", label = "Download all children's reports" }: {
  sessionId: string; size?: "default" | "sm"; label?: string;
}) {
  const d = useClassReportDownload();
  return (
    <>
      <Button type="button" variant="outline" size={size} disabled={d.busy}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); d.run(sessionId); }}>
        {d.busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {d.busy && d.progress?.total ? `${d.progress.done}/${d.progress.total}` : label}
      </Button>
      <ReportStage stageRef={d.stageRef} />
    </>
  );
}
