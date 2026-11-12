/**
 * ClassPointsPicker — modal shown when a student is enrolled in multiple
 * classes and we need to know which class's leaderboard receives the
 * points for this action (save / practice / etc).
 *
 * Controlled component: parent owns `open` and the list of classes. On
 * choice, fires `onChoose(classId)`. On cancel, fires `onClose()`.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  classes: ClassOption[];
  onChoose: (classId: string) => void;
  onClose: () => void;
}

export function ClassPointsPicker({ open, classes, onChoose, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 shrink-0 text-hec-brass" aria-hidden="true" />
            Which class earns the points?
          </DialogTitle>
          <DialogDescription>
            You're in more than one class. Pick which class leaderboard should get your points for this word.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {classes.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              className="h-auto min-h-hec-target justify-start whitespace-normal break-words hyphens-none py-3 text-left text-hec-body font-semibold"
              onClick={() => onChoose(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
