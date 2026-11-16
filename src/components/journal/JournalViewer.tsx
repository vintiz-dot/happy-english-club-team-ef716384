import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { RichTextView } from "@/components/rich-text";

interface JournalEntry {
  id: string;
  title: string;
  content_rich: string;
  type: string;
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}

interface JournalViewerProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

export function JournalViewer({ entry, onClose }: JournalViewerProps) {
  if (!entry) return null;

  return (
    <Dialog open={!!entry} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{entry.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(entry.created_at), "PPP")}
            {entry.updated_at !== entry.created_at && " (edited)"}
          </p>
        </DialogHeader>
        <RichTextView
          className="prose prose-sm max-w-none mt-4"
          html={entry.content_rich}
        />
      </DialogContent>
    </Dialog>
  );
}
