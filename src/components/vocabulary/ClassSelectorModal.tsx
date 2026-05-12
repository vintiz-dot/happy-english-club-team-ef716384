/**
 * ClassSelectorModal
 * ===================
 * Forces the student to choose their school class on first visit to the
 * Vocabulary page. The selection maps to a CEFR level that downstream
 * components (WordExplorer → word-enrichment) use to tune AI output.
 *
 * Open/close logic:
 *   - On mount, query profiles.school_class. If null, open the modal.
 *   - On submit, upsert profiles { school_class, cefr_level } and fire
 *     onSelected(cefr).
 *   - Parent can also pass `forceOpen` to re-open it (for "edit my class").
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  type CefrLevel,
  getSchoolClass,
  saveSchoolClass,
} from "@/lib/cefr";

interface GradeOption {
  value: string;
  label: string;
  cefr: CefrLevel;
}

// English-only K-12 grade list. Mapping extends the spec's K-9+ ladder
// (K-2 → A1, 3-5 → A2, 6-9 → B1) up through 12 (10-11 → B2, 12 → C1).
const GRADE_OPTIONS: GradeOption[] = [
  { value: "Kindergarten", label: "Kindergarten", cefr: "A1" },
  { value: "Grade 1",      label: "Grade 1",      cefr: "A1" },
  { value: "Grade 2",      label: "Grade 2",      cefr: "A1" },
  { value: "Grade 3",      label: "Grade 3",      cefr: "A2" },
  { value: "Grade 4",      label: "Grade 4",      cefr: "A2" },
  { value: "Grade 5",      label: "Grade 5",      cefr: "A2" },
  { value: "Grade 6",      label: "Grade 6",      cefr: "B1" },
  { value: "Grade 7",      label: "Grade 7",      cefr: "B1" },
  { value: "Grade 8",      label: "Grade 8",      cefr: "B1" },
  { value: "Grade 9",      label: "Grade 9",      cefr: "B1" },
  { value: "Grade 10",     label: "Grade 10",     cefr: "B2" },
  { value: "Grade 11",     label: "Grade 11",     cefr: "B2" },
  { value: "Grade 12",     label: "Grade 12",     cefr: "C1" },
];

interface Props {
  userId: string | undefined;
  /** Force the modal open even if school_class is already set (for "Edit my class"). */
  forceOpen?: boolean;
  onForceOpenChange?: (open: boolean) => void;
  onSelected?: (cefr: CefrLevel) => void;
}

export function ClassSelectorModal({ userId, forceOpen, onForceOpenChange, onSelected }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [selectedValue, setSelectedValue] = useState<string>("");

  // On mount: open the modal if no class is set.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!userId) { setChecking(false); return; }
      const cls = await getSchoolClass(supabase, userId);
      if (cancelled) return;
      setChecking(false);
      if (!cls) setOpen(true);
    }
    check();
    return () => { cancelled = true; };
  }, [userId]);

  // Allow parent to force the modal open.
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const handleSubmit = async () => {
    if (!userId || !selectedValue) return;
    const opt = GRADE_OPTIONS.find((g) => g.value === selectedValue);
    if (!opt) return;
    setLoading(true);
    try {
      await saveSchoolClass(supabase, userId, opt.value, opt.cefr);
      toast({
        title: "Got it!",
        description: `Set to ${opt.label} (${opt.cefr}). Words will be tuned to your level.`,
      });
      setOpen(false);
      onForceOpenChange?.(false);
      onSelected?.(opt.cefr);
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything while we're still figuring out whether to open.
  if (checking && !forceOpen) return null;

  return (
    <Dialog
      open={open}
      // Block closing the modal without a selection on first visit.
      // If forceOpen was set, the parent owns close.
      onOpenChange={(next) => {
        if (!next && !selectedValue && !forceOpen) return;
        setOpen(next);
        if (!next) onForceOpenChange?.(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            What class are you in?
          </DialogTitle>
          <DialogDescription>
            Pick your grade so we can show words at the right level for you.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedValue}
          onValueChange={setSelectedValue}
          className="grid grid-cols-2 gap-2 py-2 max-h-[50vh] overflow-y-auto"
        >
          {GRADE_OPTIONS.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`grade-${opt.value}`}
              className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/30 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-950/30"
            >
              <RadioGroupItem id={`grade-${opt.value}`} value={opt.value} />
              <div className="flex-1">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground">CEFR {opt.cefr}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <Button
          onClick={handleSubmit}
          disabled={!selectedValue || loading}
          className="w-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
