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
      <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-[hsl(240_8%_10%)] border-slate-200 dark:border-[hsl(240_8%_18%)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
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
              className="justify-start h-12 text-base font-semibold rounded-xl border-slate-200 dark:border-[hsl(240_8%_18%)] bg-transparent hover:bg-slate-50 dark:hover:bg-[hsl(240_8%_14%)] transition-all duration-200"
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
