import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";
import { RichTextEditor } from "@/components/rich-text";

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
              <Label id="edit-description-label" htmlFor="edit-description">Description</Label>
              <RichTextEditor
                id="edit-description"
                ariaLabelledBy="edit-description-label"
                toolbar="full"
                value={body}
                onChange={setBody}
                placeholder="Assignment instructions and details..."
                fallback={<div className={ivory ? "flex h-40 items-center justify-center rounded-hec-md border border-hec-line-strong text-hec-ink-faint" : "h-40 border rounded-md flex items-center justify-center text-muted-foreground"}><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading editor...</div>}
              />
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
