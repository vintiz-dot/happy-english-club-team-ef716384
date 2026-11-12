import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SessionGeneratorConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: "future-only" | "include-held") => void;
  month: string;
}

export const SessionGeneratorConfirm = ({
  open,
  onClose,
  onConfirm,
  month,
}: SessionGeneratorConfirmProps) => {
  const [mode, setMode] = useState<"future-only" | "include-held">("future-only");
  const { role } = useAuth();
  const isAdmin = role === "admin";

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
          <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)}>
            <div className="flex cursor-pointer items-start gap-3 rounded-hec-md border border-hec-line-strong p-4 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken has-[button[data-state=checked]]:border-hec-brass">
              <RadioGroupItem value="future-only" id="future-only" className="mt-1" />
              <div className="min-w-0 flex-1">
                <Label htmlFor="future-only" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                    <span className="text-hec-body font-semibold text-hec-ink">Future sessions only (Recommended)</span>
                  </div>
                </Label>
                <p className="mt-1 text-hec-small text-hec-ink-soft">
                  Only create/update/remove future Scheduled sessions. Past Held sessions remain unchanged.
                  Safe for payroll and tuition integrity.
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex cursor-pointer items-start gap-3 rounded-hec-md border border-hec-warn/30 p-4 transition-colors duration-hec-1 ease-hec hover:bg-hec-warn-tint has-[button[data-state=checked]]:border-hec-warn has-[button[data-state=checked]]:bg-hec-warn-tint">
                <RadioGroupItem value="include-held" id="include-held" className="mt-1" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="include-held" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-hec-warn" />
                      <span className="text-hec-body font-semibold text-hec-warn">
                        Also update past Held (Admin only)
                      </span>
                    </div>
                  </Label>
                  <p className="mt-1 text-hec-small text-hec-ink">
                    Allows time edits on past Held sessions for exact-date matches. Status stays Held.
                    ⚠️ Warning: Affects retroactive payroll and tuition calculations.
                  </p>
                </div>
              </div>
            )}
          </RadioGroup>

          {mode === "include-held" && (
            <div className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4" role="alert">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-hec-warn" />
              <div className="min-w-0 text-hec-small text-hec-ink">
                <p className="font-semibold text-hec-warn">Caution: Retroactive Changes</p>
                <p className="mt-1">
                  This will allow time edits on already-held sessions, which may affect historical
                  payroll and tuition records. Use only when correcting data entry errors.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(mode)}>
            Generate Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
