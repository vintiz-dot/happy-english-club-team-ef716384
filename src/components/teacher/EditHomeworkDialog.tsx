import { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import "react-quill-new/dist/quill.snow.css";
import { Loader2 } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";

// Ivory: Quill paints its toolbar #444 and its picker menu white, unreadable in dark. These selectors are one class
// more specific than quill.snow.css's own, so they win without !important and Quill's hover / active / open states
// (more specific still) keep showing. Same treatment as ExamReportEditor (PC2-harvest).
const IVORY_QUILL = "rounded-hec-md bg-hec-raised [&_.ql-toolbar.ql-snow]:border-hec-line-strong [&_.ql-container.ql-snow]:border-hec-line-strong [&_.ql-toolbar_.ql-stroke]:stroke-hec-ink-soft [&_.ql-toolbar_.ql-stroke-miter]:stroke-hec-ink-soft [&_.ql-toolbar_.ql-formats_.ql-fill]:fill-hec-ink-soft [&_.ql-toolbar_.ql-picker]:text-hec-ink-soft [&_.ql-toolbar_.ql-picker-options]:bg-hec-raised [&_.ql-editor.ql-blank::before]:text-hec-ink-faint";

const ReactQuill = lazy(() => import("react-quill-new"));

interface EditHomeworkDialogProps {
  homeworkId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditHomeworkDialog({ homeworkId, isOpen, onClose, onSuccess }: EditHomeworkDialogProps) {
  const ivory = useIvory();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (homeworkId && isOpen) {
      loadHomework();
    }
  }, [homeworkId, isOpen]);

  const loadHomework = async () => {
    if (!homeworkId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("homeworks")
        .select("title, body, due_date")
        .eq("id", homeworkId)
        .single();

      if (error) throw error;

      setTitle(data.title || "");
      setBody(data.body || "");
      setDueDate(data.due_date || "");
    } catch (error: any) {
      toast({
        title: "Error loading assignment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!homeworkId || !title) {
      toast({
        title: "Missing fields",
        description: "Please provide a title",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("homeworks")
        .update({
          title,
          body: body || null,
          due_date: dueDate || null,
        })
        .eq("id", homeworkId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error updating assignment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!homeworkId) return;
    
    if (!confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("homeworks")
        .delete()
        .eq("id", homeworkId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error deleting assignment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>Update assignment details</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={ivory ? "h-8 w-8 animate-spin text-hec-ink-faint" : "h-8 w-8 animate-spin"} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Suspense fallback={<div className={ivory ? "flex h-40 items-center justify-center rounded-hec-md border border-hec-line-strong text-hec-ink-faint" : "h-40 border rounded-md flex items-center justify-center text-muted-foreground"}><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading editor...</div>}>
                <div className={ivory ? IVORY_QUILL : undefined}>
                <ReactQuill
                  theme="snow"
                  value={body}
                  onChange={setBody}
                  placeholder="Assignment instructions and details..."
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ color: [] }, { background: [] }],
                      [{ list: "ordered" }, { list: "bullet" }],
                      [{ script: "sub" }, { script: "super" }],
                      [{ align: [] }],
                      ["link", "image"],
                      ["clean"],
                    ],
                  }}
                />
                </div>
              </Suspense>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className={ivory ? "flex flex-wrap gap-2 pt-4" : "flex gap-2 pt-4"}>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
              <Button onClick={handleDelete} disabled={saving} variant={ivory ? "destructive-quiet" : "destructive"}>
                Delete
              </Button>
              <Button onClick={onClose} variant="outline" disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
