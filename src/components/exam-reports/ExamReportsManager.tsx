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
import { useIvory } from "@/hooks/useIvory";
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
  // Rendered on teacher and admin routes; the new classes only on an ivory (listed) route, the old ones verbatim elsewhere.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
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
          <h2 className={iv("flex items-center gap-2 font-display text-hec-h1 font-medium text-hec-ink", "text-2xl font-bold flex items-center gap-2")}>
            <FileText className={iv("h-6 w-6 shrink-0 text-hec-ink-soft", "h-6 w-6 text-primary")} aria-hidden={ivory ? true : undefined} />
            {title}
          </h2>
          <p className={iv("mt-2 text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>Create, edit and share exam reports with students.</p>
        </div>
        <Button className={iv("min-h-hec-target w-full md:w-auto", "")} onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className={iv("h-4 w-4", "h-4 w-4 mr-2")} aria-hidden={ivory ? true : undefined} /> New report
        </Button>
      </div>

      {!fixedStudentId && !fixedClassId && (
        <div className={iv("relative w-full sm:max-w-md", "relative max-w-md")}>
          <Search className={iv("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint", "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground")} aria-hidden={ivory ? true : undefined} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, student or class…"
            aria-label={ivory ? "Search by title, student or class" : undefined}
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <PlaceholderCard rows={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className={iv("p-8 text-center text-hec-body text-hec-ink-soft", "p-8 text-center text-muted-foreground")}>
            No exam reports yet. Click "New report" to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className={iv("min-w-0 flex-1", "min-w-0")}>
                    <CardTitle className={iv("break-words", "text-lg truncate")}>{r.title}</CardTitle>
                    <div className={iv("mt-2 flex flex-wrap gap-2", "flex flex-wrap gap-2 mt-1.5")}>
                      {r.students?.full_name && <Badge variant="secondary" className={iv("whitespace-normal break-words", "")}>{r.students.full_name}</Badge>}
                      {r.classes?.name && <Badge variant="outline" className={iv("whitespace-normal break-words", "")}>{r.classes.name}</Badge>}
                      {r.exam_date && <Badge variant="outline" className={iv("tabular-nums", "")}>Exam: {format(new Date(r.exam_date), "MMM d, yyyy")}</Badge>}
                      {r.file_name && <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" aria-hidden={ivory ? true : undefined} /> PDF</Badge>}
                    </div>
                  </div>
                  {canEdit(r) && (
                    <div className={iv("flex shrink-0 gap-2", "flex gap-1 shrink-0")}>
                      <Button variant="ghost" size="icon" className={iv("min-h-hec-target min-w-hec-target", "")} aria-label={ivory ? `Edit ${r.title}` : undefined} onClick={() => { setEditing(r); setEditorOpen(true); }}>
                        <Pencil className={iv("h-5 w-5", "h-4 w-4")} aria-hidden={ivory ? true : undefined} />
                      </Button>
                      <Button variant="ghost" size="icon" className={iv("min-h-hec-target min-w-hec-target text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger", "")} aria-label={ivory ? `Delete ${r.title}` : undefined} onClick={() => setDeleteId(r.id)}>
                        <Trash2 className={iv("h-5 w-5", "h-4 w-4 text-destructive")} aria-hidden={ivory ? true : undefined} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {r.content_html && (
                <CardContent className="pt-0">
                  <RichTextView
                    className={iv("prose prose-sm max-w-none break-words text-hec-ink", "prose prose-sm max-w-none dark:prose-invert text-foreground")}
                    html={r.content_html}
                  />
                </CardContent>
              )}
              <CardContent className={iv("pt-0 text-hec-caption text-hec-ink-soft tabular-nums", "pt-0 text-xs text-muted-foreground")}>
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
            <AlertDialogCancel>{ivory ? "Keep the report" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={iv("bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90", "")}>{ivory ? "Delete the report" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
