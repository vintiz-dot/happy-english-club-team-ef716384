import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Sparkles, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl, getRandomAvatarUrl } from "@/lib/avatars";
import { ScrollArea } from "@/components/ui/scroll-area";
import { awardPoints } from "@/lib/pointsHelper";
import { SKILL_CONFIG, BEHAVIOR_CONFIG, CORRECTION_CONFIG } from "@/lib/skillConfig";
import { soundManager } from "@/lib/soundManager";
import { ReadingTheoryScoreEntry } from "./ReadingTheoryScoreEntry";
import { useIvory } from "@/hooks/useIvory";

// Ivory class strings (DS s.15): label above field, a 44 px choice that shows its selection with a brass edge.
const LABEL_IVORY = "text-hec-small font-semibold text-hec-ink";
const CHOICE_IVORY =
  "min-h-hec-target p-3 rounded-hec-md border transition-colors duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
const CHOICE_ON_IVORY = "border-hec-brass bg-hec-sunken";
const CHOICE_OFF_IVORY = "border-hec-line-strong bg-hec-raised hover:bg-hec-sunken";

interface SelectedStudent {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface BulkPointsDialogProps {
  classId: string;
  selectedStudents: SelectedStudent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type CategoryType = "skill" | "behavior" | "homework" | "correction" | "reading_theory";

export function BulkPointsDialog({
  classId,
  selectedStudents,
  open,
  onOpenChange,
  onSuccess,
}: BulkPointsDialogProps) {
  const [category, setCategory] = useState<CategoryType>("skill");
  const [readingTheoryOpen, setReadingTheoryOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSubTag, setSelectedSubTag] = useState("");
  const [selectedHomework, setSelectedHomework] = useState("");
  const [selectedCorrection, setSelectedCorrection] = useState("");
  const [points, setPoints] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const ivory = useIvory();

  // Fetch active homework for the class
  const { data: homeworks, isLoading: homeworksLoading } = useQuery({
    queryKey: ["class-homeworks", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homeworks")
        .select("id, title, due_date")
        .eq("class_id", classId)
        .order("due_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open && category === "homework",
  });

  // Get current skill/behavior config
  const skillConfig = selectedSkill 
    ? (SKILL_CONFIG[selectedSkill] || BEHAVIOR_CONFIG[selectedSkill]) 
    : null;

  const addPointsMutation = useMutation({
    mutationFn: async () => {
      const pointsValue = parseInt(points);
      if (!points) {
        throw new Error("Please enter points");
      }

      if (!Number.isFinite(pointsValue)) {
        throw new Error("Points must be a valid number");
      }

      if (category === "skill" || category === "behavior") {
        if (!selectedSkill) throw new Error("Please select a skill or behavior");
      }

      if (category === "homework" && !selectedHomework) {
        throw new Error("Please select a homework assignment");
      }

      if (category === "correction" && !selectedCorrection) {
        throw new Error("Please select a correction reason");
      }

      if (selectedStudents.length === 0) {
        throw new Error("No students selected");
      }

      // Determine skill key
      let skill: string;
      let subTag: string | undefined;
      let homeworkId: string | undefined;
      let homeworkTitle: string | undefined;

      if (category === "skill" || category === "behavior") {
        skill = selectedSkill;
        subTag = selectedSubTag || undefined;
      } else if (category === "homework") {
        skill = "homework";
        homeworkId = selectedHomework;
        homeworkTitle = homeworks?.find(hw => hw.id === selectedHomework)?.title;
      } else {
        skill = "correction";
        subTag = selectedCorrection;
      }

      await awardPoints({
        studentIds: selectedStudents.map(s => s.id),
        classId,
        skill,
        points: pointsValue,
        subTag,
        homeworkId,
        homeworkTitle,
        notes: notes || undefined,
      });

      return pointsValue;
    },
    onSuccess: (pointsValue) => {
      queryClient.invalidateQueries({ queryKey: ["class-board", classId] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      queryClient.invalidateQueries({ queryKey: ["student-points"] });
      queryClient.invalidateQueries({ queryKey: ["point-history"] });
      queryClient.invalidateQueries({ queryKey: ["point-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["available-months"] });
      queryClient.invalidateQueries({ queryKey: ["live-assessment-students"] });
      
      soundManager.play(pointsValue > 0 ? "success" : "error", { classroom: true });
      
      toast.success(
        `${pointsValue > 0 ? "Added" : "Deducted"} ${Math.abs(pointsValue)} points to ${selectedStudents.length} students`,
        {
          description: "Leaderboard updated in real-time",
          icon: <Sparkles className="h-4 w-4" />,
        }
      );
      
      // Reset form
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Failed to add points", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setCategory("skill");
    setSelectedSkill("");
    setSelectedSubTag("");
    setSelectedHomework("");
    setSelectedCorrection("");
    setPoints("");
    setNotes("");
  };

  const handleSubmit = () => {
    addPointsMutation.mutate();
  };

  const setPointsQuick = (value: number) => {
    setPoints(value.toString());
  };

  // When category changes, reset related selections
  const handleCategoryChange = (newCategory: CategoryType) => {
    // If reading theory, open the score entry dialog instead
    if (newCategory === "reading_theory") {
      setReadingTheoryOpen(true);
      return;
    }
    setCategory(newCategory);
    setSelectedSkill("");
    setSelectedSubTag("");
    setSelectedHomework("");
    setSelectedCorrection("");
    if (newCategory === "correction") {
      setPoints("-1");
    } else if (points === "-1") {
      setPoints("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className={ivory ? "h-5 w-5 shrink-0 text-hec-ink-soft" : "h-5 w-5 text-primary"} />
            Add Points to {selectedStudents.length} Students
          </DialogTitle>
          <DialogDescription>
            Award or deduct points for the selected students. Changes are reflected immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Students Preview */}
          <div className="space-y-2">
            <Label className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
              Selected Students ({selectedStudents.length})
            </Label>
            <ScrollArea className={ivory ? "h-32 rounded-hec-md border border-hec-line p-3 bg-hec-sunken" : "h-24 rounded-lg border p-3 bg-muted/50"}>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <div
                    key={student.id}
                    className={ivory ? "flex min-w-0 items-center gap-2 rounded-full border border-hec-line bg-hec-surface px-3 py-1" : "flex items-center gap-2 bg-background rounded-full px-3 py-1.5 border shadow-sm"}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={getAvatarUrl(student.avatarUrl) || getRandomAvatarUrl(student.id)}
                        alt={student.name}
                      />
                      <AvatarFallback className="text-[10px]">
                        {student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={ivory ? "min-w-0 break-words hyphens-none text-hec-small font-medium text-hec-ink" : "text-sm font-medium"}>{student.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className={ivory ? LABEL_IVORY : "text-base font-semibold"}>Category *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: "skill", label: "Skill", desc: "Speaking, Listening, etc." },
                { key: "behavior", label: "Behavior", desc: "Focus, Teamwork" },
                { key: "reading_theory", label: "Reading Theory", desc: "Vocabulary, Grammar" },
                { key: "homework", label: "Homework", desc: "Assignment points" },
                { key: "correction", label: "Correction", desc: "Deduct points" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryChange(cat.key as CategoryType)}
                  aria-pressed={ivory ? category === cat.key : undefined}
                  className={ivory
                    ? `${CHOICE_IVORY} text-left ${category === cat.key ? CHOICE_ON_IVORY : CHOICE_OFF_IVORY}`
                    : `p-3 rounded-lg border text-left transition-all ${
                    category === cat.key
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <div className={ivory ? "text-hec-small font-semibold text-hec-ink" : "font-medium text-sm"}>{cat.label}</div>
                  <div className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground"}>{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Skill/Behavior Selection */}
          {(category === "skill" || category === "behavior") && (
            <div className="space-y-2">
              <Label className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
                {category === "skill" ? "Skill" : "Behavior"} *
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(category === "skill" ? SKILL_CONFIG : BEHAVIOR_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedSkill(key);
                        setSelectedSubTag("");
                      }}
                      aria-pressed={ivory ? selectedSkill === key : undefined}
                      className={ivory
                        ? `${CHOICE_IVORY} flex flex-col items-center gap-2 ${selectedSkill === key ? CHOICE_ON_IVORY : CHOICE_OFF_IVORY}`
                        : `flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        selectedSkill === key
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <Icon className={ivory ? "h-5 w-5 text-hec-ink-soft" : "h-5 w-5"} />
                      <span className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-sm font-medium"}>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tag Selection */}
          {skillConfig && skillConfig.subTags.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor={ivory ? "points-reason" : undefined} className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
                Reason (optional)
              </Label>
              <Select value={selectedSubTag} onValueChange={setSelectedSubTag}>
                <SelectTrigger id={ivory ? "points-reason" : undefined} className="h-12">
                  <SelectValue placeholder="Select specific reason" />
                </SelectTrigger>
                <SelectContent>
                  {skillConfig.subTags.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Homework Selection */}
          {category === "homework" && (
            <div className="space-y-2">
              <Label htmlFor="bulk-hw" className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
                Homework Assignment *
              </Label>
              <Select value={selectedHomework} onValueChange={setSelectedHomework}>
                <SelectTrigger id="bulk-hw" className="h-12">
                  <SelectValue placeholder="Select homework" />
                </SelectTrigger>
                <SelectContent>
                  {homeworksLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : homeworks && homeworks.length > 0 ? (
                    homeworks.map((hw: any) => (
                      <SelectItem key={hw.id} value={hw.id}>
                        {hw.title} {hw.due_date && `(Due: ${new Date(hw.due_date).toLocaleDateString()})`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className={ivory ? "p-4 text-center text-hec-small text-hec-ink-soft" : "p-4 text-center text-sm text-muted-foreground"}>
                      No homework assignments found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Correction Reason */}
          {category === "correction" && (
            <div className="space-y-2">
              <Label htmlFor={ivory ? "points-correction" : undefined} className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
                Correction Reason *
              </Label>
              <Select value={selectedCorrection} onValueChange={setSelectedCorrection}>
                <SelectTrigger id={ivory ? "points-correction" : undefined} className="h-12">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {CORRECTION_CONFIG.subTags.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Points Amount */}
          <div className="space-y-3">
            <Label htmlFor={ivory ? "points-amount" : undefined} className={ivory ? LABEL_IVORY : "text-base font-semibold"}>Points Amount *</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(-10)}
                className={ivory ? "h-14 flex flex-col gap-1" : "h-14 flex flex-col"}
              >
                <Minus className={ivory ? "h-4 w-4 text-hec-danger" : "h-4 w-4 text-destructive"} />
                <span className={ivory ? "text-hec-small font-semibold tabular-nums" : "text-xs mt-1"}>-10</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(-1)}
                className={ivory ? "h-14 flex flex-col gap-1" : "h-14 flex flex-col"}
              >
                <Minus className={ivory ? "h-4 w-4 text-hec-danger" : "h-4 w-4 text-destructive"} />
                <span className={ivory ? "text-hec-small font-semibold tabular-nums" : "text-xs mt-1"}>-1</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(1)}
                className={ivory ? "h-14 flex flex-col gap-1" : "h-14 flex flex-col"}
              >
                <Plus className={ivory ? "h-4 w-4 text-hec-leaf" : "h-4 w-4 text-green-600"} />
                <span className={ivory ? "text-hec-small font-semibold tabular-nums" : "text-xs mt-1"}>+1</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(10)}
                className={ivory ? "h-14 flex flex-col gap-1" : "h-14 flex flex-col"}
              >
                <Plus className={ivory ? "h-4 w-4 text-hec-leaf" : "h-4 w-4 text-green-600"} />
                <span className={ivory ? "text-hec-small font-semibold tabular-nums" : "text-xs mt-1"}>+10</span>
              </Button>
            </div>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Or enter custom amount"
              id={ivory ? "points-amount" : undefined}
              className={ivory ? "h-12 text-center text-hec-h3 font-semibold tabular-nums" : "h-12 text-center text-lg font-semibold"}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="bulk-notes" className={ivory ? LABEL_IVORY : "text-base font-semibold"}>
              Additional Notes
            </Label>
            <Textarea
              id="bulk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Add extra context for the points"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={addPointsMutation.isPending}
            size="lg"
            className="w-full h-12 text-base"
          >
            {addPointsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Add Points to {selectedStudents.length} Students
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Reading Theory Score Entry Dialog */}
      <ReadingTheoryScoreEntry
        classId={classId}
        open={readingTheoryOpen}
        onOpenChange={setReadingTheoryOpen}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
