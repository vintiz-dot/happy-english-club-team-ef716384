import { useState, lazy, Suspense, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, FileText, X } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = lazy(() => import("react-quill-new"));

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ExamReportEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, restricts the class picker to this class. */
  fixedClassId?: string;
  /** When provided, restricts the student picker to this student. */
  fixedStudentId?: string;
  /** Existing report to edit. When omitted, a new report is created. */
  report?: {
    id: string;
    title: string;
    content_html: string | null;
    file_storage_key: string | null;
    file_name: string | null;
    exam_date: string | null;
    class_id: string | null;
    student_id: string;
  } | null;
  /** Limits class options to those the staff member teaches. Pass null/undefined for admin (all classes). */
  staffClassIds?: string[] | null;
}

export function ExamReportEditor({
  open,
  onOpenChange,
  fixedClassId,
  fixedStudentId,
  report,
  staffClassIds,
}: ExamReportEditorProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [classId, setClassId] = useState<string | undefined>(fixedClassId);
  const [studentId, setStudentId] = useState<string | undefined>(fixedStudentId);
  const [examDate, setExamDate] = useState<string>("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingStorageKey, setExistingStorageKey] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (report) {
      setTitle(report.title);
      setContentHtml(report.content_html || "");
      setClassId(report.class_id || fixedClassId);
      setStudentId(report.student_id);
      setExamDate(report.exam_date || "");
      setExistingFileName(report.file_name);
      setExistingStorageKey(report.file_storage_key);
      setRemoveExistingFile(false);
      setPdfFile(null);
    } else {
      setTitle("");
      setContentHtml("");
      setClassId(fixedClassId);
      setStudentId(fixedStudentId);
      setExamDate("");
      setExistingFileName(null);
      setExistingStorageKey(null);
      setRemoveExistingFile(false);
      setPdfFile(null);
    }
  }, [open, report, fixedClassId, fixedStudentId]);

  // Classes available to pick from
  const { data: classes } = useQuery({
    queryKey: ["exam-report-classes", staffClassIds],
    enabled: open && !fixedClassId,
    queryFn: async () => {
      let q = supabase.from("classes").select("id, name").eq("is_active", true).order("name");
      if (staffClassIds && staffClassIds.length > 0) {
        q = q.in("id", staffClassIds);
      } else if (staffClassIds && staffClassIds.length === 0) {
        return [];
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Students enrolled in selected class
  const { data: students } = useQuery({
    queryKey: ["exam-report-students", classId],
    enabled: open && !!classId && !fixedStudentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, students(id, full_name)")
        .eq("class_id", classId!)
        .is("end_date", null);
      if (error) throw error;
      const list = (data || [])
        .map((e: any) => e.students)
        .filter(Boolean) as { id: string; full_name: string }[];
      // Dedup
      const seen = new Set<string>();
      return list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
    },
  });

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are allowed.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 10 MB.", variant: "destructive" });
      return;
    }
    setPdfFile(f);
    setRemoveExistingFile(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (!studentId) {
      toast({ title: "Pick a student", variant: "destructive" });
      return;
    }
    if (!classId) {
      toast({ title: "Pick a class", variant: "destructive" });
      return;
    }
    if (!contentHtml.replace(/<[^>]*>/g, "").trim() && !pdfFile && !existingFileName) {
      toast({ title: "Add content or upload a PDF", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let storageKey: string | null = existingStorageKey;
      let fileName: string | null = existingFileName;
      let fileSize: number | null = null;

      if (removeExistingFile && existingStorageKey) {
        await supabase.storage.from("exam-reports").remove([existingStorageKey]);
        storageKey = null;
        fileName = null;
      }

      if (pdfFile) {
        // Replace any old file
        if (existingStorageKey && !removeExistingFile) {
          await supabase.storage.from("exam-reports").remove([existingStorageKey]);
        }
        const key = `${studentId}/${Date.now()}-${pdfFile.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("exam-reports")
          .upload(key, pdfFile, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        storageKey = key;
        fileName = pdfFile.name;
        fileSize = pdfFile.size;
      }

      const payload = {
        title: title.trim(),
        content_html: contentHtml.trim() || null,
        student_id: studentId,
        class_id: classId,
        exam_date: examDate || null,
        file_storage_key: storageKey,
        file_name: fileName,
        ...(fileSize !== null ? { file_size: fileSize } : {}),
      };

      if (report?.id) {
        const { error } = await supabase
          .from("exam_reports")
          .update(payload)
          .eq("id", report.id);
        if (error) throw error;
        toast({ title: "Report updated" });
      } else {
        const { error } = await supabase
          .from("exam_reports")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast({ title: "Report created" });
      }

      qc.invalidateQueries({ queryKey: ["exam-reports"] });
      qc.invalidateQueries({ queryKey: ["student-exam-reports"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{report ? "Edit exam report" : "New exam report"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!fixedClassId && (
              <div className="space-y-2">
                <Label htmlFor="exam-report-class">Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); if (!fixedStudentId) setStudentId(undefined); }}>
                  <SelectTrigger id="exam-report-class"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!fixedStudentId && (
              <div className="space-y-2">
                <Label htmlFor="exam-report-student">Student</Label>
                <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                  <SelectTrigger id="exam-report-student"><SelectValue placeholder={classId ? "Select student" : "Pick a class first"} /></SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-report-title">Report title</Label>
              <Input id="exam-report-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Exam Report" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-report-date">Exam date (optional)</Label>
              <Input id="exam-report-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Report content (optional)</Label>
            <Suspense fallback={<div className="flex h-40 items-center justify-center text-hec-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
              <div className="rounded-hec-md bg-hec-raised text-hec-ink [&_.ql-toolbar]:!rounded-t-hec-md [&_.ql-toolbar]:!border-hec-line-strong [&_.ql-container]:!rounded-b-hec-md [&_.ql-container]:!border-hec-line-strong [&_.ql-stroke]:!stroke-hec-ink-soft [&_.ql-fill]:!fill-hec-ink-soft [&_.ql-picker]:!text-hec-ink-soft [&_.ql-editor.ql-blank::before]:!text-hec-ink-faint">
                <ReactQuill
                  value={contentHtml}
                  onChange={setContentHtml}
                  theme="snow"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["link", "blockquote"],
                      ["clean"],
                    ],
                  }}
                />
              </div>
            </Suspense>
          </div>

          <div className="space-y-2">
            <Label>Attach PDF (optional, max 10 MB)</Label>
            {existingFileName && !removeExistingFile && !pdfFile && (
              <div className="flex items-center justify-between gap-2 rounded-hec-md border border-hec-line bg-hec-sunken p-2">
                <div className="flex min-w-0 items-center gap-2 text-hec-small text-hec-ink">
                  <FileText className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                  <span className="truncate">{existingFileName}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="shrink-0" aria-label="Remove the PDF" onClick={() => setRemoveExistingFile(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {pdfFile && (
              <div className="flex items-center justify-between gap-2 rounded-hec-md border border-hec-line bg-hec-sunken p-2">
                <div className="flex min-w-0 items-center gap-2 text-hec-small text-hec-ink">
                  <FileText className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                  <span className="truncate">{pdfFile.name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="shrink-0" aria-label="Remove the PDF" onClick={() => setPdfFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <label className="flex min-h-hec-target cursor-pointer items-center justify-center gap-2 rounded-hec-md border border-dashed border-hec-line-strong p-4 text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hec-ring">
              <Upload className="h-4 w-4" aria-hidden />
              <span className="text-hec-small">Choose PDF file</span>
              <input type="file" accept="application/pdf" className="sr-only" onChange={handlePdfChange} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {report ? "Save changes" : "Create report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
