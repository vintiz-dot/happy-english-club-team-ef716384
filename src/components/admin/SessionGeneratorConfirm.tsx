import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface SessionGeneratorConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: "future-only") => void;
  month: string;
}

/**
 * D4 step 3A: "Also update past Held" is retired. A held lesson's time is
 * pay, so the database refuses it from the rebuild (G-5); a wrong time on a
 * held lesson is corrected one lesson at a time from its Actions menu, with a
 * reason. The rebuild only ever keeps future Scheduled lessons in step with
 * the timetable.
 */
export const SessionGeneratorConfirm = ({
  open,
  onClose,
  onConfirm,
  month,
}: SessionGeneratorConfirmProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Sessions for {month}</DialogTitle>
          <DialogDescription>
            Choose how to apply schedule template changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex cursor-pointer items-start gap-3 rounded-hec-md border border-hec-line-strong p-4 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken has-[button[data-state=checked]]:border-hec-brass">
            <div className="min-w-0 flex-1">
              <Label className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                  <span className="text-hec-body font-semibold text-hec-ink">Future sessions only</span>
                </div>
              </Label>
              <p className="mt-1 text-hec-small text-hec-ink-soft">
                Only create/update/remove future Scheduled sessions. Past Held sessions remain unchanged.
                Safe for payroll and tuition integrity. To correct the time of a lesson that was already
                held, open that lesson and change it from its Actions menu, with a reason.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm("future-only")}>
            Generate Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
