import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { ExamReportEditor } from "./ExamReportEditor";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextView } from "@/components/rich-text";
import { PlaceholderCard } from "@/components/ui/loading";

interface ExamReportsManagerProps {
  /** Pass when used inside a single class context (limits to that class). */
  fixedClassId?: string;
  /** Pass when used inside a single student profile (limits to that student). */
  fixedStudentId?: string;
  /** Restricts the class picker. Null = all classes (admin). */
  staffClassIds?: string[] | null;
  /** Whether the current user can edit/delete other people's reports. */
  isAdmin?: boolean;
  /** Current user id, used to determine ownership-based edit rights. */
  currentUserId?: string;
  title?: string;
}

export function ExamReportsManager({
  fixedClassId,
  fixedStudentId,
  staffClassIds,
  isAdmin = false,
  currentUserId,
  title = "Exam Reports",
}: ExamReportsManagerProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["exam-reports", { fixedClassId, fixedStudentId, staffClassIds }],
    queryFn: async () => {
      let q = supabase
        .from("exam_reports")
        .select("id, title, content_html, file_storage_key, file_name, file_size, exam_date, class_id, student_id, created_by, created_at, students(full_name), classes(name)")
        .order("created_at", { ascending: false });

      if (fixedStudentId) q = q.eq("student_id", fixedStudentId);
      if (fixedClassId) q = q.eq("class_id", fixedClassId);
      if (!isAdmin && !fixedStudentId && !fixedClassId && staffClassIds && staffClassIds.length > 0) {
        q = q.in("class_id", staffClassIds);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (reports || []).filter((r: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.title?.toLowerCase().includes(s) ||
      r.students?.full_name?.toLowerCase().includes(s) ||
      r.classes?.name?.toLowerCase().includes(s)
    );
  });

  const canEdit = (r: any) => isAdmin || r.created_by === currentUserId;

  const handleDelete = async () => {
    if (!deleteId) return;
    const r = reports?.find((x: any) => x.id === deleteId);
    try {
      if (r?.file_storage_key) {
        await supabase.storage.from("exam-reports").remove([r.file_storage_key]);
      }
      const { error } = await supabase.from("exam_reports").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Report deleted" });
      qc.invalidateQueries({ queryKey: ["exam-reports"] });
      qc.invalidateQueries({ queryKey: ["student-exam-reports"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-hec-h1 font-medium text-hec-ink">
            <FileText className="h-6 w-6 shrink-0 text-hec-ink-soft" aria-hidden={true} />
            {title}
          </h2>
          <p className="mt-2 text-hec-small text-hec-ink-soft">Create, edit and share exam reports with students.</p>
        </div>
        <Button className="min-h-hec-target w-full md:w-auto" onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden={true} /> New report
        </Button>
      </div>

      {!fixedStudentId && !fixedClassId && (
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" aria-hidden={true} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, student or class…"
            aria-label="Search by title, student or class"
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <PlaceholderCard rows={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-hec-body text-hec-ink-soft">
            No exam reports yet. Click "New report" to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="break-words">{r.title}</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.students?.full_name && <Badge variant="secondary" className="whitespace-normal break-words">{r.students.full_name}</Badge>}
                      {r.classes?.name && <Badge variant="outline" className="whitespace-normal break-words">{r.classes.name}</Badge>}
                      {r.exam_date && <Badge variant="outline" className="tabular-nums">Exam: {format(new Date(r.exam_date), "MMM d, yyyy")}</Badge>}
                      {r.file_name && <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" aria-hidden={true} /> PDF</Badge>}
                    </div>
                  </div>
                  {canEdit(r) && (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" size="icon" className="min-h-hec-target min-w-hec-target" aria-label={`Edit ${r.title}`} onClick={() => { setEditing(r); setEditorOpen(true); }}>
                        <Pencil className="h-5 w-5" aria-hidden={true} />
                      </Button>
                      <Button variant="ghost" size="icon" className="min-h-hec-target min-w-hec-target text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger" aria-label={`Delete ${r.title}`} onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-5 w-5" aria-hidden={true} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {r.content_html && (
                <CardContent className="pt-0">
                  <RichTextView
                    className="prose prose-sm max-w-none break-words text-hec-ink"
                    html={r.content_html}
                  />
                </CardContent>
              )}
              <CardContent className="pt-0 text-hec-caption text-hec-ink-soft tabular-nums">
                Created {format(new Date(r.created_at), "MMM d, yyyy")}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExamReportEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        fixedClassId={fixedClassId}
        fixedStudentId={fixedStudentId}
        staffClassIds={staffClassIds}
        report={editing}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. The attached PDF will also be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{"Keep the report"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90">{"Delete the report"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
