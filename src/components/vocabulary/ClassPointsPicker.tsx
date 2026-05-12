import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

/**
 * ClassPointsPicker — shown when a student is enrolled in multiple classes
 * and we need them to choose which class earns the vocabulary points.
 */
export function ClassPointsPicker({ open, classes, onChoose, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Which class earns the points?</DialogTitle>
          <DialogDescription>
            You're in multiple classes. Pick which one should get credit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 mt-2">
          {classes.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              className="justify-start"
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

export default ClassPointsPicker;
